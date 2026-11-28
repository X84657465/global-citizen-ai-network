const EXPECTED_REPOSITORY = "X84657465/global-citizen-ai-network";
const EXPECTED_AUDIENCE = "gcan-factory-control-plane";
const ALLOWED_WORKFLOWS = [
  "/.github/workflows/agent-task-preflight.yml@",
  "/.github/workflows/factory-local-loop-windows-validation.yml@",
];
const encoder = new TextEncoder();
let jwksCache: { expiresAt: number; keys: JsonWebKey[] } | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonSegment(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function getSigningKeys(): Promise<JsonWebKey[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("github_oidc_keys_unavailable");
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error("github_oidc_keys_invalid");
  jwksCache = { keys: body.keys, expiresAt: Date.now() + 5 * 60_000 };
  return body.keys;
}

async function verifyGitHubActionsToken(token: string): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("github_oidc_token_malformed");
  const header = decodeJsonSegment(parts[0]);
  const claims = decodeJsonSegment(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("github_oidc_algorithm_rejected");
  }
  const keyData = (await getSigningKeys()).find((key) => key.kid === header.kid);
  if (!keyData) throw new Error("github_oidc_signing_key_unknown");
  const key = await crypto.subtle.importKey(
    "jwk",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(parts[2]),
    encoder.encode(parts[0] + "." + parts[1]),
  );
  if (!signatureValid) throw new Error("github_oidc_signature_invalid");

  const now = Math.floor(Date.now() / 1000);
  const audience = claims.aud;
  const audienceValid = audience === EXPECTED_AUDIENCE ||
    (Array.isArray(audience) && audience.includes(EXPECTED_AUDIENCE));
  const workflowRef = typeof claims.workflow_ref === "string" ? claims.workflow_ref : "";
  if (claims.iss !== "https://token.actions.githubusercontent.com" ||
      !audienceValid ||
      claims.repository !== EXPECTED_REPOSITORY ||
      !ALLOWED_WORKFLOWS.some((suffix) => workflowRef.includes(suffix)) ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      (typeof claims.nbf === "number" && claims.nbf > now + 30) ||
      typeof claims.run_id !== "string" || !/^[0-9]+$/.test(claims.run_id) ||
      typeof claims.run_attempt !== "string" || !/^[0-9]+$/.test(claims.run_attempt)) {
    throw new Error("github_oidc_claims_rejected");
  }
  return claims;
}

const RPC_ALLOWLIST: Record<string, string> = {
  acquire: "factory_acquire_lease",
  renew: "factory_renew_lease",
  release: "factory_release_lease",
  assert: "factory_assert_lease",
  persist_state: "factory_persist_task_state",
  reserve_publication: "factory_reserve_publication",
  record_publication: "factory_record_publication",
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return Response.json({ error: "github_oidc_token_required" }, { status: 401 });

  let claims: Record<string, unknown>;
  try {
    claims = await verifyGitHubActionsToken(tokenMatch[1]);
  } catch {
    return Response.json({ error: "github_oidc_authentication_failed" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 1_048_576) return Response.json({ error: "request_too_large" }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_body");
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const rpcName = typeof body.action === "string" ? RPC_ALLOWLIST[body.action] : undefined;
  if (!rpcName || !body.args || typeof body.args !== "object" || Array.isArray(body.args)) {
    return Response.json({ error: "unsupported_factory_action" }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "factory_coordinator_not_configured" }, { status: 503 });
  }

  try {
    const response = await fetch(supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/" + rpcName, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: "Bearer " + serviceRoleKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body.args),
    });
    const responseText = await response.text();
    if (!response.ok) {
      return Response.json({
        error: "factory_database_operation_rejected",
        status: response.status,
        run_id: claims.run_id,
        run_attempt: claims.run_attempt,
      }, { status: response.status >= 400 && response.status < 500 ? 409 : 502 });
    }
    let data: unknown = null;
    if (responseText) {
      try { data = JSON.parse(responseText); } catch { return Response.json({ error: "factory_database_response_invalid" }, { status: 502 }); }
    }
    return Response.json({
      ok: true,
      action: body.action,
      data,
      run_id: claims.run_id,
      run_attempt: claims.run_attempt,
    });
  } catch {
    return Response.json({ error: "factory_database_unavailable" }, { status: 503 });
  }
});
