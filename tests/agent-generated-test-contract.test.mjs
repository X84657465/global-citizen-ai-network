import assert from "node:assert/strict";
import test from "node:test";
import { getGeneratedTestContractViolation } from "../lib/agent-generated-test-contract.mjs";
import { validatePatchManifest } from "../lib/agent-patch-validation.mjs";

test("accepts repository-native Node unit tests", () => {
  const source = [
    'import test from "node:test";',
    'import assert from "node:assert/strict";',
    'test("works", () => assert.equal(1 + 1, 2));',
  ].join("\n");
  assert.equal(getGeneratedTestContractViolation("tests/example.test.ts", source), null);
});

test("rejects JSX in TypeScript unit tests before sandbox execution", () => {
  const source = [
    'import { test } from "node:test";',
    'page.mount(<ContributionTaskList />);',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/contribution-task-filters.test.ts", source),
    /JSX is not supported/,
  );
});

test("rejects unsupported test runners and Playwright component APIs", () => {
  assert.match(
    getGeneratedTestContractViolation("tests/example.test.ts", 'import { test } from "node:test"; jest.fn();'),
    /Jest\/Vitest APIs/,
  );
  assert.match(
    getGeneratedTestContractViolation("tests/example.test.ts", 'import { test } from "@playwright/test";'),
    /Playwright test APIs/,
  );
  assert.match(
    getGeneratedTestContractViolation("tests/example.test.ts", "assert.equal(1, 1);"),
    /must use Node's built-in node:test/,
  );
});

test("does not mistake HTML strings and TypeScript generics for JSX", () => {
  const source = [
    'import test from "node:test";',
    'const html = "<div><span>safe</span></div>";',
    'const identity = <T,>(value: T): T => value;',
  ].join("\n");
  assert.equal(getGeneratedTestContractViolation("tests/example.test.ts", source), null);
});

test("patch validation rejects invalid generated tests before sandboxing", () => {
  const task = {
    schema_version: 1,
    allowed_paths: ["tests/contribution-task-filters.test.ts"],
  };
  const patch = {
    schema_version: 1,
    files: [{
      path: "tests/contribution-task-filters.test.ts",
      operation: "add",
      content: 'import { test } from "node:test"; page.mount(<ContributionTaskList />);',
    }],
  };
  assert.throws(
    () => validatePatchManifest(patch, task, []),
    /JSX is not supported/,
  );
});

test("does not impose the unit-test contract on non-test or non-TypeScript files", () => {
  assert.equal(getGeneratedTestContractViolation("app/page.tsx", "export default () => <main />;"), null);
  assert.equal(getGeneratedTestContractViolation("tests/example.test.mjs", "jest.fn();"), null);
});


test("does not accept fake node:test imports in comments or string literals", () => {
  const commentOnly = [
    '// import test from "node:test";',
    `const example = String.raw\`import test from "node:test";\`;`,
    'test("not actually imported", () => {});',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/fake-import.test.ts", commentOnly),
    /must use Node's built-in node:test/,
  );
});

test("does not accept fake Playwright or Jest APIs in comments and strings", () => {
  const source = [
    'import test from "node:test";',
    '// import { test } from "@playwright/test";',
    'const example = "jest.fn()";',
  ].join("\n");
  assert.equal(getGeneratedTestContractViolation("tests/fake-runner.test.ts", source), null);
});

test("accepts constrained TypeScript generic arrow functions", () => {
  const source = [
    'import test from "node:test";',
    'const identity = <T extends object>(value: T): T => value;',
  ].join("\n");
  assert.equal(getGeneratedTestContractViolation("tests/generic.test.ts", source), null);
});


test("checks executable template expressions but ignores template text", () => {
  const source = [
    'import test from "node:test";',
    'const example = \`plain template text jest.fn()\`;',
    'const value = \`\${jest.fn()}\`;',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/template-expression.test.ts", source),
    /Jest\/Vitest APIs/,
  );
});


test("checks nested executable template expressions with block braces", () => {
  const source = [
    'import test from "node:test";',
    'const value = \`\${(() => { return jest.fn(); })()}\`;',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/nested-template.test.ts", source),
    /Jest\/Vitest APIs/,
  );
});

test("checks nested template literals inside executable expressions", () => {
  const source = [
    'import test from "node:test";',
    'const value = \`\${(() => \`\${jest.fn()}\`)()}\`;',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/nested-template-literal.test.ts", source),
    /Jest\/Vitest APIs/,
  );
});

test("does not inspect inert nested template text or string braces as executable code", () => {
  const source = [
    'import test from "node:test";',
    'const value = \`\${(() => { const text = "jest.fn() }"; return text; })()}\`;',
    'const example = \`plain template jest.fn() text\`;',
  ].join("\n");
  assert.equal(getGeneratedTestContractViolation("tests/inert-template.test.ts", source), null);
});


test("rejects dynamically imported and CommonJS Playwright runners", () => {
  const dynamicImport = [
    'import test from "node:test";',
    'const runner = await import("@playwright/test");',
  ].join("\n");
  const commonJsImport = [
    'import test from "node:test";',
    'const runner = require("@playwright/test");',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/dynamic-playwright.test.ts", dynamicImport),
    /Playwright test APIs/,
  );
  assert.match(
    getGeneratedTestContractViolation("tests/require-playwright.test.ts", commonJsImport),
    /Playwright test APIs/,
  );
});


test("checks executable template code after regex literals containing closing braces", () => {
  const source = [
    'import test from "node:test";',
    'const value = \`\${(() => { const matcher = /}/; return jest.fn(); })()}\`;',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/regex-brace-template.test.ts", source),
    /Jest\/Vitest APIs/,
  );
});

test("keeps regex character-class braces inside the template expression", () => {
  const source = [
    'import test from "node:test";',
    'const value = \`\${(() => { const matcher = /[{}]/; return jest.fn(); })()}\`;',
  ].join("\n");
  assert.match(
    getGeneratedTestContractViolation("tests/regex-character-class-template.test.ts", source),
    /Jest\/Vitest APIs/,
  );
});
