import assert from "node:assert/strict";
import test from "node:test";
import { getGeneratedTestContractViolation } from "../lib/agent-generated-test-contract.mjs";

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
  ].join("\\n");
  assert.equal(getGeneratedTestContractViolation("tests/example.test.ts", source), null);
});

test("does not impose the unit-test contract on non-test or non-TypeScript files", () => {
  assert.equal(getGeneratedTestContractViolation("app/page.tsx", "export default () => <main />;"), null);
  assert.equal(getGeneratedTestContractViolation("tests/example.test.mjs", "jest.fn();"), null);
});
