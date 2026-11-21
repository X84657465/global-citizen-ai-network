import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../versions/manifest.json", import.meta.url), "utf8"));
const rootVersion = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
const productVersion = readFileSync(new URL("../versions/gcan-product/VERSION", import.meta.url), "utf8").trim();

test("public homepage exposes first-party workspace, contribution, and login entry points", () => {
  assert.match(homepage, /href="\/workspace"/);
  assert.match(homepage, /href="\/contribute"/);
  assert.match(homepage, /href="\/login"/);
});

test("hero prioritizes the real product and factory entry points", () => {
  assert.ok(homepage.includes('<Link href="/workspace" className={styles.primaryButton}>進入 AI 工作空間'));
  assert.ok(homepage.includes('<Link href="/factory" className={styles.secondaryButton}>查看 Agent Factory 工廠'));
  assert.ok(homepage.includes('className={styles.heroExplore}>或先探索 A–O'));
  assert.ok(styles.includes(".heroExplore"));
});

test("repository homepage points readers to current engineering tracks instead of retired PR numbers", () => {
  assert.ok(readme.includes("PR #207（Draft）"));
  assert.ok(readme.includes("Agent Factory V2（A 線）"));
  for (const retiredPr of ["pull/134", "pull/137", "pull/139", "pull/140", "pull/141"]) {
    assert.ok(!readme.includes(retiredPr), `README still references retired PR: ${retiredPr}`);
  }
});

