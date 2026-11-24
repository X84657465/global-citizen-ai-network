import { isControlPlanePath } from "./agent-write-policy.mjs";
import { extractTaskDependencyNumbers } from "./agent-task-dependencies.mjs";

export class TaskValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "TaskValidationError";
  }
}

const REQUIRED_SECTIONS = [
  "Goal",
  "Allowed paths",
  "Acceptance criteria",
  "Explicit exclusions",
];
const OPTIONAL_SECTIONS = ["Priority", "Dependencies", "Required patch paths", "Forbidden content"];
const OPTIONAL_CONTEXT_SECTIONS = new Set(["Confirmed evidence", "Finding and required behavior"]);
function isValidRetryScopeDate(name) {
  const match = /^Retry scope refinement — (\d{4})-(\d{2})-(\d{2})$/.exec(name);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}
const isOptionalContextSection = (name) =>
  OPTIONAL_CONTEXT_SECTIONS.has(name) || isValidRetryScopeDate(name);

const ALLOWED_ROOTS = new Set(["app", "components", "lib", "tests", "docs"]);
const SCHEDULER_WORKFLOW_PATH = ".github/workflows/agent-task-preflight.yml";
const SUPABASE_AUTHENTICATED_PATH = "lib/supabase/authenticated.ts";
const SUPABASE_AUTH_PATH_APPROVAL_LABEL = "factory-supabase-auth-path-approved";
const DENIED_SEGMENTS = new Set([
  ".git",
  ".github",
  "node_modules",
  "secrets",
  "secret",
  "credentials",
  "credential",
  "supabase",
]);

function reject(message) {
  throw new TaskValidationError(message);
}

function parseSections(body) {
  const sections = new Map();
  let current = null;
  let fenceCharacter = null;
  let fenceLength = 0;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(rawLine);

    if (fence) {
      if (fenceCharacter === null) {
        // CommonMark backtick fence info strings cannot contain backticks.
        // Invalid openers must not hide subsequent task section headings.
        if (fence[1][0] === "`" && fence[2].includes("`")) {
          if (current) sections.get(current).push(rawLine);
          continue;
        }
        fenceCharacter = fence[1][0];
        fenceLength = fence[1].length;
      } else if (
        fence[1][0] === fenceCharacter &&
        fence[1].length >= fenceLength &&
        fence[2].trim() === ""
      ) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      if (current) sections.get(current).push(rawLine);
      continue;
    }

    if (fenceCharacter !== null) {
      if (current) sections.get(current).push(rawLine);
      continue;
    }

    // Four-space/tab-indented Markdown code blocks are content, not headings.
    // Preserve them in the current section so normal section validation remains fail-closed.
    if (/^(?: {4}|\t)/.test(rawLine)) {
      if (current) sections.get(current).push(rawLine);
      continue;
    }

    if (fenceCharacter === null) {
      const heading = /^##\s+(.+?)\s*$/.exec(line);
      if (heading) {
        const rawName = heading[1];
        const name = /^Dependencies(?:\s*\/\s*context)?$/i.test(rawName) ? "Dependencies" : rawName;
        if (
          !REQUIRED_SECTIONS.includes(name) &&
          !OPTIONAL_SECTIONS.includes(name) &&
          !isOptionalContextSection(name)
        ) reject(`Unexpected section: ${rawName}`);
        if (sections.has(name)) reject(`Duplicate section: ${name}`);
        sections.set(name, []);
        current = name;
        continue;
      }
    }

    if (current) sections.get(current).push(rawLine);
  }

  for (const name of REQUIRED_SECTIONS) {
    if (!sections.has(name)) reject(`Required section is missing: ## ${name}`);
  }
  if ([...sections.keys()].some((name) =>
    !REQUIRED_SECTIONS.includes(name) &&
    !OPTIONAL_SECTIONS.includes(name) &&
    !isOptionalContextSection(name)
  )) reject("Task contains an unsupported section.");

  return {
    ...Object.fromEntries(
      REQUIRED_SECTIONS.map((name) => [name, sections.get(name).join("\n").trimEnd()]),
    ),
    Priority: sections.has("Priority") ? sections.get("Priority").join("\n").trimEnd() : "",
    Dependencies: sections.has("Dependencies") ? sections.get("Dependencies").join("\n").trimEnd() : "",
    RequiredPatchPaths: sections.has("Required patch paths") ? sections.get("Required patch paths").join("\n").trimEnd() : null,
    ForbiddenContent: sections.has("Forbidden content") ? sections.get("Forbidden content").join("\n").trimEnd() : null,
    AdditionalContext: Object.fromEntries(
      [...sections.entries()]
        .filter(([name]) => isOptionalContextSection(name))
        .map(([name, lines]) => [name, lines.join("\n").trimEnd()]),
    ),
  };
}

