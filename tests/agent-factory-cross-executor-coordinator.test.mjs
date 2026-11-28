import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubActionsFactoryCoordinator, FACTORY_COORDINATOR_AUDIENCE } from "../lib/agent-factory-cross-executor-coordinator.mjs";

function jwt(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return encode({ alg: "RS256", kid: "test-key" }) + "." + encode(claims) + ".signature";
}

function fixture() {
  const calls = [];
  const token = jwt({ exp: Math.floor(Date.now() / 1000) + 300 });
  const env = {
    GCAN_FACTORY_COORDINATOR_URL: "https://project.example/functions/v1/factory-coordinator",
    GCAN_FACTORY_COORDINATOR_ANON_KEY: "sb_publishable_test",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.githubusercontent.com/?q=1",
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
    GITHUB_RUN_ID: "12345",
    GITHUB_RUN_ATTEMPT: "2",
    GITHUB_REPOSITORY: "X84657465/global-citizen-ai-network",
  };
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith("https://token.actions.githubusercontent.com/")) {
      return { ok: true, status: 200, json: async () => ({ value: token }) };
    }
    const request = JSON.parse(options.body);
    const data = request.action === "renew"
      ? [{ renewed: true, expires_at: "2026-11-28T10:00:00Z" }]
      : [{ acquired: true, lease_token: "lease-token", fencing_token: 7, expires_at: "2026-11-28T10:00:00Z" }];
    return { ok: true, status: 200, json: async () => ({ ok: true, data }) };
  };
  return { calls, env, fetchImpl };
}

test("coordinator is unavailable outside an authenticated GitHub Actions repository run", () => {
  assert.equal(createGitHubActionsFactoryCoordinator({ env: {} }), null);
  const { env, fetchImpl } = fixture();
  assert.equal(createGitHubActionsFactoryCoordinator({ env: { ...env, GITHUB_REPOSITORY: "other/repo" }, fetchImpl }), null);
});

test("coordinator requests a scoped OIDC token and binds lease calls to the current workflow run", async () => {
  const { calls, env, fetchImpl } = fixture();
  const coordinator = createGitHubActionsFactoryCoordinator({ env, fetchImpl });
  assert.ok(coordinator);
  assert.equal(coordinator.ownerId, "github-actions:12345:2");
  const lease = await coordinator.acquireLease("repo/test/factory-worker", 120000);
  assert.equal(lease.acquired, true);
  assert.equal(lease.fencing_token, 7);
  assert.equal(calls.length, 2);
  const oidcUrl = new URL(calls[0].url);
  assert.equal(oidcUrl.searchParams.get("audience"), FACTORY_COORDINATOR_AUDIENCE);
  assert.equal(calls[0].options.headers.authorization, "Bearer request-token");
  assert.equal(calls[1].options.headers.apikey, "sb_publishable_test");
  assert.equal(calls[1].options.headers.authorization.startsWith("Bearer "), true);
  const request = JSON.parse(calls[1].options.body);
  assert.equal(request.action, "acquire");
  assert.equal(request.args.p_owner_id, "github-actions:12345:2");
  assert.equal(request.args.p_lease_ms, 120000);
});

test("coordinator reuses an unexpired OIDC token for subsequent lease operations", async () => {
  const { calls, env, fetchImpl } = fixture();
  const coordinator = createGitHubActionsFactoryCoordinator({ env, fetchImpl });
  const lease = await coordinator.acquireLease("repo/test/factory-worker");
  const renewed = await coordinator.renewLease({ ...lease, scope_key: "repo/test/factory-worker" }, 300000);
  assert.equal(renewed.renewed, true);
  assert.equal(calls.filter((call) => call.url.startsWith("https://token.actions.githubusercontent.com/")).length, 1);
  assert.equal(JSON.parse(calls[2].options.body).action, "renew");
});
