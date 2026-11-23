/**
 * Deterministic neuro-symbolic decision layer for the local agent factory.
 * Ollama proposes a plan; this module independently scores scope, structure,
 * dependencies and risk. It never grants execution or publication rights.
 */
const MAX_PATHS = 20;
const HIGH_RISK_PATH = /\b(?:deploy(?:ment|ing)?s?|production|billing|payouts?|secrets?|credentials?|auth(?:entication|orization)?|migrations?)\b/i;
const NEGATED_BEFORE = /\b(?:do\s+not|don't|never|must\s+not|cannot|can't|should\s+not|not(?!\s+only\b)|no|without|exclude(?:d|s|ing)?|prohibit(?:ed|s)?|forbid(?:den|s)?|avoid|prevent)\b(?:\s+[a-z0-9'-]+){0,8}\s*$/i;
const NEGATED_AFTER = /^\s*(?:(?:is|are|was|were|must|should|remain|remains|stays?)\s+)*(?:not|excluded|out\s+of\s+scope|untouched|unchanged|prohibited|forbidden)\b/i;
const DOUBLE_NEGATION = /\b(?:no\s+(?:reason|need)\s+not\s+to|no\s+(?:restriction|prohibition|ban)\s+(?:on|against)|without\s+(?:any\s+)?(?:restriction|prohibition|ban)\s+(?:on|against)|not\s+(?:prohibited|forbidden|excluded|out\s+of\s+scope|prevented|restricted|banned|disallowed)|cannot\s+not|can't\s+not|(?:do\s+not|don't|never)\s+(?:block|prevent|disallow|ban|reject|forbid|prohibit|restrict))\b/i;
const NEGATION_SCOPE_BREAK = /\b(?:then|afterwards|afterward|subsequently|separately|next)\b/i;
// Risk nouns alone are not proof of an operation: "verify production audit
// outcomes" is observational. Require an operation cue attached to the target.
const ACTIONABLE_OPERATION = /\b(?:deploy(?:ing|ed|s)?|releas(?:e|es|ed|ing)|publish(?:es|ed|ing)?|migrat(?:e|es|ed|ing)|modif(?:y|ies|ied|ying)|chang(?:e|es|ed|ing)|updat(?:e|es|ed|ing)|alter(?:s|ed|ing)?|rotat(?:e|es|ed|ing)|reset(?:s|ting)?|revok(?:e|es|ed|ing)|grant(?:s|ed|ing)?|expos(?:e|es|ed|ing)|delet(?:e|es|ed|ing)|drop(?:s|ped|ping)?|writ(?:e|es|ing|ten)|overwrit(?:e|es|ing|ten)|configur(?:e|es|ed|ing)|enabl(?:e|es|ed|ing)|disabl(?:e|es|ed|ing)|transfer(?:s|red|ring)?|charg(?:e|es|ed|ing)|execut(?:e|es|ed|ing))\b/i;

function hasActionableOperationForTarget(clause, start, end) {
  const before = clause.slice(Math.max(0, start - 100), start);
  const after = clause.slice(end, end + 100);
  // Object + destination syntax is accepted only when the operation is the
  // clause's imperative head, avoiding noun phrases such as 'change log'.
  const imperativeOperationWithObjectBeforeTarget = new RegExp(
    "(?:^|\\b(?:please|must|should|will|can|now|then|we\\s+should|you\\s+should|can\\s+you|could\\s+you|would\\s+you)(?:\\s+please)?\\s+)" + ACTIONABLE_OPERATION.source +
      "\\s+(?:(?:the|a|an|[a-z][a-z0-9_-]*)\\s+){1,4}(?:to|into|onto|for)\\s+(?:(?:the|a|an)\\s+)?$",
    "i",
  ).test(before);
  // Keep 'run' narrow: it is an operation cue only in explicit production
  // migration/deployment imperative constructions.
  const productionMigrationCommand = /^\s*(?:(?:can|could|would)\s+you\s+(?:please\s+)?)?(?:please\s+)?(?:perform|run)\s+(?:(?:the|a|an)\s+)?(?:production\s+migration|migration\s+to\s+production|production\s+deployment|deployment\s+to\s+production)\b/i.test(clause);
  const operationBeforeTarget = new RegExp(
    "(?:^\\s*|\\b(?:please|must|should|will|can|could|would|now|then|and|subsequently|afterwards|afterward|separately|next|no\\s*,|no\\s+(?:reason|need)\\s+not\\s+to|no\\s+(?:prohibition|restriction|ban)\\s+(?:on|against)|without\\s+(?:any\\s+)?(?:restriction|prohibition|ban)\\s+(?:on|against)|do\\s+not|don't|never|cannot|can't|should\\s+not|must\\s+not|we\\s+should|you\\s+should|can\\s+you|could\\s+you|would\\s+you)(?:\\s+please)?\\s+)" +
      ACTIONABLE_OPERATION.source +
      "\\s+(?:(?:to|into|onto|for|the|a|an|current|new|existing|old|legacy|all)\\s+){0,3}$",
    "i",
  ).test(before);
  const passiveOperationAfterTarget = new RegExp(
    "^\\s+(?:(?:is|are|was|were|has|have|had|being|been|not|prohibited|prevented|from|allowed|disallowed)\\s+){1,7}" + ACTIONABLE_OPERATION.source + "\\b",
    "i",
  ).test(after);
  const negatedPermissionToAct = /^(?:do\s+not|don't|never)\s+(?:block|prevent|disallow|ban|reject|forbid|prohibit|restrict)\s+(?:(?:the|a|an)\s+)?(?:production\s+(?:deployment|migration)|(?:deployment|migration)\s+to\s+production)(?=$|\s+(?:or|and)\b)/i.test(clause.trim());
  const productionOperationNoun = /^(?:production\s+)?(?:deployment|migration)$/i.test(clause.trim()) || /without\s+any\s+restriction\s+on\s+production\s+deployment/i.test(clause) || negatedPermissionToAct;
  const explicitScopeReversal = DOUBLE_NEGATION.test(before + after) &&
    new RegExp("\\bso\\s+" + ACTIONABLE_OPERATION.source + "\\b", "i").test(after);
  const deniedDeploymentConstruction = /\bdeployment\s+is\s+not\s+(?:disallowed|prohibited|forbidden)\s+to\s+production\b/i.test(clause);
  return operationBeforeTarget || imperativeOperationWithObjectBeforeTarget || passiveOperationAfterTarget || productionMigrationCommand || productionOperationNoun ||
    explicitScopeReversal || deniedDeploymentConstruction;
}
function hasPositiveHighRiskIntent(value) {
  const clauses = String(value ?? "").split(/(?:[.!?;\n]+|,(?!\s*so\b)|\b(?:but|however|except|although|whereas)\b)/i);
  for (const clause of clauses) {
    const terms = new RegExp(HIGH_RISK_PATH.source, "gi");
    for (const match of clause.matchAll(terms)) {
      const start = match.index ?? 0;
      const before = clause.slice(Math.max(0, start - 100), start);
      const after = clause.slice(start + match[0].length, start + match[0].length + 100);
      // Do not associate an unrelated operation across coordinated actions.
      if (!hasActionableOperationForTarget(clause, start, start + match[0].length)) continue;

      const prefix = before.replace(/[^A-Za-z0-9'-]+/g, " ");
      const suffix = after;
      const currentScopeBefore = before.split(NEGATION_SCOPE_BREAK).pop() ?? before;
      const negationPrefix = currentScopeBefore.replace(/^\s*no\s*[,;:]\s*/i, " ").replace(/[^A-Za-z0-9'-]+/g, " ");
      const earlierNegationStillApplies = NEGATED_BEFORE.test(negationPrefix);
      if (DOUBLE_NEGATION.test(prefix) || DOUBLE_NEGATION.test(suffix) ||
          (!earlierNegationStillApplies && !NEGATED_AFTER.test(suffix))) return true;
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

  // Sensitive target paths remain independently fail-closed regardless of prose.
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
