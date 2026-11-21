import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  new URL("../../app/api/admin/fp/governance-reviews/route.ts", import.meta.url),
  "utf8",
);

test("every governance response uses the private no-store response helper", () => {
  assert.match(route, /function privateJson\(/);
  assert.match(route, /headers\.set\("Cache-Control", "no-store"\)/);
  assert.match(route, /headers\.set\("X-Content-Type-Options", "nosniff"\)/);
  assert.equal((route.match(/NextResponse\.json\(/g) ?? []).length, 1);
  assert.ok(route.includes("return NextResponse.json(body, { ...init, headers });"));
  assert.equal((route.match(/return privateJson\(/g) ?? []).length, 6);
});

test("authentication and authorization failures remain before GitHub access", () => {
  const auth = route.indexOf("const auth = await getAuthenticatedClient()");
  const profile = route.indexOf(".from(\"profiles\")");
  const activeAdmin = route.indexOf("isActiveAdminProfile(profile)");
  const githubClient = route.indexOf("createGitHubApiClient({");
  assert.ok(auth >= 0 && auth < profile);
  assert.ok(profile < activeAdmin);
  assert.ok(activeAdmin < githubClient);
  assert.match(route, /status: 401/);
  assert.match(route, /status: 403/);
  assert.match(route, /status: 503/);
});

test("the endpoint remains read-only and cannot grant governance or release authority", () => {
  assert.match(route, /export async function GET\(/);
  assert.doesNotMatch(route, /export async function (?:POST|PUT|PATCH|DELETE)\(/);
  assert.match(route, /governanceApprovalGranted: false/);
  assert.match(route, /mergeAuthorized: false/);
  assert.match(route, /deploymentAuthorized: false/);
  assert.match(route, /isSafeGitHubRepositoryName\(repository\)/);
  assert.match(route, /params\.getAll\("pull_request"\)\.length !== 1/);
  assert.match(route, /params\.getAll\("sha"\)\.length !== 1/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});
