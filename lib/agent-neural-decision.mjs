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

// Count a sensitive operation only when the verb is syntactically used as an
// instruction/action (imperative or following an auxiliary/infinitive). This
// avoids treating nouns such as "production deployment" or "billing changes"
// as requests to mutate those systems.
const HIGH_RISK_ACTION = /(?:^|[.!?;,]\s*|\b(?:please|must|will|should|shall|can|could|may|do\s+not|don't|must\s+not|should\s+not)\s+|\b(?:the|a|an)?\s*(?:plan|agent|worker|system|user|we|i|they|it)\s+|\b(?:credentials?|secrets?|billing|payouts?|auth(?:entication|orization)?|production)\s+(?=(?:is|are|was|were)\s+))(?:(?:is|are|was|were|be|been|being|has|have|had|must|should|will|needs?\s+to)\s+)*(?:deploy(?:s|ed|ing)?|chang(?:e|es|ed|ing)|modif(?:y|ies|ied|ying)|updat(?:e|es|ed|ing)|rotat(?:e|s|ed|ing)?|publish(?:es|ed|ing)?|releas(?:e|es|ed|ing)|migrat(?:e|es|ed|ing)|delet(?:e|s|ed|ing)|grant(?:s|ed|ing)?|revok(?:e|es|ed|ing)|configur(?:e|es|ed|ing)|enabl(?:e|s|ed|ing)|disabl(?:e|s|ed|ing)|expos(?:e|es|ed|ing)|transfer(?:s|red|ring)?|process(?:es|ed|ing)?|writ(?:e|es|ing|ten)|wrote|creat(?:e|es|ed|ing)|set(?:s|ting)?|appl(?:y|ies|ied|ying)|execut(?:e|es|ed|ing))\b/i;

function hasPositiveHighRiskIntent(value) {
  // Sensitive-domain mentions in verification, monitoring, documentation, or
  // mocked reconciliation are not themselves risky operations. Require an
  // explicit mutating/action verb in the same clause. Sensitive target paths
  // remain independently fail-closed below.
  const clauses = String(value ?? "").split(/(?:[.!?;,\n]+|\b(?:but|however|except|although|whereas)\b|\band\s+(?=(?:deploy(?:ment|ing)?|change|modify|update|rotate|publish|release|migrate|delete|grant|revoke|configure|enable|disable|expose|transfer|process|writ(?:e|es|ing|ten)|wrote|creat(?:e|es|ed|ing)|set(?:s|ting)?|appl(?:y|ies|ied|ying)|execut(?:e|es|ed|ing))\b))/i);
  for (const rawClause of clauses) {
    const clause = rawClause.trim();
    // Explicit absence of a prohibition is positive authorization intent even
    // when the sensitive operation is expressed as a noun phrase.
    if (DOUBLE_NEGATION.test(clause) && HIGH_RISK_PATH.test(clause)) return true;
    if (!HIGH_RISK_ACTION.test(clause)) continue;
    const terms = new RegExp(HIGH_RISK_PATH.source, "gi");
    for (const match of clause.matchAll(terms)) {
      const start = match.index ?? 0;
      const prefix = clause.slice(Math.max(0, start - 100), start).replace(/[^A-Za-z0-9'-]+/g, " ");
      const suffix = clause.slice(start + match[0].length);
      if (DOUBLE_NEGATION.test(prefix) || DOUBLE_NEGATION.test(suffix) ||
          (!NEGATED_BEFORE.test(prefix) && !NEGATED_AFTER.test(suffix))) return true;
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
