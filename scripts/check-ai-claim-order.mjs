import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20261118060600_ai_providerless_completed_replay.sql",
);
const source = readFileSync(migrationPath, "utf8");
const functionStart = source.indexOf("create or replace function public.claim_ai_request(");
if (functionStart < 0) {
  throw new Error("claim_ai_request definition was not found");
}

const functionEnd = source.indexOf("\n$$;", functionStart);
if (functionEnd < 0) {
  throw new Error("claim_ai_request function terminator was not found");
}
const definition = source.slice(functionStart, functionEnd);

const orderedGuards = [
  ["member-scoped transaction advisory lock", "perform pg_catalog.pg_advisory_xact_lock("],
  ["platform controls row lock", "from public.platform_ai_controls"],
  ["idempotency lookup", "from public.ai_request_idempotency i"],
  ["preflight budget rejection", "if p_preflight_cost_twd > p_max_cost_twd then"],
  ["unresolved member request lookup", "select r.id into v_pending_request_id"],
  ["request rate-limit consumption", "public.consume_ai_request_rate_limit("],
  ["atomic budget reservation", "from public.reserve_ai_budget("],
  ["original user prompt persistence", "insert into public.messages ("],
  ["idempotency record persistence", "insert into public.ai_request_idempotency ("],
];

let previousIndex = -1;
for (const [label, marker] of orderedGuards) {
  const index = definition.indexOf(marker);
  if (index < 0) {
    throw new Error(`claim_ai_request is missing required guard: ${label}`);
  }
  if (index <= previousIndex) {
    throw new Error(`claim_ai_request guard ordering is invalid at: ${label}`);
  }
  previousIndex = index;
}

if (!definition.includes("pg_catalog.hashtextextended(p_owner_id::text, 0)")) {
  throw new Error("claim_ai_request advisory lock is not keyed by member owner_id");
}

const requiredSqlInvariants = [
  [
    "platform controls row is locked",
    /from public\\.platform_ai_controls\\s+where id = true\\s+for update;/i,
  ],
  [
    "idempotency row is locked",
    /where i\\.owner_id = p_owner_id\\s+and i\\.idempotency_key = p_idempotency_key\\s+for update;/i,
  ],
  [
    "unresolved reservation is scoped to the member",
    /where r\\.owner_id = p_owner_id\\s+and r\\.status in \\('queued','running'\\)\\s+and b\\.status = 'reserved'\\s+and i\\.state = 'processing'/i,
  ],
  [
    "original prompt is persisted with its owner and conversation",
    /values\\s*\\(\\s*p_conversation_id,\\s*p_owner_id,\\s*'user',\\s*p_prompt\\s*\\)/i,
  ],
];

for (const [label, pattern] of requiredSqlInvariants) {
  if (!pattern.test(definition)) {
    throw new Error(`claim_ai_request is missing required SQL invariant: ${label}`);
  }
}

console.log(
  `AI claim ordering guard passed: ${orderedGuards.length} ordered guards and ${requiredSqlInvariants.length} SQL invariants checked. ` +
    "This is a static regression check, not a two-session concurrency test.",
);
