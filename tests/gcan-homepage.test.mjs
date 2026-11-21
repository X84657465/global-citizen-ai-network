import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");

test("public homepage exposes first-party workspace, contribution, and login entry points", () => {
  assert.match(homepage, /href="\/workspace"/);
  assert.match(homepage, /href="\/contribute"/);
  assert.match(homepage, /href="\/login"/);
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
  assert.match(homepage, /示範數據/);
  assert.doesNotMatch(homepage, /\b(?:1,?000|10,?000)\s*\+?\s*(?:members|contributors|tasks completed)\b/i);
  assert.doesNotMatch(homepage, /NT\$\s*[\d,]+\s*(?:earned|rewards? paid)/i);
});

test("homepage retains keyboard focus and reduced-motion accessibility rules", () => {
  assert.ok(styles.includes(".page a:focus-visible"));
  assert.match(styles, /:focus-visible/);
  assert.ok(styles.includes("@media(prefers-reduced-motion:reduce)"));
});

test("public homepage section navigation remains available on mobile", () => {
  assert.ok(styles.includes("Mobile navigation remains visible"));
  assert.match(styles, /@media\(max-width:820px\)\{[\s\S]*?\.nav\{display:flex;[\s\S]*?overflow-x:auto/);
});
