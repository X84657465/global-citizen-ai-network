import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Redact ephemeral credentials from Supabase CLI startup diagnostics.
 * Preserve non-secret diagnostics so startup failures remain actionable.
 */
export function redactSupabaseStartOutput(output) {
  let redacted = String(output ?? "");

  redacted = redacted.replace(
    /(^|\r?\n)([ \t]*(?:anon(?:ymous)?\s+key|service[_ -]?role\s+key|publishable\s+key|secret\s+key|(?:storage|s3)\s+(?:access|secret)\s+key)\s*[:=]\s*)[^\r\n]*/gi,
    "$1$2[REDACTED]"
  );
  // Supabase CLI renders Storage S3 credentials in bordered table rows such as
  // "? Access Key ? value ?" rather than a conventional key:value pair.
  // Redact only the value cell while preserving the useful diagnostic label.
  redacted = redacted.replace(
    /(^|\r?\n)([^\r\n]*[?│|][ \t]*(?:storage[ \t]+)?(?:access|secret)[ \t]+key[ \t]*[?│|][ \t]*)([^?│|\r\n]+?)([ \t]*[?│|][^\r\n]*)/gi,
    "$1$2[REDACTED]$4"
  );
  redacted = redacted.replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/gi, "[REDACTED]");
  redacted = redacted.replace(
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    "[REDACTED]"
  );
  redacted = redacted.replace(
    /\b((?:access|secret)\s*[_-]?\s*key|(?:auth(?:orization)?|api)\s*[_-]?\s*token|jwt\s*[_-]?\s*secret)\s*[:=]\s*([^\s,;]+)/gi,
    "$1=[REDACTED]"
  );
  redacted = redacted.replace(/(postgres(?:ql)?:\/\/[^:/\s]+:)[^@\s]+(@)/gi, "$1[REDACTED]$2");

  return redacted;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(redactSupabaseStartOutput(readFileSync(0, "utf8")));
}
