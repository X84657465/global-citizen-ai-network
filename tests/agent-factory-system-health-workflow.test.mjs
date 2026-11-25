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
  assert.ok(workflow.includes("    runs-on: ubuntu-latest"), "observer job must start for every completed CI event");
  assert.equal(workflow.includes("    if: >-"), false, "job-level filtering must not suppress diagnostic evidence");
  assert.ok(workflow.includes("WORKFLOW_CONCLUSION"), "resolver must validate source CI conclusion inside the job");
  assert.ok(workflow.includes("WORKFLOW_HEAD_REPOSITORY"), "resolver must reject untrusted source repositories");
  assert.ok(step.includes("        run: |\n          set +e\n"), "controller must preserve its exit status");
  assert.ok(workflow.includes("      - name: Write redacted recovery diagnostic summary\n        if: always()"), "diagnostic summary must run even when recovery is ineligible");
  assert.ok(workflow.includes("      - name: Upload recovery diagnostics\n        if: always()"), "diagnostic artifact must always be uploaded");
});
