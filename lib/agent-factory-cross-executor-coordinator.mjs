import { createHash } from "node:crypto";

export const FACTORY_COORDINATOR_AUDIENCE = "gcan-factory-control-plane";
export const FACTORY_WORKER_SCOPE = "repo/X84657465/global-citizen-ai-network/factory-worker";

function base64UrlJson(segment) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

function deterministicUuid(value) {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
    hex.slice(16, 20) + "-" + hex.slice(20);
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] ?? null : data;
}

export function createGitHubActionsFactoryCoordinator({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const endpoint = env.GCAN_FACTORY_COORDINATOR_URL ?? "";
  const apiKey = env.GCAN_FACTORY_COORDINATOR_ANON_KEY ?? "";
  const oidcUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL ?? "";
  const oidcRequestToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ?? "";
  const runId = env.GITHUB_RUN_ID ?? "";
  const runAttempt = env.GITHUB_RUN_ATTEMPT ?? "";
  const repository = env.GITHUB_REPOSITORY ?? "";
  const configured = Boolean(endpoint && apiKey && oidcUrl && oidcRequestToken &&
    /^[0-9]+$/.test(runId) && /^[0-9]+$/.test(runAttempt) &&
    repository === "X84657465/global-citizen-ai-network");
  if (!configured) return null;
  if (typeof fetchImpl !== "function") throw new TypeError("A Fetch implementation is required.");

  const ownerId = "github-actions:" + runId + ":" + runAttempt;
  const requestId = deterministicUuid(repository + ":" + runId + ":" + runAttempt);
  let cachedToken = null;
  let tokenExpiresAt = 0;

  async function getOidcToken() {
    if (cachedToken && tokenExpiresAt > Date.now() + 30_000) return cachedToken;
    const url = new URL(oidcUrl);
    url.searchParams.set("audience", FACTORY_COORDINATOR_AUDIENCE);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { authorization: "Bearer " + oidcRequestToken, accept: "application/json" },
    });
    if (!response.ok) throw new Error("GitHub Actions OIDC token request failed: HTTP " + response.status);
    const body = await response.json();
    if (typeof body.value !== "string") throw new Error("GitHub Actions OIDC response did not include a token.");
    const parts = body.value.split(".");
    if (parts.length !== 3) throw new Error("GitHub Actions OIDC token is malformed.");
    const claims = base64UrlJson(parts[1]);
    if (typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) {
      throw new Error("GitHub Actions OIDC token is expired or has no expiry.");
    }
    cachedToken = body.value;
    tokenExpiresAt = claims.exp * 1000;
    return cachedToken;
  }

  async function call(action, args) {
    const token = await getOidcToken();
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        apikey: apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ action, args }),
    });
    let body;
    try { body = await response.json(); } catch { throw new Error("Factory coordinator returned invalid JSON."); }
    if (!response.ok || body?.ok !== true) {
      throw new Error("Factory coordinator " + action + " failed: " +
        (typeof body?.error === "string" ? body.error : "HTTP " + response.status));
    }
    return body.data;
  }

  function leaseArgs(lease) {
    if (!lease || typeof lease.scope_key !== "string" ||
        typeof lease.lease_token !== "string" ||
        !Number.isSafeInteger(lease.fencing_token) ||
        lease.fencing_token < 1) {
      throw new TypeError("A valid Factory coordinator lease is required.");
    }
    return {
      p_scope_key: lease.scope_key,
      p_owner_id: ownerId,
      p_request_id: requestId,
      p_lease_token: lease.lease_token,
      p_fencing_token: lease.fencing_token,
    };
  }

  return Object.freeze({
    ownerId,
    requestId,
    async acquireLease(scopeKey, leaseMs = 300_000) {
      const row = firstRow(await call("acquire", {
        p_scope_key: scopeKey,
        p_owner_id: ownerId,
        p_request_id: requestId,
        p_lease_ms: leaseMs,
      }));
      return row ? { ...row, scope_key: scopeKey } : null;
    },
    async renewLease(lease, leaseMs = 300_000) {
      const row = firstRow(await call("renew", { ...leaseArgs(lease), p_lease_ms: leaseMs }));
      return row ?? { renewed: false, expires_at: null };
    },
    async assertLease(lease) {
      return await call("assert", leaseArgs(lease)) === true;
    },
    async releaseLease(lease) {
      return await call("release", leaseArgs(lease)) === true;
    },
    async persistTaskState(lease, eventId, state) {
      return firstRow(await call("persist_state", {
        ...leaseArgs(lease), p_event_id: eventId, p_state: state,
      }));
    },
    async reservePublication(lease, idempotencyKey, payloadHash, payload) {
      return firstRow(await call("reserve_publication", {
        ...leaseArgs(lease),
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_payload: payload,
      }));
    },
    async recordPublication(lease, idempotencyKey, status, branchName = null, pullRequestNumber = null) {
      return await call("record_publication", {
        ...leaseArgs(lease),
        p_idempotency_key: idempotencyKey,
        p_status: status,
        p_branch_name: branchName,
        p_pull_request_number: pullRequestNumber,
      }) === true;
    },
  });
}
