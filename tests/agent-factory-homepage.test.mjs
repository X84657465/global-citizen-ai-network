import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/factory/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/factory/factory.module.css", import.meta.url), "utf8");

test("factory homepage links to real engineering evidence and A-line source", () => {
  assert.match(page, /PR #207/);
  assert.match(page, /feat\/agent-factory-v2/);
  assert.match(page, /global-citizen-ai-network\/actions/);
  assert.match(page, /global-citizen-ai-network\/pull\/207/);
});

test("factory homepage does not fabricate operational counters or PASS states", () => {
  assert.doesNotMatch(page, />\s*(?:128|96|75%|08|03)\s*</);
  assert.doesNotMatch(page, />\s*PASS\s*</);
  assert.match(page, /不顯示虛構數字/);
  assert.match(page, /不以示範 PASS 取代證據/);
});

test("factory homepage keeps CI, Preview, human approval and Production as separate gates", () => {
  assert.match(page, /精確 SHA CI 驗證/);
  assert.match(page, /Preview 與裝置驗收/);
  assert.match(page, /人工核准/);
  assert.match(page, /正式發布/);
  assert.match(page, /未經核准不合併、不部署/);
});

test("factory navigation has accessible labels and responsive layout rules", () => {
  assert.match(page, /aria-label="Agent Factory 導覽"/);
  assert.match(page, /aria-label="品質閘門"/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /:focus-visible/);
});

test("factory homepage does not misrepresent an older Preview as the current candidate", () => {
  assert.match(page, /最新 SHA Preview 未部署 · 待額度恢復/);
  assert.match(page, /舊 SHA，不能作為本版驗收證據/);
  assert.ok(page.includes("CANDIDATE · 0.3.121"));
  assert.ok(page.includes("版本 2.0.81"));
});
