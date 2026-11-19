import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collectTestFiles(directory) {
  return readdirSync(directory)
    .sort()
    .flatMap((entry) => {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) return collectTestFiles(path);
      return /\.test\.(?:mjs|js|ts)$/.test(entry) ? [path.replaceAll("\\\\", "/")] : [];
    });
}

const testFiles = collectTestFiles("tests").sort();
if (testFiles.length === 0) {
  console.error("No unit test files were found under tests/.");
  process.exitCode = 1;
} else {
  console.log(`Running all ${testFiles.length} discovered unit test files.`);
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", ...testFiles],
    { stdio: "inherit" }
  );
  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
