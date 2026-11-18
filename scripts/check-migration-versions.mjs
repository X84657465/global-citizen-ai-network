import { readdirSync } from "node:fs";

const directory = "supabase/migrations";
const files = readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
const versions = new Set();

if (files.length === 0) throw new Error("No Supabase migrations found.");

for (const file of files) {
  const match = /^(\d{14})_[a-z0-9_]+\.sql$/i.exec(file);
  if (!match) throw new Error(`Migration filename must preserve its 14-digit applied version: ${file}`);
  if (versions.has(match[1])) throw new Error(`Duplicate Supabase migration version: ${match[1]}`);
  versions.add(match[1]);
}

console.log(`Validated ${files.length} timestamped Supabase migrations.`);