function parseBulletLines(value, label, maxItems) {
  const rawLines = value.split(/\r?\n/).filter((line) => line.trim().length > 0);
  // Indented code blocks are documentation, never executable task directives.
  // Reject them before trimming so a code example cannot become an accepted bullet.
  if (rawLines.some((line) => /^(?: {4,}|\t)/.test(line))) {
    reject(`${label} must not contain indented code-block directives.`);
  }
  const lines = rawLines.map((line) => line.trim());
  if (lines.length === 0 || lines.length > maxItems) {
    reject(`${label} must contain between 1 and ${maxItems} bullet items.`);
  }
  if (lines.some((line) => !/^[-*]\s+\S/.test(line))) {
    reject(`${label} must use bullet-list items only.`);
  }
  return lines.map((line) => line.replace(/^[-*]\s+/, ""));
}
function validateAllowedPaths(paths, controlPlaneAuthorized, supabaseAuthPathAuthorized) {
  const seen = new Set();

  for (const path of paths) {
    if (typeof path !== "string" || path.length > 240) reject("Allowed path is invalid or too long.");
    if (path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
      reject(`Absolute paths and backslashes are not allowed: ${path}`);
    }

    const segments = path.split("/");
    if (segments.length < 2 || segments.some((part) => !part || part === "." || part === "..")) {
      reject(`Path traversal or empty path segments are not allowed: ${path}`);
    }

    const [root] = segments;
    const isSchedulerWorkflowPath = path === SCHEDULER_WORKFLOW_PATH;
    const isSupabaseAuthenticatedPath = path === SUPABASE_AUTHENTICATED_PATH;
    if (!ALLOWED_ROOTS.has(root) && !isSchedulerWorkflowPath) {
      reject(`Path root is outside the write allowlist: ${path}`);
    }
    if (isControlPlanePath(path) && !controlPlaneAuthorized) {
      reject("Control-plane paths require the factory-control-plane-approved Issue label.");
    }

    for (const segment of segments) {
      const lower = segment.toLowerCase();
      if (
        (DENIED_SEGMENTS.has(lower) &&
          !(isSchedulerWorkflowPath && lower === ".github") &&
          !(isSupabaseAuthenticatedPath && supabaseAuthPathAuthorized && lower === "supabase")) ||
        lower.startsWith(".env") ||
        lower.includes("secret") ||
        lower.includes("credential") ||
        (!/^[A-Za-z0-9._-]+$/.test(segment) && !/^\[[A-Za-z][A-Za-z0-9]*\]$/.test(segment))
      ) {
        reject(`Path contains a prohibited segment: ${path}`);
      }
    }

    const normalized = path.toLowerCase();
    if (seen.has(normalized)) reject(`Duplicate allowed path: ${path}`);
    seen.add(normalized);
  }
}

