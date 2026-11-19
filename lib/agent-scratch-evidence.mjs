import { createHash } from "node:crypto";

function digestContent(content) {
  if (typeof content !== "string" || content.length === 0 || content.includes("\0")) {
    throw new TypeError("Scratch patch evidence requires non-empty text content.");
  }
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function buildScratchPatchEvidence(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new TypeError("A non-empty validated patch file list is required.");
  }
  return files.map((file) => ({
    path: file.path,
    operation: file.operation,
    bytes: Buffer.byteLength(file.content, "utf8"),
    sha256: digestContent(file.content),
  })).sort((a, b) => a.path.localeCompare(b.path));
}

export function scratchPatchEvidenceMatches(scratchFiles, validatedFiles) {
  if (!Array.isArray(scratchFiles) || !Array.isArray(validatedFiles) ||
      scratchFiles.length !== validatedFiles.length) return false;
  let expected;
  try {
    expected = buildScratchPatchEvidence(validatedFiles);
  } catch {
    return false;
  }
  const actual = scratchFiles.map((file) => ({
    path: file?.path,
    operation: file?.operation,
    bytes: file?.bytes,
    sha256: file?.sha256,
  })).sort((a, b) => String(a.path).localeCompare(String(b.path)));
  return actual.every((file) =>
    typeof file.path === "string" &&
    ["add", "modify"].includes(file.operation) &&
    Number.isInteger(file.bytes) && file.bytes > 0 &&
    typeof file.sha256 === "string" && /^[a-f0-9]{64}$/.test(file.sha256)
  ) && JSON.stringify(actual) === JSON.stringify(expected);
}
