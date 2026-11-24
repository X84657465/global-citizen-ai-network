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
  assert.ok(step.includes("        run: node scripts/agent-factory-v2-controller.mjs"), "controller invocation must remain unchanged");
});
