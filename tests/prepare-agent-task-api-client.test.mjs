import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/prepare-agent-task.mjs", import.meta.url), "utf8");

test("task preparation uses the shared GitHub API client and configured API endpoint", () => {
  assert.match(source, /import \{ createGitHubApiClient \} from "\.\.\/lib\/github-api-client\.mjs"/);
  assert.match(source, /baseUrl: process\.env\.GITHUB_API_URL \|\| undefined/);
  assert.match(source, /createGitHubApiClient\(\{[\s\S]*?token,[\s\S]*?\}\)/);
  assert.match(source, /githubApi\.request\("\/repos\/" \+ repository \+ "\/issues\/" \+ issueNumber\)/);
  assert.doesNotMatch(source, /await fetch\(/);
});

test("task preparation routes API failures through the shared cooldown-aware failure handler", () => {
  assert.match(source, /catch \(error\) \{[\s\S]*?const status = Number\(error\?\.status\) \|\| 0;[\s\S]*?fail\("GitHub issue lookup failed/);
  assert.match(source, /if \(error\?\.rateLimited === true\)[\s\S]*?persistApiCooldownDeadline\(error\)/);
});
