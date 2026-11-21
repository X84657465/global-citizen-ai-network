import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import testRunner from "node:test";
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");
const registry = "ABCDEFGHIJKLMNO".split("");

testRunner("public homepage names all fifteen independently owned workstreams and P governance", () => {
 for (const code of registry) assert.match(page, new RegExp('code:"' + code + '"'), "missing workstream " + code);
 assert.match(page,/code:"P".*Governance, Ethics & Trust/);
 assert.match(page,/P 是橫向治理層/);
});
testRunner("homepage exposes the canonical product and engineering destinations", () => {
 for (const path of ["/factory","/workspace","/predictive-coding","#architecture","#p-governance"]) assert.ok(page.includes(path), "missing destination " + path);
 assert.match(page,/data-track={code}/);
});
testRunner("shared loop preserves prediction-error and receiving-owner review", () => {
 for (const term of ["觀測","提出預測","採取行動","量測結果","計算預測誤差","解釋並保存證據","修正模型／計畫","接收線審核","持續監控"]) assert.ok(page.includes(term), "missing loop stage " + term);
 assert.match(page,/接收線擁有採用決策權/);
});
testRunner("homepage includes architecture visuals and mobile/accessibility rules", () => {
 assert.match(page,/gcan-hero\.svg/); assert.match(page,/gcan-five-track-architecture\.svg/);
 assert.ok(styles.includes("@media(max-width:620px)")); assert.match(styles,/:focus-visible/); assert.match(styles,/prefers-reduced-motion/);
 assert.match(styles,/data-track=\\"P\\"/);
});
testRunner("homepage distinguishes roadmap, integration status and production readiness", () => {
 assert.ok(page.includes("EARLY DEVELOPMENT / MVP")); assert.match(page,/示範資料/); assert.match(page,/尚未整合/); assert.match(page,/不會自行更改正式帳務/);
});
