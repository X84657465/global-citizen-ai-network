#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrations = {
  completion: "supabase/migrations/20261118003125_atomic_ai_chat_completion_and_reconciliation.sql",
  reconciliation: "supabase/migrations/20261118003138_audited_ai_reconciliation_resolution.sql",
};

function extractFunction(path, name) {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
  const start = source.indexOf("create or replace function public." + name + "(");
  if (start < 0) throw new Error(path + ": missing function " + name);
  const end = source.indexOf("\n$$;", start);
  if (end < 0) throw new Error(path + ": unterminated function " + name);
  return source.slice(start, end);
}

function assertOrder(definition, name, markers) {
  let previous = -1;
  for (const [label, marker] of markers) {
    const index = definition.indexOf(marker);
    if (index < 0) throw new Error(name + ": missing lock-order marker: " + label);
    if (index <= previous) throw new Error(name + ": lock order regressed at: " + label);
    previous = index;
  }
}

const completionFunctions = [
  ["complete_ai_chat_request", true],
  ["fail_ai_chat_request", true],
  ["mark_ai_request_reconciliation_required", false],
];

for (const [name, hasIdempotencyLock] of completionFunctions) {
  const definition = extractFunction(migrations.completion, name);
  const markers = [
    ["global platform controls lock", "from public.platform_ai_controls"],
    ["budget reservation lock", "from public.ai_budget_reservations"],
    ["AI request lock", "from public.ai_requests"],
  ];
  if (hasIdempotencyLock) {
    markers.push(["idempotency row lock", "from public.ai_request_idempotency"]);
  }
  assertOrder(definition, name, markers);

  if (!/from public\.platform_ai_controls\s+where id = true\s+for update;/i.test(definition)) {
    throw new Error(name + ": platform controls must be row-locked");
  }
  if (!/from public\.ai_budget_reservations[\s\S]*?for update;/i.test(definition)) {
    throw new Error(name + ": reservation must be row-locked");
  }
  if (!/from public\.ai_requests[\s\S]*?for update;/i.test(definition)) {
    throw new Error(name + ": request must be row-locked");
  }
  if (hasIdempotencyLock && !/from public\.ai_request_idempotency[\s\S]*?for update;/i.test(definition)) {
    throw new Error(name + ": idempotency row must be row-locked");
  }
}

const resolution = extractFunction(migrations.reconciliation, "resolve_ai_reconciliation");
assertOrder(resolution, "resolve_ai_reconciliation", [
  ["authenticated admin profile lock", "from public.profiles"],
  ["global platform controls lock", "from public.platform_ai_controls"],
  ["reconciliation idempotency lookup", "from public.ai_reconciliation_events"],
  ["budget reservation lock", "from public.ai_budget_reservations"],
  ["AI request lock", "from public.ai_requests"],
  ["AI request idempotency lock", "from public.ai_request_idempotency"],
]);

for (const [label, pattern] of [
  ["profile lock", /from public\.profiles\s+where id = auth\.uid\(\)\s+for update;/i],
  ["global controls lock", /from public\.platform_ai_controls\s+where id = true\s+for update;/i],
  ["reconciliation event lock", /where request_id = p_request_id\s+and idempotency_key = p_idempotency_key\s+for update;/i],
  ["reservation lock", /from public\.ai_budget_reservations[\s\S]*?for update;/i],
  ["request lock", /from public\.ai_requests[\s\S]*?for update;/i],
  ["idempotency lock", /from public\.ai_request_idempotency[\s\S]*?for update;/i],
]) {
  if (!pattern.test(resolution)) throw new Error("resolve_ai_reconciliation: missing " + label);
}

console.log(
  "AI settlement lock-order guard passed: 3 settlement RPCs and reconciliation resolution checked. " +
  "Static regression validation only; it does not replace PostgreSQL deadlock/concurrency tests.",
);
