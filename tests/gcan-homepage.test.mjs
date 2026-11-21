import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const workstreams = readFileSync(new URL("../docs/engineering-workstreams.md", import.meta.url), "utf8");
const governance = readFileSync(new URL("../docs/engineering-governance.md", import.meta.url), "utf8");

test("public homepage represents all fifteen A-O workstreams and P as cross-cutting governance", () => {
  for (const code of "ABCDEFGHIJKLMNO") {
    assert.ok(homepage.includes(`code:"${code}"`), `homepage missing workstream ${code}`);
    assert.ok(readme.includes(`| ${code} |`), `README missing workstream ${code}`);
    assert.ok(workstreams.includes(`| ${code} |`), `architecture missing workstream ${code}`);
  }
  assert.ok(homepage.includes('code:"P"'));
  assert.ok(homepage.includes("P｜Governance"));
  assert.ok(readme.includes("| P |"));
  assert.ok(workstreams.includes("| P |"));
  assert.match(homepage, /P is the cross-cutting governance layer|P｜治理/);
});

test("homepage clearly declares factory-first, B-next and ecosystem-last priorities", () => {
  assert.ok(homepage.includes('id="priority-charter"'));
  assert.match(homepage, /最高核心價值：[\s\S]*?先穩定工廠，再讓產品創造價值/);
  assert.match(homepage, /A｜Agent Factory V2 工廠優先/);
  assert.match(homepage, /B｜GCAN Product 接棒/);
  assert.match(homepage, /必要線只解卡、不搶主線/);
});

test("P governance remains a separate cross-cutting layer, not a feature workstream", () => {
  assert.match(governance, /P is the cross-cutting governance layer/i);
  assert.match(governance, /P is not a sixth feature track/i);
  assert.match(workstreams, /P \| Governance, Ethics & Trust/);
});

test("workstream cards retain responsive desktop, tablet and mobile layouts", () => {
  assert.ok(styles.includes(".trackGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"));
  assert.match(styles, /@media\(max-width:1120px\)[\s\S]*?\.trackGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}[\s\S]*?\.trackCard\[data-track="P"\]/);
  assert.match(styles, /\.trackGrid\{display:grid;grid-template-columns:1fr/);
  assert.match(styles, /\.trackCard,\.trackCard\[data-track="P"\]/);
});

test("homepage and repository README disclose early-stage status and exact-SHA Preview requirements", () => {
  assert.match(homepage, /早期建置與預覽階段/);
  assert.match(homepage, /Preview 必須與目前候選 SHA 完全一致/);
  assert.match(readme, /歷史五線驗證快照/);
  assert.match(readme, /A–P 全線工程索引/);
});
