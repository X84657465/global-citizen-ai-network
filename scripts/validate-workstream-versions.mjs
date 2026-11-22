import { readFileSync } from "node:fs";
import { validateWorkstreamVersionContract } from "../lib/p/workstream-version-assurance.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const manifest = readJson("versions/manifest.json");
const packageJson = readJson("package.json");
const lockfile = readJson("package-lock.json");
const result = validateWorkstreamVersionContract({
  manifest,
  rootVersion: readFileSync("VERSION", "utf8").trim(),
  packageVersion: packageJson.version,
  lockfileVersion: lockfile.version,
  changelog: readFileSync("CHANGELOG.md", "utf8"),
  pChangelog: readFileSync("docs/p/CHANGELOG.md", "utf8"),
});

if (!result.valid) {
  console.error("A–P version governance validation failed:");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`A–P version governance valid: ${manifest.overall}; P ${manifest.tracks.P.version}.`);
}