test("A and C workbenches use first-party routes on the integrated application", () => {
  assert.match(homepage, /code:"A"[\s\S]*?href:"\/factory"/);
  assert.match(homepage, /code:"C"[\s\S]*?href:"\/predictive-coding"/);
  assert.doesNotMatch(homepage, /git-fe-[^"]+\.vercel\.app\/(?:factory|predictive-coding)/);
});

test("D and E remain explicitly isolated previews until their in-repository routes exist", () => {
  assert.match(homepage, /code:"D"[\s\S]*?external:true/);
  assert.match(homepage, /code:"E"[\s\S]*?external:true/);
  assert.match(homepage, /D、E 目前仍為獨立預覽環境/);
});

test("homepage labels early-stage and demo capabilities without fabricating activity", () => {
  assert.match(homepage, /早期建置與預覽階段/);
  assert.match(homepage, /Preview 必須與目前候選 SHA 完全一致/);
  assert.match(homepage, /舊 SHA 部署不得作為本版驗收證據/);
  assert.match(homepage, /示範數據/);
  assert.doesNotMatch(homepage, /\b(?:1,?000|10,?000)\s*\+?\s*(?:members|contributors|tasks completed)\b/i);
  assert.doesNotMatch(homepage, /NT\$\s*[\d,]+\s*(?:earned|rewards? paid)/i);
});

test("homepage retains keyboard focus and reduced-motion accessibility rules", () => {
  assert.ok(styles.includes(".page a:focus-visible"));
  assert.match(styles, /:focus-visible/);
  assert.ok(styles.includes("@media(prefers-reduced-motion:reduce)"));
});

test("candidate status and release labels wrap safely on narrow mobile screens", () => {
  assert.ok(styles.includes(".stageLabel{white-space:normal;line-height:1.6;max-width:100%}"));
});

test("public homepage section navigation remains available on mobile", () => {
  assert.ok(styles.includes("Mobile navigation remains visible"));
  assert.match(styles, /@media\(max-width:820px\)\{[\s\S]*?\.nav\{display:flex;[\s\S]*?overflow-x:auto/);
});

test("repository homepage explains exact-SHA Preview acceptance without stale deployment claims", () => {
  assert.match(readme, /Preview 部署必須與目前 PR HEAD 的完整 SHA 完全一致/);
  assert.match(readme, /不同 SHA 的舊部署不得作為目前候選的驗收證據/);
  assert.doesNotMatch(readme, /Build Rate Limit/);
});

test("public homepage renders candidate versions from the authoritative manifest", () => {
  assert.ok(homepage.includes('import releaseManifest from "../versions/manifest.json";'));
  assert.match(homepage, /平台 \{releaseManifest\.overall\} · A 線 \{releaseManifest\.tracks\.A\.version\} · B 產品 \{releaseManifest\.tracks\.B\.version\}/);
  assert.ok(readme.includes("[版本清單](versions/manifest.json)"));
});

test("repository and B-line homepage release metadata matches the authoritative manifest", () => {
  assert.equal(rootVersion, "0.3.123");
  assert.equal(manifest.overall, rootVersion);
  assert.equal(productVersion, "0.1.23");
  assert.equal(manifest.tracks.B.version, productVersion);
});


test("A–O + P workstream cards preserve desktop, tablet, and mobile layouts", () => {
  assert.ok(styles.includes(".trackGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"));
  assert.match(styles, /@media\(max-width:1120px\)\{[\s\S]*?\.trackGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}[\s\S]*?\.trackCard\[data-track="P"\]\{grid-column:1\/-1;justify-self:center/);
  assert.match(styles, /\.trackGrid\{display:grid;grid-template-columns:1fr(?:;|\})/);
  assert.match(styles, /\.trackCard,\.trackCard\[data-track="P"\]\{grid-column:auto;justify-self:stretch;width:100%/);
});


test("repository landing page exposes the product workspace, factory, and current homepage candidate", () => {
  assert.ok(readme.includes("[AI 工作空間](https://global-citizen-ai-network.vercel.app/workspace)"));
  assert.ok(readme.includes("[正式工廠控制中心](https://global-citizen-ai-network.vercel.app/factory)"));
  assert.ok(readme.includes("PR #207（尚未發布）"));
  assert.match(readme, /Preview 部署必須與目前 PR HEAD 的完整 SHA 完全一致/);
});


test("primary navigation exposes the product workspace and Agent Factory directly", () => {
  assert.ok(homepage.includes('<Link href="/workspace">AI 工作空間</Link>'));
  assert.ok(homepage.includes('<Link href="/factory">A 線工廠</Link>'));
});


test("repository and product homepages expose task-oriented workspace, factory, and contribution entry points", () => {
  assert.match(readme, /快速入口｜依使用目的開始/);
  assert.ok(readme.includes("[Agent Factory V2](https://global-citizen-ai-network.vercel.app/factory)"));
  assert.ok(homepage.includes('<Link href="/factory" className={styles.productCard}>'));
  assert.ok(homepage.includes("<h3>Agent Factory 工廠</h3>"));
  assert.ok(homepage.includes('<Link href="/factory">A 線工廠</Link>'));
  assert.ok(homepage.includes('<Link href="/contribute">全球貢獻中心</Link>'));
});


test("four product entry cards use a balanced desktop grid and collapse cleanly on mobile", () => {
  assert.ok(styles.includes(".productGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))"));
  assert.match(styles, /@media\(max-width:620px\)[\s\S]*?\.productGrid,\.trustGrid,\.docsGrid\{grid-template-columns:1fr/);
});


test("homepage makes the factory-first, B-next, ecosystem-last strategy the highest development principle", () => {
  assert.ok(homepage.includes('id="priority-charter"'));
  assert.match(homepage, /最高核心價值：[\\s\\S]*?先穩定工廠，再讓產品創造價值/);
  assert.match(homepage, /A｜Agent Factory V2 工廠優先/);
  assert.match(homepage, /A–P｜治理與必要銜接/);
  assert.match(homepage, /B｜GCAN Product 接棒/);
  assert.match(homepage, /全球 AI 生態系｜最後擴張/);
  assert.match(homepage, /必要線只解卡、不搶主線/);
  assert.ok(styles.includes(".priorityGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}"));
  assert.match(styles, /@media\\(max-width:620px\\)[\\s\\S]*?\\.priorityGrid\\{grid-template-columns:1fr/);
});
