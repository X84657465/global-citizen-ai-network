import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function findCssModules(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findCssModules(path);
    return entry.isFile() && entry.name.endsWith(".module.css") ? [path] : [];
  });
}

const forbiddenGlobalTags = /^(?:html|body|main|header|footer|table|thead|tbody|tr|td|th|button|input|select|textarea|a|p|h1|h2|ul|ol|li|section|article|nav)(?:\b|[.#:]|\[|[>+~])/;

test("CSS Modules do not declare unscoped global element selectors", () => {
  const files = findCssModules("app");
  assert.ok(files.length > 0, "expected at least one CSS Module under app/");

  for (const file of files) {
    const css = readFileSync(file, "utf8");
    const selectorBlocks = /(?:^|})\s*([^{}]+)\{/g;
    for (const match of css.matchAll(selectorBlocks)) {
      const selectorGroup = match[1].trim();
      if (!selectorGroup || selectorGroup.startsWith("@")) continue;

      for (const selector of selectorGroup.split(",")) {
        const normalized = selector.trim();
        assert.equal(
          forbiddenGlobalTags.test(normalized),
          false,
          `${file} contains an unscoped global selector: ${normalized}`,
        );
      }
    }
  }
});
