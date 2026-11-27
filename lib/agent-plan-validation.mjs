export class AgentPlanValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AgentPlanValidationError";
  }
}

const MAX_TASKS = 12;
const MAX_TITLE_LENGTH = 120;
const MAX_ACCEPTANCE_CRITERIA = 8;
const MAX_OUTPUT_BYTES = 64 * 1024;
const ROLES = new Set(["planner", "implementer", "tester", "reviewer"]);
const ACTIONS = new Set(["inspect", "propose_patch", "validate_patch", "report"]);
const ROLE_ACTIONS = {
  planner: new Set(["inspect", "report"]),
  implementer: new Set(["inspect", "propose_patch"]),
  tester: new Set(["inspect", "validate_patch"]),
  reviewer: new Set(["inspect", "validate_patch", "report"]),
};

function reject(message) {
  throw new AgentPlanValidationError(message);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) reject(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject(`${label} contains missing or unexpected fields.`);
  }
}

function validateText(value, label, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    reject(`${label} must be a non-empty string no longer than ${maxLength} characters.`);
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) {
    reject(`${label} contains control characters.`);
  }
  return value.trim();
}

function validateTaskPaths(paths, taskPaths, label) {
  if (!Array.isArray(paths) || paths.length > taskPaths.length) {
    reject(`${label} must be an array within the approved task path limit.`);
  }
  const allowed = new Set(taskPaths.map((path) => path.toLowerCase()));
  const seen = new Set();
  for (const path of paths) {
    if (typeof path !== "string" || !allowed.has(path.toLowerCase())) {
      reject(`${label} contains a path not approved by the original task.`);
    }
    const normalized = path.toLowerCase();
    if (seen.has(normalized)) reject(`${label} contains a duplicate path.`);
    seen.add(normalized);
  }
  return [...paths];
}

export function validateAgentPlan(plan, task) {
  assertExactKeys(plan, ["schema_version", "tasks"], "Agent plan");
  if (plan.schema_version !== 1) reject("Unsupported agent plan schema version.");
  if (!task || task.schema_version !== 1 || !Array.isArray(task.allowed_paths)) {
    reject("A previously validated task with an explicit path allowlist is required.");
  }
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0 || plan.tasks.length > MAX_TASKS) {
    reject(`Agent plan must contain between 1 and ${MAX_TASKS} tasks.`);
  }

  const taskPaths = task.allowed_paths;
  const ids = new Set();
  const normalizedTasks = plan.tasks.map((item) => {
    assertExactKeys(
      item,
      ["id", "title", "role", "action", "depends_on", "allowed_paths", "acceptance_criteria", "max_output_bytes"],
      "Agent plan task",
    );

    if (typeof item.id !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(item.id)) {
      reject("Task id must be a lowercase slug between 2 and 40 characters.");
    }
    if (ids.has(item.id)) reject(`Duplicate task id: ${item.id}`);
    ids.add(item.id);

    const title = validateText(item.title, "Task title", MAX_TITLE_LENGTH);
    if (!ROLES.has(item.role)) reject("Task role is not supported.");
    if (!ACTIONS.has(item.action) || !ROLE_ACTIONS[item.role].has(item.action)) {
      reject("Task action is not permitted for the selected role.");
    }
    if (!Array.isArray(item.depends_on) || item.depends_on.length > MAX_TASKS) {
      reject("Task dependencies must be an array with at most 12 entries.");
    }
    const dependencies = item.depends_on.map((dependency) => {
      if (typeof dependency !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(dependency)) {
        reject("Task dependency id is invalid.");
      }
      return dependency;
    });
    if (new Set(dependencies).size !== dependencies.length) reject("Task contains duplicate dependencies.");

    const allowedPaths = validateTaskPaths(item.allowed_paths, taskPaths, "Task allowed_paths");
    if (item.action === "propose_patch" && allowedPaths.length === 0) {
      reject("Patch proposal tasks must name at least one task-approved path.");
    }
    if (item.action !== "propose_patch" && allowedPaths.length > 0 && item.action === "report") {
      reject("Report-only tasks cannot request file paths.");
    }

    if (!Array.isArray(item.acceptance_criteria) || item.acceptance_criteria.length === 0 ||
        item.acceptance_criteria.length > MAX_ACCEPTANCE_CRITERIA) {
      reject("Each task must contain between 1 and 8 acceptance criteria.");
    }
    const acceptanceCriteria = item.acceptance_criteria.map((criterion) =>
      validateText(criterion, "Acceptance criterion", 300),
    );

    if (!Number.isInteger(item.max_output_bytes) || item.max_output_bytes < 1 ||
        item.max_output_bytes > MAX_OUTPUT_BYTES) {
      reject("Task max_output_bytes must be an integer between 1 and 65536.");
    }
    if (item.action === "propose_patch" && item.max_output_bytes < 16 * 1024) {
      reject("Patch proposal task max_output_bytes must be an integer between 16384 and 65536.");
    }

    return {
      id: item.id,
      title,
      role: item.role,
      action: item.action,
      depends_on: dependencies,
      allowed_paths: allowedPaths,
      acceptance_criteria: acceptanceCriteria,
      max_output_bytes: item.max_output_bytes,
    };
  });

  for (const item of normalizedTasks) {
    for (const dependency of item.depends_on) {
      if (!ids.has(dependency)) reject(`Unknown task dependency: ${dependency}`);
      if (dependency === item.id) reject("A task cannot depend on itself.");
    }
  }

  // Stable topological sort: preserve input order among currently-ready tasks.
  const completed = new Set();
  const ordered = [];
  while (ordered.length < normalizedTasks.length) {
    const next = normalizedTasks.find((item) =>
      !completed.has(item.id) && item.depends_on.every((dependency) => completed.has(dependency)),
    );
    if (!next) reject("Agent plan contains a dependency cycle.");
    completed.add(next.id);
    ordered.push(next);
  }

  return {
    schema_version: 1,
    execution_mode: "validated_plan_only",
    ai_execution_enabled: false,
    tasks: ordered,
    safety: {
      source_task_path_allowlist_enforced: true,
      role_action_matrix_enforced: true,
      dependency_graph_acyclic: true,
      plan_is_data_only: true,
      no_repository_files_modified: true,
      no_commands_or_model_code_executed: true,
      no_credentials_or_secrets_provided: true,
    },
  };
}
