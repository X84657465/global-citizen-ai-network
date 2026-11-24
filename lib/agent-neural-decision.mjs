/**
 * Deterministic neuro-symbolic decision layer for the local agent factory.
 * Ollama proposes a plan; this module independently scores scope, structure,
 * dependencies and risk. It never grants execution or publication rights.
 */
const MAX_PATHS = 20;
const HIGH_RISK_PATH = /(?<![a-z0-9])(?:deploy(?:ment|ing)?s?|production|billing|payouts?|secrets?|credentials?|auth(?:entication|orization)?|migrations?)(?![a-z0-9])/i;
const NEGATED_BEFORE = /\b(?:do\s+not|don't|never|must\s+not|cannot|can't|should\s+not|not(?!\s+only\b)|no|without|exclude(?:d|s|ing)?|prohibit(?:ed|s)?|forbid(?:den|s)?|avoid|prevent)\b(?:\s+[a-z0-9'-]+){0,8}\s*$/i;
const NEGATED_AFTER = /^\s*(?:(?:(?:is|are|was|were|must|should|remain|remains|stays?)\s+)*(?:excluded|out\s+of\s+scope|untouched|unchanged|prohibited|forbidden|not\s+in\s+scope)|(?:is|are|was|were|must\s+be|should\s+be)\s+not\s+[a-z]{2,}ed|(?:must|should)\s+not\s+(?:be\s+[a-z]{2,}ed|change|modify|touch|alter|update|rotate|deploy)|(?<bare>not\s+(?:changed|modified|touched|altered|updated|rotated|deployed)))\b/i;
const DOUBLE_NEGATION = /\b(?:no\s+(?:reason|need)\s+not\s+to|no\s+(?:restriction|prohibition|ban)\s+(?:on|against)|without\s+(?:any\s+)?(?:restriction|prohibition|ban)\s+(?:on|against)|not\s+(?:prohibited|forbidden|excluded|out\s+of\s+scope|prevented|restricted|banned|disallowed)|cannot\s+not|can't\s+not)\b/i;

function hasPositiveHighRiskIntent(value) {
  const clauses = String(value ?? "").split(/(?:[.!?;,\n]+|\b(?:but|however|except|although|whereas)\b)/i);
  for (const clause of clauses) {
    let clauseStart = 0;
    let predicateEnd = 0;
    const terms = new RegExp(HIGH_RISK_PATH.source, "gi");
    for (const match of clause.matchAll(terms)) {
      const start = match.index ?? 0;
      // A conjunction after a prohibited predicate starts a fresh action.
      if (predicateEnd && start >= predicateEnd) {
        const conjunction = /\band\b/i.exec(clause.slice(predicateEnd, start));
        if (conjunction) {
          clauseStart = predicateEnd + conjunction.index + conjunction[0].length;
          predicateEnd = 0;
        }
      }
      const prefix = clause.slice(Math.max(clauseStart, start - 100), start).replace(/[^A-Za-z0-9'-]+/g, " ");
      const suffix = clause.slice(start + match[0].length);
      const negatedAfter = NEGATED_AFTER.exec(suffix);
      // A bare passive is a standalone constraint, not a qualifier on an action.
      const prohibitsAfter = negatedAfter && (!negatedAfter.groups.bare || !clause.slice(clauseStart, start).trim());
      if (DOUBLE_NEGATION.test(prefix) || DOUBLE_NEGATION.test(suffix) ||
          (!NEGATED_BEFORE.test(prefix) && !prohibitsAfter)) return true;
      if (prohibitsAfter) predicateEnd = start + match[0].length + negatedAfter[0].length;
    }
  }
  return false;
}

export function evaluateAgentDecision(plan, task) {
  if (!plan || !Array.isArray(plan.tasks) || !task || !Array.isArray(task.allowed_paths)) {
    throw new TypeError("A validated plan and source task are required.");
  }
  const approved = new Set(task.allowed_paths.map((path) => path.toLowerCase()));
  const tasks = plan.tasks;
  const implementers = tasks.filter((item) => item.role === "implementer" && item.action === "propose_patch");
  const testers = tasks.filter((item) => item.role === "tester" && item.action === "validate_patch");
  const usedPaths = [...new Set(tasks.flatMap((item) => item.allowed_paths ?? []))];
  const outOfScope = usedPaths.filter((path) => !approved.has(path.toLowerCase()));

  // Risk classification must include file paths, not just model-authored prose:
  // a harmless-sounding task title must not disguise a sensitive target file.
  const pathRisk = [...task.allowed_paths, ...usedPaths].some((path) => HIGH_RISK_PATH.test(path));
  const textRisk = tasks.some((item) =>
    [item.title, ...(item.acceptance_criteria ?? [])].some(hasPositiveHighRiskIntent),
  );
  const highRisk = pathRisk || textRisk;
  const dependencyCount = tasks.reduce((sum, item) => sum + (item.depends_on?.length ?? 0), 0);
  const boundedOutputs = tasks.every((item) => Number.isInteger(item.max_output_bytes) && item.max_output_bytes > 0 && item.max_output_bytes <= 65536);
  const signals = {
    schema_validated: plan.execution_mode === "validated_plan_only" && plan.ai_execution_enabled === false,
    scope_bounded: outOfScope.length === 0 && usedPaths.length <= MAX_PATHS,
    implementation_present: approved.size === 0 || implementers.length >= 1,
    verification_present: approved.size === 0 || testers.length >= 1,
    output_bounded: boundedOutputs,
    no_high_risk_scope: !highRisk,
    dependency_graph_bounded: dependencyCount <= tasks.length * 4,
  };
  const passed = Object.values(signals).filter(Boolean).length;
  const blockers = Object.entries(signals).filter(([, ok]) => !ok).map(([name]) => name);
  return {
    schema_version: 1,
    engine: "deterministic-neuro-symbolic-v1",
    decision: blockers.length === 0 ? "approve_for_sandbox_validation" : "reject_and_replan",
    confidence_score: Math.round((passed / Object.keys(signals).length) * 100),
    signals, blockers,
    evidence: { task_count: tasks.length, approved_path_count: approved.size, proposed_path_count: usedPaths.length, implementer_count: implementers.length, tester_count: testers.length, high_risk_scope_detected: highRisk, dependency_count: dependencyCount },
    authority: { may_execute_code: false, may_publish_changes: false, may_merge_or_deploy: false, requires_independent_sandbox_validation: true },
  };
}
