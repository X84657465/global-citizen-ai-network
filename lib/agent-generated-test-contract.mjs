const UNIT_TEST_PATH = /^tests\/.+\.(?:test|spec)\.ts$/i;
const UNSUPPORTED_TEST_API = /\b(?:jest|vi)\s*\./;
const PLAYWRIGHT_TEST_MODULE = /^@playwright\/(?:test|experimental-ct[^/]*)$/;

const JSX_PATTERNS = [
  /<[A-Za-z][A-Za-z0-9_.-]*(?:\s+[^<>]*?)?\s*\/>/,
  /<\/[A-Za-z][A-Za-z0-9_.-]*\s*>/,
  /<>|<\/>/,
];

/**
 * Mask comments and string/template literals while retaining string tokens.
 * This prevents examples in comments/strings from satisfying executable-code
 * checks, while allowing import declarations to be resolved against literals.
 */
function maskNonCode(source) {
  const strings = [];
  let code = source
    .replace(/"(?:\\.|[^"\\])*"/g, (value) => {
      const token = "__GCAN_STRING_" + strings.length + "__";
      strings.push(value.slice(1, -1));
      return token;
    })
    .replace(/'(?:\\.|[^'\\])*'/g, (value) => {
      const token = "__GCAN_STRING_" + strings.length + "__";
      strings.push(value.slice(1, -1));
      return token;
    })
    .replace(/\x60(?:\\.|[^\x60\\])*\x60/gs, () => {
      const token = "__GCAN_STRING_" + strings.length + "__";
      strings.push("");
      return token;
    });

  code = code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\r\n]*/g, " ");

  return { code, strings };
}

function getImportedModules(code, strings) {
  const modules = [];
  const importPattern = /\b(?:from\s+|import\s+)(__GCAN_STRING_(\d+)__)/g;
  for (const match of code.matchAll(importPattern)) {
    const moduleName = strings[Number(match[2])];
    if (typeof moduleName === "string") modules.push(moduleName);
  }
  return modules;
}

/**
 * The repository's unit-test runner executes .test.ts/.spec.ts with Node's
 * built-in type stripping; it does not compile JSX or run Jest/Vitest/Playwright.
 * Return a stable diagnostic before an invalid AI-generated test reaches sandboxing.
 */
export function getGeneratedTestContractViolation(path, content) {
  if (typeof path !== "string" || !UNIT_TEST_PATH.test(path)) return null;
  if (typeof content !== "string") return "Generated unit-test content must be text.";

  const { code, strings } = maskNonCode(content);
  const importedModules = getImportedModules(code, strings);

  if (JSX_PATTERNS.some((pattern) => pattern.test(code))) {
    return "JSX is not supported in .ts unit tests; use the repository's Node test contract without JSX.";
  }
  if (importedModules.some((name) => PLAYWRIGHT_TEST_MODULE.test(name))) {
    return "Playwright test APIs are not executed by the repository's Node unit-test runner.";
  }
  if (UNSUPPORTED_TEST_API.test(code)) {
    return "Jest/Vitest APIs are not supported; use node:test and node:assert/strict.";
  }
  if (!importedModules.includes("node:test")) {
    return "Generated .test.ts/.spec.ts files must use Node's built-in node:test runner.";
  }

  return null;
}
