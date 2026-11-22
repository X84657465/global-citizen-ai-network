/**
 * Deterministic neuro-symbolic decision layer for the local agent factory.
 * Ollama proposes a plan; this module independently scores scope, structure,
 * dependencies and risk. It never grants execution or publication rights.
 */
const MAX_PATHS = 20;
const HIGH_RISK_PATH = /\b(?:deploy(?:ment|ing)?s?|production|billing|payouts?|secrets?|credentials?|auth(?:entication|orization)?|migrations?)\b/i;
const NEGATED_BEFORE = /\b(?:do\s+not|don't|never|must\s+not|cannot|can't|should\s+not|not(?!\s+only\b)|no|without|exclude(?:d|s|ing)?|prohibit(?:ed|s)?|forbid(?:den|s)?|avoid|prevent)\b(?:\s+[a-z0-9'-]+){0,8}\s*$/i;
const NEGATED_AFTER = /^\s*(?:(?:is|are|was|were|must|should|remain|remains|stays?)\s+)*(?:not|excluded|out\s+of\s+scope|untouched|unchanged|prohibited|forbidden)\b/i;
const DOUBLE_NEGATION = /\b(?:no\s+(?:reason|need)\s+not\s+to|no\s+(?:restriction|prohibition|ban)\s+(?:on|against)|without\s+(?:any\s+)?(?:restriction|prohibition|ban)\s+(?:on|against)|not\s+(?:prohibited|forbidden|excluded|out\s+of\s+scope|prevented|restricted|banned|disallowed)|cannot\s+not|can't\s+not)\b/i;

const HIGH_RISK_ACTIVE_ACTION = /\b(?:deploy(?:s|ed|ing)?|release(?:s|d|ing)?|publish(?:es|ed|ing)?|modif(?:y|ies|ied|ying)|update(?:s|d|ing)?|alter(?:s|ed|ing)?|enable(?:s|d|ing)?|disable(?:s|d|ing)?|delete(?:s|d|ing)?|reset(?:s|ting)?|rotate(?:s|d|ing)?|revoke(?:s|d|ing)?|grant(?:s|ed|ing)?|migrate(?:s|d|ing)?|write(?:s|wrote|written|ing)?|expose(?:s|d|ing)?|transfer(?:s|red|ring)?|charge(?:s|d|ing)?|pay(?:s|ing)?|configure(?:s|d|ing)?|appl(?:y|ies|ied|ying)|change(?:d|ing)?|execut(?:e|es|ed|ing)|perform(?:s|ed|ing)?|initiat(?:e|es|ed|ing)|trigger(?:s|ed|ing)?|start(?:s|ed|ing)?|complet(?:e|es|ed|ing)|run(?:s|ning)?|ran|launch(?:es|ed|ing)?)\b/i;
const HIGH_RISK_PASSIVE_ACTION = /\b(?:deployed|deploying|released|releasing|published|publishing|modified|modifying|updated|updating|altered|altering|enabled|disabled|deleted|reset|rotated|revoked|granted|migrated|written|exposed|transferred|charged|paid|configured|changed)\b/i;
const HIGH_RISK_TARGET = /\b(?:production|billing|payouts?|secrets?|credentials?|auth(?:entication|orization)?|migrations?)\b/i;
const READ_ONLY_REVIEW_PREFIX = /^\s*(?:review|audit|inspect|verify|check|assess|monitor|analy[sz]e|document|summari[sz]e|report|compare|validate|confirm)\b/i;
const READ_ONLY_PLAN_REFERENCE = new RegExp(
  "^\\s*(?:review|audit|inspect|verify|check|assess|monitor|analy[sz]e|document|summari[sz]e|report|compare|validate|confirm)\\s+(?:(?:the|a|an|this|that|current|existing)\\s+)?(?:plan|proposal|checklist|evidence|report|history|design|spec(?:ification)?|runbook|procedure|documentation|outcome|results?)\\b(?:(?!\\b(?:and|then)\\b)[\\s\\S])*?" +
    HIGH_RISK_ACTIVE_ACTION.source +
    "(?:\\s+(?:the|a|an|to|into|on|for|new|existing|current|target|policy|settings|records|system|service|production|billing|payouts?|secrets?|credentials?|auth|authentication|authorization|migrations?|permissions?|access|roles?|tokens?|database|data|configuration|config|environment|changes?)){0,4}\\s*$",
  "i",
);

function hasActionableRiskRelationship(clause, start, end) {

  const prefix = clause.slice(Math.max(0, start - 72), start);
  const suffix = clause.slice(end, Math.min(clause.length, end + 72));
  // Active operation directly applied to a sensitive target. Keep the window
  // bounded; do not infer an operation from a distant mention in the same clause.
  const normalizedPrefix = prefix.replace(/[^A-Za-z0-9'-]+/g, " ");
  if (READ_ONLY_PLAN_REFERENCE.test(normalizedPrefix)) return false;
  const active = new RegExp(
    HIGH_RISK_ACTIVE_ACTION.source + "(?:\\s+(?:the|a|an|to|into|on|for|new|existing|current|target|policy|settings|records|system|service|production|billing|payouts?|secrets?|credentials?|auth|authentication|authorization|migrations?|permissions?|access|roles?|tokens?|database|data|configuration|config|environment|changes?)){0,4}\\s*$",
    "i",
  );
  if (active.test(normalizedPrefix)) return true;

  // Explicit passive mutation remains actionable, e.g. "billing was changed".
  const passive = new RegExp(
    "^\\s*(?:(?:is|are|was|were|will\\s+be|must\\s+be|should\\s+be|has\\s+been|have\\s+been)\\s+)?(?:" +
      HIGH_RISK_PASSIVE_ACTION.source +
      "|(?:deployment|migration|rotation|changes?)\\s+(?:(?:will|must|should|is|are|was|were)\\s+)?(?:be\\s+)?(?:executed|performed|initiated|triggered|started|completed|applied|made))",
    "i",
  );
  const reviewContext = clause.slice(0, end);
  const hasIndependentClause = [...reviewContext.matchAll(/\b(?:and|then)\s+([A-Za-z'-]+)/gi)].some(
    (match) => !/^(?:review|audit|inspect|verify|check|assess|monitor|analy[sz]e|document|summari[sz]e|report|compare|validate|confirm)$/i.test(match[1]),
  );
  if (READ_ONLY_REVIEW_PREFIX.test(reviewContext) && !hasIndependentClause) return false;
  if (passive.test(suffix)) return true;

  // Explicit "make changes to X" is actionable; "audit/review changes to X"
  // is only a description and is deliberately not treated as a mutation.
  if (/\bmake\s+(?:a\s+)?changes?\s+to\s*$/i.test(prefix)) return true;
  return false;
}

function hasPositiveHighRiskIntent(value) {
  const clauses = String(value ?? "").split(/(?:[.!?;,\n]+|\b(?:but|however|except|although|whereas)\b)/i);
  for (const clause of clauses) {
    const terms = new RegExp(HIGH_RISK_TARGET.source, "gi");
    for (const match of clause.matchAll(terms)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const prefix = clause.slice(Math.max(0, start - 100), start).replace(/[^A-Za-z0-9'-]+/g, " ");
      const suffix = clause.slice(end);
      const doubleNegated = DOUBLE_NEGATION.test(prefix) || DOUBLE_NEGATION.test(suffix);
      if (doubleNegated) return true;

      if (!hasActionableRiskRelationship(clause, start, end)) continue;
      if (NEGATED_BEFORE.test(prefix) || NEGATED_AFTER.test(suffix)) continue;
      return true;
    }

    // Preserve explicit absence-of-restriction semantics even when the target
    // is phrased nominally (e.g. "no restriction on production deployment").
    if (HIGH_RISK_TARGET.test(clause) && DOUBLE_NEGATION.test(clause)) return true;
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
    hasPositiveHighRiskIntent([item.title, ...(item.acceptance_criteria ?? [])].join(" ")),
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
