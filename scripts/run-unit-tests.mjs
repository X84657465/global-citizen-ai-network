import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collectTestFiles(directory) {
  return readdirSync(directory)
    .sort()
    .flatMap((entry) => {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) return collectTestFiles(path);
      return /\.test\.(?:mjs|js|ts)$/.test(entry) ? [path] : [];
    });
}

const databaseIntegrationTests = new Set(["tests/security/two-member-rls.test.mjs"]);
const e2eOnlyOracleTests = new Set(["tests/factory-local-loop-e2e-oracle.test.mjs"]);
const discoveredTestFiles = collectTestFiles("tests").map((path) => path.split(String.fromCharCode(92)).join("/")).sort();
const testFiles = discoveredTestFiles.filter((path) =>
  !databaseIntegrationTests.has(path) && !e2eOnlyOracleTests.has(path)
);
const deferredDatabaseTests = discoveredTestFiles.filter((path) => databaseIntegrationTests.has(path));
const deferredE2eOracleTests = discoveredTestFiles.filter((path) => e2eOnlyOracleTests.has(path));
if (deferredDatabaseTests.length > 0) {
  console.log("Database-backed integration tests are executed by the isolated Supabase CI job: " + deferredDatabaseTests.join(", "));
}
if (testFiles.length === 0) {
  console.error("No unit test files were found under tests/.");
  process.exitCode = 1;
} else {
  console.log(`Running all ${testFiles.length} discovered unit test files.`);
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--experimental-transform-types", "--test", ...testFiles],
    { stdio: "inherit" }
  );
  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
