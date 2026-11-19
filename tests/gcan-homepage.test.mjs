import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("public homepage exposes the authenticated workspace and contribution entry points", () => {
  assert.match(homepage, /href="\/workspace"/);
  assert.match(homepage, /href="\/contribute"/);
  assert.match(homepage, /href="\/login"/);
});

test("primary homepage actions route visitors to the intended product destinations", () => {
  assert.match(homepage, /前往 AI 工作空間/);
  assert.match(homepage, /了解全球貢獻中心/);
  assert.match(homepage, /開始探索平台/);
});

test("public homepage clearly discloses early-stage feature limitations", () => {
  assert.match(homepage, /早期 MVP 建置階段/);
  assert.match(homepage, /尚未開放現金獎勵或分散式運算/);
  assert.match(homepage, /正式 AI 服務依供應商與預算設定啟用/);
});

test("public homepage does not fabricate member activity or reward counters", () => {
  assert.doesNotMatch(homepage, /\b(?:1,?000|10,?000)\s*\+?\s*(?:members|contributors|tasks completed)\b/i);
  assert.doesNotMatch(homepage, /NT\$\s*[\d,]+\s*(?:earned|rewards? paid)/i);
});
