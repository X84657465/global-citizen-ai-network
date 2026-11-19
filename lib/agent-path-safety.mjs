import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export function resolveSafeExistingParent(absolutePath, repositoryRoot) {
  if (typeof absolutePath !== "string" || typeof repositoryRoot !== "string") {
    throw new TypeError("An absolute target path and repository root are required.");
  }

  const root = realpathSync(repositoryRoot);
  const target = resolve(absolutePath);
  const parent = dirname(target);
  const relativeParent = relative(root, parent);

  if (
    relativeParent === ".." ||
    relativeParent.startsWith(".." + sep) ||
    isAbsolute(relativeParent)
  ) {
    throw new Error("Planned path parent resolves outside the repository.");
  }

  let cursor = root;
  for (const segment of relativeParent.split(sep).filter(Boolean)) {
    const next = resolve(cursor, segment);
    if (!existsSync(next)) break;

    const entry = lstatSync(next);
    if (entry.isSymbolicLink()) {
      throw new Error("A planned path parent contains a symbolic link.");
    }
    if (!entry.isDirectory()) {
      throw new Error("A planned path parent is not a directory.");
    }
    cursor = next;
  }

  const realParent = realpathSync(cursor);
  if (realParent !== root && !realParent.startsWith(root + sep)) {
    throw new Error("Planned path parent resolves outside the repository.");
  }
  return realParent;
}
