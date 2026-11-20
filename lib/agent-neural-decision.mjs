/**
 * Deterministic neuro-symbolic decision layer for the local agent factory.
 * Ollama proposes a plan; this module independently scores scope, structure,
 * dependencies and risk. It never grants execution or publication rights.
 */
const MAX_PATHS = 20;
const HIGH_RISK_TERMS = /deploy|production|billing|payout|secret|credential|auth|migration/i;

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
  const riskSurface = [
    ...task.allowed_paths,
    ...usedPaths,
    ...tasks.flatMap((item) => [item.title, ...(item.acceptance_criteria ?? [])]),
  ].join(" ");
  const highRisk = HIGH_RISK_TERMS.test(riskSurface);
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
