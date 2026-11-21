import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const workstreams = readFileSync(new URL("../docs/engineering-workstreams.md", import.meta.url), "utf8");
const governance = readFileSync(new URL("../docs/engineering-governance.md", import.meta.url), "utf8");
const versionManifest = JSON.parse(readFileSync(new URL("../versions/manifest.json", import.meta.url), "utf8"));

test("public homepage represents all fifteen A-O workstreams and P as cross-cutting governance", () => {
  for (const code of "ABCDEFGHIJKLMNO") {
    assert.ok(homepage.includes(`code:"${code}"`), `homepage missing workstream ${code}`);
    assert.ok(readme.includes(`| ${code} |`), `README missing workstream ${code}`);
    assert.ok(workstreams.includes(`| ${code} |`), `architecture missing workstream ${code}`);
  }
  assert.ok(homepage.includes('code:"P"'));
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
  assert.match(governance, /P is cross-cutting governance, not a peer feature track/i);
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
  assert.match(homepage, /同一精確 SHA 的 CI、Preview/);
  assert.match(readme, /歷史五線驗證快照/);
  assert.match(readme, /A–P 全線工程索引/);
});

test("version manifest registers every A-P workstream with a valid numeric version", () => {
  assert.deepEqual(Object.keys(versionManifest.tracks).sort(), [..."ABCDEFGHIJKLMNOP"]);
  for (const [code, track] of Object.entries(versionManifest.tracks)) {
    assert.ok(track.name, `track ${code} is missing a name`);
    assert.match(track.version, /^[0-9]+[.][0-9]+[.][0-9]+$/, `track ${code} has an invalid version`);
  }
  for (const code of "FGHIJKLMNOP") {
    assert.equal(versionManifest.tracks[code].status, "planned", `track ${code} must remain planned until evidence-based activation`);
  }
});

test("homepage preserves first-party workspace, contribution and login entry points", () => {
  assert.match(homepage, /href="\/workspace"/);
  assert.match(homepage, /href="\/contribute"/);
  assert.match(homepage, /href="\/login"/);
});

test("A and C workbenches use first-party routes while D and E remain explicit external previews", () => {
  assert.match(homepage, /code:"A"[\s\S]*?href:"\/factory"/);
  assert.match(homepage, /code:"C"[\s\S]*?href:"\/predictive-coding"/);
  assert.match(homepage, /code:"D"[\s\S]*?external:true/);
  assert.match(homepage, /code:"E"[\s\S]*?external:true/);
  assert.match(homepage, /D、E 目前仍為獨立預覽環境/);
});

test("homepage retains keyboard focus visibility and reduced-motion accessibility", () => {
  assert.ok(styles.includes(".page a:focus-visible"));
  assert.match(styles, /:focus-visible/);
  assert.ok(styles.includes("@media(prefers-reduced-motion:reduce)"));
});

test("homepage release status remains accurate after a candidate is merged", () => {
  assert.match(homepage, /EARLY DEVELOPMENT \/ MVP/);
  assert.match(homepage, /精確 SHA 的 CI、Preview/);
  assert.ok(homepage.includes("/CHANGELOG.md"));
  assert.doesNotMatch(homepage, /PR #(?:207|260) CANDIDATE|\/pull\/(?:207|260)/);
});
