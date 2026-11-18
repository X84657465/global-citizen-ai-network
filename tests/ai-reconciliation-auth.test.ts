import test from "node:test";
import assert from "node:assert/strict";
import { isActiveAdminProfile } from "../lib/ai/reconciliation-auth.ts";

test("allows only an active admin profile", () => {
  assert.equal(isActiveAdminProfile({ role: "admin", account_status: "active" }), true);
});

test("rejects non-admin, inactive, and suspended profiles", () => {
  for (const profile of [
    { role: "member", account_status: "active" },
    { role: "admin", account_status: "inactive" },
    { role: "admin", account_status: "suspended" },
    { role: "owner", account_status: "active" },
  ]) {
    assert.equal(isActiveAdminProfile(profile), false);
  }
});

test("rejects missing, malformed, and array profile values", () => {
  for (const profile of [null, undefined, [], "admin", 42, {}]) {
    assert.equal(isActiveAdminProfile(profile), false);
  }
});

test("does not accept inherited authorization fields", () => {
  const inheritedProfile = Object.create({ role: "admin", account_status: "active" });
  assert.equal(isActiveAdminProfile(inheritedProfile), false);
});
