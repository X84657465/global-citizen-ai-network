import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../../components/account/account-summary.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../app/account/page.tsx", import.meta.url), "utf8");

test("account summary groups profile details with explicit semantic labels", () => {
  for (const label of ["電子郵件", "顯示名稱", "偏好語言", "帳戶角色", "帳戶狀態", "加入日期"]) {
    assert.ok(component.includes(label), `missing account detail label: ${label}`);
  }
  assert.match(component, /<dl className="info-list">/);
  assert.match(component, /<dt>\{label\}<\/dt>/);
  assert.match(component, /aria-labelledby="account-title"/);
});

test("account actions expose an accessible navigation name and keyboard focus styles", () => {
  assert.match(component, /<nav className="account-actions" aria-label="帳戶功能">/);
  assert.match(component, /:focus-visible/);
  assert.match(component, /aria-label="安全登出會員帳戶"/);
});

test("privileged actions are rendered only for active authorized roles", () => {
  assert.match(component, /role === "admin" && status === "active"/);
  assert.match(component, /\["admin", "reviewer"\]\.includes\(role\) && status === "active"/);
  assert.match(component, /admin\/ai-operations/);
  assert.match(component, /admin\/appeals/);
});

test("account page keeps server-side authentication and does not expose the user identifier", () => {
  assert.match(page, /await supabase\.auth\.getUser\(\)/);
  assert.match(page, /if \(userError \|\| !user\)\s*\{\s*redirect\("\/login"\)/);
  assert.match(page, /<AccountSummary email=\{user\.email \?\? null\} profile=\{profile\} \/>/);
  assert.doesNotMatch(component, /會員識別碼|user\.id/);
});
