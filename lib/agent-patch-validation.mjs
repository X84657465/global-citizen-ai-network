export class PatchValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PatchValidationError";
  }
}

const MAX_FILES = 20;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const ALLOWED_ROOTS = new Set(["app", "components", "lib", "tests", "docs"]);

function reject(message) {
  throw new PatchValidationError(message);
}

function validatePath(path) {
  if (typeof path !== "string" || path.length === 0 || path.length > 240) {
    reject("Patch path is invalid or too long.");
  }
  if (path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
    reject("Absolute paths and backslashes are prohibited.");
  }

  const segments = path.split("/");
  if (segments.length < 2 || segments.some((part) => !part || part === "." || part === "..")) {
    reject("Path traversal or empty path segments are prohibited.");
  }
  if (!ALLOWED_ROOTS.has(segments[0])) reject("Patch path root is outside the allowed roots.");

  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (
      lower.startsWith(".") ||
      lower.includes("secret") ||
      lower.includes("credential") ||
      lower.startsWith(".env") ||
      ["node_modules", ".git", ".github", "supabase"].includes(lower) ||
      !/^[A-Za-z0-9._-]+$/.test(segment)
    ) {
      reject("Patch path contains a prohibited segment.");
    }
  }
}

export function validatePatchManifest(manifest, task, existingPaths) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    reject("Patch manifest must be an object.");
  }
  if (Object.keys(manifest).sort().join(",") !== "files,schema_version") {
    reject("Patch manifest contains missing or unexpected top-level fields.");
  }
  if (manifest.schema_version !== 1) reject("Unsupported patch manifest schema version.");
  if (!task || task.schema_version !== 1 || !Array.isArray(task.allowed_paths)) {
    reject("A validated task with an explicit path allowlist is required.");
  }
  if (!Array.isArray(existingPaths)) reject("Existing repository paths must be supplied.");

  const existing = new Set(existingPaths.map((path) => String(path).toLowerCase()));
  if (!Array.isArray(manifest.files) || manifest.files.length === 0 || manifest.files.length > MAX_FILES) {
    reject(`Patch must contain between 1 and ${MAX_FILES} files.`);
  }

  const allowed = new Set(task.allowed_paths.map((path) => String(path).toLowerCase()));
  const seen = new Set();
  let totalBytes = 0;

  const files = manifest.files.map((file) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) reject("Each patch file must be an object.");
    if (Object.keys(file).sort().join(",") !== "content,operation,path") {
      reject("Patch file contains missing or unexpected fields.");
    }

    validatePath(file.path);
    const normalized = file.path.toLowerCase();
    if (!allowed.has(normalized)) reject(`Patch path was not explicitly authorized by the task: ${file.path}`);
    if (seen.has(normalized)) reject(`Duplicate patch path: ${file.path}`);
    seen.add(normalized);

    if (!["add", "modify"].includes(file.operation)) reject("Only add and modify operations are supported.");
    if (file.operation === "add" && existing.has(normalized)) reject("An add operation cannot replace an existing file.");
    if (file.operation === "modify" && !existing.has(normalized)) reject("A modify operation must target an existing file.");

    if (typeof file.content !== "string" || file.content.length === 0) reject("Patch content must be a non-empty text string.");
    if (file.content.includes("\0")) reject("Binary or NUL-containing content is not supported.");

    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes > MAX_FILE_BYTES) reject("A patch file exceeds the 64 KiB limit.");
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) reject("The complete patch exceeds the 256 KiB limit.");

    return { path: file.path, operation: file.operation, content: file.content };
  });

  return {
    schema_version: 1,
    files,
    safety: {
      task_path_allowlist_enforced: true,
      no_deletions_supported: true,
      no_binary_files_supported: true,
      max_file_bytes: MAX_FILE_BYTES,
      max_total_bytes: MAX_TOTAL_BYTES,
    },
  };
}
