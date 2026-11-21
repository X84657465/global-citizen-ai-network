const UNIT_TEST_PATH = /^tests\\/.+\\.(?:test|spec)\\.ts$/i;
const NODE_TEST_IMPORT = /(?:from\\s*["']node:test["']|import\\s*["']node:test["'])/;
const UNSUPPORTED_TEST_API = /\\b(?:jest|vi)\\s*\\./;
const PLAYWRIGHT_TEST_IMPORT = /from\\s*["']@playwright\\/(?:test|experimental-ct[^"']*)["']/;

const JSX_PATTERNS = [
  /<[A-Za-z][A-Za-z0-9_.-]*(?:\\s+[^<>]*?)?\\s*\\/>/,
  /<\\/[A-Za-z][A-Za-z0-9_.-]*\\s*>/,
  /<[A-Za-z][A-Za-z0-9_.-]*\\s+[^<>]*>/,
  /<>|<\\/>/,
];

/**
 * The repository's unit-test runner executes .test.ts/.spec.ts with Node's
 * built-in type stripping; it does not compile JSX or run Jest/Vitest/Playwright.
 * Return a stable diagnostic before an invalid AI-generated test reaches sandboxing.
 */
export function getGeneratedTestContractViolation(path, content) {
  if (typeof path !== "string" || !UNIT_TEST_PATH.test(path)) return null;
  if (typeof content !== "string") return "Generated unit-test content must be text.";

  if (JSX_PATTERNS.some((pattern) => pattern.test(content))) {
    return "JSX is not supported in .ts unit tests; use the repository's Node test contract without JSX.";
  }
  if (PLAYWRIGHT_TEST_IMPORT.test(content)) {
    return "Playwright test APIs are not executed by the repository's Node unit-test runner.";
  }
  if (UNSUPPORTED_TEST_API.test(content)) {
    return "Jest/Vitest APIs are not supported; use node:test and node:assert/strict.";
  }
  if (!NODE_TEST_IMPORT.test(content)) {
    return "Generated .test.ts/.spec.ts files must use Node's built-in node:test runner.";
  }

  return null;
}
