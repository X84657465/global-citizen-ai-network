import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("system-health recovery keeps hosted Ubuntu as the primary runner", () => {
  const marker = "      - name: Verify completed CI provenance and reset global breaker";
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, "system-health recovery controller step must exist");
  const next = workflow.indexOf("\n      - name:", start + marker.length);
  const step = workflow.slice(start, next < 0 ? undefined : next);
  assert.ok(workflow.includes("runs-on: ubuntu-latest"), "hosted Ubuntu remains the primary recovery runner");
  assert.ok(step.includes("        shell: bash\n"), "primary controller uses Bash on Ubuntu");
  assert.ok(step.includes("        run: node scripts/agent-factory-v2-controller.mjs"), "primary controller invocation remains unchanged");
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
});
