import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("system-health recovery captures controller output and uploads it after failure", () => {
  const marker = "      - name: Verify completed CI provenance and reset global breaker";
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, "system-health recovery controller step must exist");
  const next = workflow.indexOf("\n      - name:", start + marker.length);
  const step = workflow.slice(start, next < 0 ? undefined : next);

  assert.ok(step.includes("        shell: bash\n"), "controller step must use the Ubuntu Bash shell");
  assert.ok(step.includes("          node scripts/agent-factory-v2-controller.mjs 2>&1 | tee recovery-controller.log\n"), "controller stdout and stderr must be captured");
  assert.ok(step.includes("          controller_status=${PIPESTATUS[0]}\n"), "controller failure exit status must be preserved after tee");
  assert.ok(step.includes("          exit \"$controller_status\"\n"), "controller failure must still fail the job");
  assert.ok(workflow.includes("      - name: Upload system-health recovery diagnostics\n        if: always()\n        uses: actions/upload-artifact@v4\n"), "diagnostic artifact upload must run even when the controller fails");
  assert.ok(workflow.includes("          retention-days: 14\n"), "recovery diagnostics must be retained for post-run investigation");
});
