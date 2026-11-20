import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { redactSupabaseStartOutput } from "../scripts/redact-supabase-start-output.mjs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

test("redacts Supabase named key rows and preserves useful diagnostics", () => {
  const secrets = [
    "anon key: eyJabcdefghijk.abcdefghijk.abcdefghijk",
    "service_role key: eyJserviceRole.abcdefghijk.abcdefghijk",
    "publishable key: sb_publishable_local_example",
    "secret key: sb_secret_local_example",
    "Storage Access Key: storage_access_example",
    "Storage Secret Key: storage_secret_example",
  ];
  const input = ["Starting local Supabase", "API URL: http://127.0.0.1:54321", ...secrets, "migration failed: relation missing"].join("\n");
  const output = redactSupabaseStartOutput(input);

  for (const secret of [
    "eyJabcdefghijk.abcdefghijk.abcdefghijk",
    "eyJserviceRole.abcdefghijk.abcdefghijk",
    "sb_publishable_local_example",
    "sb_secret_local_example",
    "storage_access_example",
    "storage_secret_example",
  ]) assert.equal(output.includes(secret), false, "secret must not survive redaction");

  assert.match(output, /\[REDACTED\]/);
  assert.match(output, /API URL: http:\/\/127\.0\.0\.1:54321/);
  assert.match(output, /migration failed: relation missing/);
});

test("redacts JWT-shaped values and database URL passwords outside named rows", () => {
  const input = [
    "diagnostic token eyJabcdefghijk.abcdefghijk.abcdefghijk",
    "Database URL: postgresql://postgres:local_password@127.0.0.1:54322/postgres",
    "JWT_SECRET=local_jwt_secret",
    "Access Key=local_access_secret",
  ].join("\n");
  const output = redactSupabaseStartOutput(input);

  for (const secret of ["eyJabcdefghijk.abcdefghijk.abcdefghijk", "local_password", "local_jwt_secret", "local_access_secret"]) {
    assert.equal(output.includes(secret), false);
  }
  assert.match(output, /postgresql:\/\/postgres:\[REDACTED\]@127\.0\.0\.1:54322/);
});

test("redaction is idempotent", () => {
  const once = redactSupabaseStartOutput("secret key: sb_secret_example");
  assert.equal(redactSupabaseStartOutput(once), once);
});

test("CI captures Supabase output and fails closed before emitting sanitized diagnostics", () => {
  const start = workflow.indexOf("      - name: Start isolated Supabase and apply migrations");
  assert.ok(start >= 0, "Supabase startup step must exist");
  const next = workflow.indexOf("\n      - name:", start + 1);
  const section = workflow.slice(start, next < 0 ? workflow.length : next);

  assert.match(section, /supabase start\b[^\r\n]*2>&1\x27\s*\|\s*Out-String\b/, "cmd.exe must capture stderr before PowerShell collects the combined output");
  const capture = section.indexOf("2>&1");
  const exitCode = section.indexOf("$startExitCode = $LASTEXITCODE");
  const redact = section.indexOf("$redactedOutput = $startOutput | node scripts/redact-supabase-start-output.mjs");
  const redactionExit = section.indexOf("$redactionExitCode = $LASTEXITCODE");
  assert.ok(capture >= 0 && exitCode > capture && redact > exitCode && redactionExit > redact, "capture the CLI exit code before redaction changes LASTEXITCODE");
  assert.ok(section.includes("node scripts/redact-supabase-start-output.mjs"));
  assert.ok(section.includes("$redactionExitCode -ne 0"), "redaction failure must fail closed");
  assert.ok(section.includes("refusing to emit unredacted output"));
  assert.ok(section.includes("Write-Output ($redactedOutput -join [Environment]::NewLine)"));
  assert.equal(section.includes("Write-Output $startOutput"), false);
  assert.equal(section.includes("Write-Host $startOutput"), false);
});
