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
function skipQuoted(source, start, quote) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === quote) return index + 1;
    index += 1;
  }
  return source.length;
}

function canStartRegexLiteral(source, expressionStart, index) {
  const prefix = source.slice(expressionStart, index).trimEnd();
  if (!prefix) return true;
  const previous = prefix[prefix.length - 1];
  return "=(:,;!&|?{[+-*%^~<>".includes(previous) ||
    /\b(?:return|throw|case|delete|void|typeof|instanceof|in|of|yield|await|else|do)\s*$/.test(prefix) ||
    prefix.endsWith("=>");
}

function skipRegexLiteral(source, start) {
  let index = start + 1;
  let inCharacterClass = false;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "\n" || char === "\r") return start + 1;
    if (char === "[" && !inCharacterClass) {
      inCharacterClass = true;
    } else if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
    } else if (char === "/" && !inCharacterClass) {
      index += 1;
      while (/[a-z]/i.test(source[index] ?? "")) index += 1;
      return index;
    }
    index += 1;
  }
  return start + 1;
}

function skipTemplateExpression(source, start) {
  let depth = 1;
  let index = start;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "'" || char === '"') {
      index = skipQuoted(source, index, char);
      continue;
    }
    if (char === "\x60") {
      index = skipTemplateLiteral(source, index).end;
      continue;
    }
    if (char === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", index + 2);
      index = close === -1 ? source.length : close + 2;
      continue;
    }
    if (char === "/" && canStartRegexLiteral(source, start, index)) {
      const regexEnd = skipRegexLiteral(source, index);
      if (regexEnd > index + 1) {
        index = regexEnd;
        continue;
      }
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return { expression: source.slice(start, index), end: index + 1 };
    }
    index += 1;
  }
  return { expression: source.slice(start), end: source.length };
}

function skipTemplateLiteral(source, start) {
  const expressions = [];
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "\x60") return { expressions, end: index + 1 };
    if (char === "$" && source[index + 1] === "{") {
      const parsed = skipTemplateExpression(source, index + 2);
      expressions.push(parsed.expression);
      index = parsed.end;
      continue;
    }
    index += 1;
  }
  return { expressions, end: source.length };
}

function preserveExecutableTemplateExpressions(source) {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "'" || char === '"') {
      const end = skipQuoted(source, index, char);
      output += source.slice(index, end);
      index = end;
      continue;
    }
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index + 2);
      const stop = end === -1 ? source.length : end;
      output += source.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", index + 2);
      const end = close === -1 ? source.length : close + 2;
      output += source.slice(index, end);
      index = end;
      continue;
    }
    if (char === "\x60") {
      const parsed = skipTemplateLiteral(source, index);
      const expressions = parsed.expressions
        .map((expression) => preserveExecutableTemplateExpressions(expression));
      output += " " + expressions.join(" ") + " ";
      index = parsed.end;
      continue;
    }
    output += char;
    index += 1;
  }
  return output;
}

function maskNonCode(source) {
  const strings = [];
  // Ignore inert template text but recursively preserve executable \${...}
  // expressions, including nested blocks and nested template literals.
  const withTemplateExpressions = preserveExecutableTemplateExpressions(source);

  let code = withTemplateExpressions
    .replace(/"(?:\\.|[^"\\])*"/g, (value) => {
      const token = "__GCAN_STRING_" + strings.length + "__";
      strings.push(value.slice(1, -1));
      return token;
    })
    .replace(/'(?:\\.|[^'\\])*'/g, (value) => {
      const token = "__GCAN_STRING_" + strings.length + "__";
      strings.push(value.slice(1, -1));
      return token;
    });

  code = code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\r\n]*/g, " ");

  return { code, strings };
}

function getImportedModules(code, strings) {
  const modules = [];
  const modulePatterns = [
    /\b(?:from\s+|import\s+)\s*(__GCAN_STRING_(\d+)__)/g,
    /\bimport\s*\(\s*(__GCAN_STRING_(\d+)__)\s*\)/g,
    /\brequire\s*\(\s*(__GCAN_STRING_(\d+)__)\s*\)/g,
  ];
  for (const pattern of modulePatterns) {
    for (const match of code.matchAll(pattern)) {
      const moduleName = strings[Number(match[2])];
      if (typeof moduleName === "string") modules.push(moduleName);
    }
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
