import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("system-health recovery invokes its Node controller without the Windows PowerShell profile wrapper", () => {
  const marker = "      - name: Verify completed CI provenance and reset global breaker";
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, "system-health recovery controller step must exist");
  const next = workflow.indexOf("\n      - name:", start + marker.length);
  const step = workflow.slice(start, next < 0 ? undefined : next);
  assert.ok(workflow.includes("runs-on: ubuntu-latest"), "system-health workflow must use its hosted Ubuntu runner");
  assert.ok(step.includes("        shell: bash\n"), "controller step must use the Bash shell declared by the Ubuntu runner");
  assert.ok(workflow.includes("  resolve-system-health:"), "a dedicated observer job must start for every completed CI event");
  const observerStart = workflow.indexOf("  resolve-system-health:");
  const controllerStart = workflow.indexOf("  reset-system-breaker:");
  assert.ok(observerStart >= 0 && controllerStart > observerStart, "observer must precede the state-mutating controller");
  const observer = workflow.slice(observerStart, controllerStart);
  const controller = workflow.slice(controllerStart, workflow.indexOf("  reset-system-breaker-windows-fallback:"));
  assert.ok(observer.includes("runs-on: ubuntu-latest"), "observer must use hosted Ubuntu");
  assert.equal(observer.includes("global-citizen-ai-network-self-hosted-runner"), false,
    "read-only observer must not wait behind the shared state-writer lock");
  assert.ok(observer.includes("outputs:\n      should_recover:"), "observer must export exact-head eligibility");
  assert.ok(observer.includes("Write redacted recovery diagnostic summary"),
    "observer must record diagnostics even when the source CI is ineligible");
  assert.ok(observer.includes("Upload recovery diagnostics"),
    "observer must retain an artifact for every completed CI event");
  assert.ok(controller.includes("group: global-citizen-ai-network-self-hosted-runner"),
    "state-mutating controller must retain the shared serialization lock");
  assert.ok(controller.includes("needs: [resolve-system-health]"), "controller must consume verified observer output");
  const observerHeader = observer.slice(0, observer.indexOf("\n    steps:"));
  assert.doesNotMatch(observerHeader, /^    if:/m, "job-level filtering must not suppress diagnostic evidence");
  assert.ok(observer.includes("name: Observe completed CI and resolve exact-head PR"),
    "read-only observer must have a distinct job name from the state-mutating controller");
  assert.equal(workflow.split("    name: Verify completed exact-head CI before resetting system breaker").length, 2,
    "Windows fallback must be able to identify exactly one hosted controller job");
  assert.ok(observer.includes("source_classification_step_outcome=%s"), "diagnostics must distinguish ineligible events");
  assert.ok(observer.includes("resolver_execution_step_outcome=%s"), "diagnostics must distinguish a skipped resolver from an executed result");
  assert.ok(workflow.includes("WORKFLOW_CONCLUSION"), "resolver must validate source CI conclusion inside the job");
  assert.ok(workflow.includes("WORKFLOW_HEAD_REPOSITORY"), "resolver must reject untrusted source repositories");
  assert.ok(step.includes("        run: |\n          set +e\n"), "controller must preserve its exit status");
  assert.ok(workflow.includes("      - name: Write redacted recovery diagnostic summary\n        if: always()"), "diagnostic summary must run even when recovery is ineligible");
  assert.ok(workflow.includes("      - name: Upload recovery diagnostics\n        if: always()"), "diagnostic artifact must always be uploaded");
});

test("Windows fallback is limited to hosted runner allocation failure before any step", () => {
  const marker = "  reset-system-breaker-windows-fallback:";
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, "Windows allocation fallback job must exist");
  const job = workflow.slice(start);
  assert.ok(job.includes("needs: [reset-system-breaker]"));
  assert.ok(job.includes("if: always() && needs.reset-system-breaker.result == 'failure'"));
  assert.ok(job.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(job.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(job.includes("queue: max"));
  assert.ok(job.includes("runner_id -eq 0"));
  assert.ok(job.includes("$steps.Count -eq 0"));
  assert.ok(job.includes("should_fallback=$value"));
  assert.ok(job.includes("should_fallback == 'true' && steps.resolve-pr.outputs.should_recover == 'true'"));
  assert.ok(job.includes("SYSTEM_HEALTH_RUN_ID: ${{ github.event.workflow_run.id }}"));
  assert.ok(job.includes("SYSTEM_HEALTH_RUN_ATTEMPT: ${{ github.event.workflow_run.run_attempt }}"));
  assert.ok(job.includes("SYSTEM_HEALTH_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}"));
  assert.ok(job.includes("ref: main"));
  assert.ok(job.includes("persist-credentials: false"));
  assert.ok(job.includes("shell: powershell -NoProfile -ExecutionPolicy Bypass -File {0}"));
  assert.ok(job.includes('$prs = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get'), "PR API response is assigned without an outer array-subexpression");
  assert.ok(!job.includes('$prs = @(Invoke-RestMethod'), "PR API response must not be wrapped before filtering");
});