export function validateAndBuildTask(issue, repository) {
  if (typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    reject("Repository name is missing or invalid.");
  }

  const [owner] = repository.split("/");
  if (!issue || typeof issue !== "object") reject("Issue response is invalid.");
  if (issue.pull_request) reject("Pull requests cannot be used as task specifications.");
  if (issue.state !== "open") reject("The task issue must be open.");
  const ownerAuthored = issue.user?.login?.toLowerCase() === owner.toLowerCase();
  const controlPlaneAuthorized = Array.isArray(issue.labels) && issue.labels.some((label) =>
    String(typeof label === "string" ? label : label?.name ?? "").toLowerCase() === "factory-control-plane-approved",
  );
  // This sensitive module requires a separate owner-only approval; the general
  // control-plane label does not grant access to Supabase paths.
  const supabaseAuthPathAuthorized = ownerAuthored && Array.isArray(issue.labels) && issue.labels.some((label) =>
    String(typeof label === "string" ? label : label?.name ?? "").toLowerCase() === SUPABASE_AUTH_PATH_APPROVAL_LABEL,
  );
  const plannerAuthored = issue.user?.login?.toLowerCase() === "github-actions[bot]" &&
    typeof issue.body === "string" && issue.body.includes("<!-- ai-task-generated-by-planner -->");
  if (!ownerAuthored && !plannerAuthored) {
    reject("Only repository-owner tasks or explicitly planner-generated tasks can enter this preflight.");
  }
  if (typeof issue.body !== "string" || issue.body.length > 20000) {
    reject("Issue body is missing or exceeds the 20,000-character limit.");
  }
  if (typeof issue.title !== "string" || issue.title.trim().length === 0 || issue.title.length > 200) {
    reject("Issue title is missing or exceeds the 200-character limit.");
  }

  const sections = parseSections(issue.body);
  const goal = sections.Goal;
  const priority = sections.Priority;
  if (priority.length > 120 || (priority && !/^P[0-3](?:\s|$)/i.test(priority))) {
    reject("Priority must be a short P0-P3 label when provided.");
  }
  if (goal.length < 20 || goal.length > 3000) {
    reject("Goal must be between 20 and 3,000 characters.");
  }

  const allowedPaths = parseBulletLines(sections["Allowed paths"], "Allowed paths", 20);
  const acceptanceCriteria = parseBulletLines(sections["Acceptance criteria"], "Acceptance criteria", 15);
  const explicitExclusions = parseBulletLines(sections["Explicit exclusions"], "Explicit exclusions", 15);
  const requiredPatchPaths = sections.RequiredPatchPaths !== null
    ? parseBulletLines(sections.RequiredPatchPaths, "Required patch paths", 20)
    : [];
  const forbiddenContent = sections.ForbiddenContent !== null
    ? parseBulletLines(sections.ForbiddenContent, "Forbidden content", 20)
    : [];
  validateAllowedPaths(allowedPaths, controlPlaneAuthorized, supabaseAuthPathAuthorized);
  validateAllowedPaths(requiredPatchPaths, controlPlaneAuthorized, supabaseAuthPathAuthorized);
  const allowedPathSet = new Set(allowedPaths.map((path) => path.toLowerCase()));
  if (requiredPatchPaths.some((path) => !allowedPathSet.has(path.toLowerCase()))) {
    reject("Every required patch path must also appear in the task allowlist.");
  }
  if (new Set(requiredPatchPaths.map((path) => path.toLowerCase())).size !== requiredPatchPaths.length) {
    reject("Required patch paths must not contain duplicates.");
  }
  if (forbiddenContent.some((value) => value.length > 200 || /[\r\n\0]/.test(value))) {
    reject("Each forbidden-content literal must be a single line of at most 200 characters.");
  }
  if (new Set(forbiddenContent.map((value) => value.toLowerCase())).size !== forbiddenContent.length) {
    reject("Forbidden content literals must not contain duplicates.");
  }

  return {
    schema_version: 1,
    mode: "preflight_only",
    ai_execution_enabled: false,
    repository,
    issue: {
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      author: issue.user.login,
    },
    goal,
    priority: priority || null,
    // Preserve normalized dependency references for audit; the queue selector remains the dispatch gate.
    dependency_issue_numbers: extractTaskDependencyNumbers(issue.body),
    allowed_paths: allowedPaths,
    control_plane_authorized: controlPlaneAuthorized,
    supabase_auth_path_authorized: supabaseAuthPathAuthorized,
    acceptance_criteria: acceptanceCriteria,
    explicit_exclusions: explicitExclusions,
    required_patch_paths: requiredPatchPaths,
    forbidden_content: forbiddenContent,
    // Preserve recognized owner-authored context without relaxing the required sections or path allowlist.
    additional_context: sections.AdditionalContext,
    safety: {
      issue_content_is_untrusted_data: true,
      repository_code_was_not_executed: true,
      files_were_not_modified: true,
      pull_request_was_not_created: true,
      production_database_or_deployment_touched: false,
      supabase_auth_path_requires_dedicated_owner_approval: true,
    },
  };
}


export function buildAgentTaskContext(task) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    reject("A validated task bundle is required to build model context.");
  }
  return {
    goal: task.goal,
    acceptance_criteria: task.acceptance_criteria,
    explicit_exclusions: task.explicit_exclusions,
    required_patch_paths: task.required_patch_paths ?? [],
    forbidden_content: task.forbidden_content ?? [],
    additional_context: task.additional_context ?? {},
  };
}
