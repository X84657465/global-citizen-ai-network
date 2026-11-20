import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveSafeExistingParent } from "../lib/agent-path-safety.mjs";

function withTemporaryRoot(run) {
  const root = mkdtempSync(join(tmpdir(), "gcan-safe-parent-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("allows a new nested file when its nearest existing parent is inside the repository", () => {
  withTemporaryRoot((root) => {
    const existingParent = join(root, "components");
    mkdirSync(existingParent);
    const target = join(root, "components", "projects", "project-list.tsx");
    assert.equal(resolveSafeExistingParent(target, root), realpathSync(existingParent));
    assert.equal(existsSync(target), false);
  });
});

test("rejects a planned path outside the repository root", () => {
  withTemporaryRoot((root) => {
    assert.throws(
      () => resolveSafeExistingParent(join(root, "..", "outside", "new.ts"), root),
      /outside the repository/,
    );
  });
});

test("rejects a regular file used as a parent directory", () => {
  withTemporaryRoot((root) => {
    const parentFile = join(root, "not-a-directory");
    writeFileSync(parentFile, "file");
    assert.throws(
      () => resolveSafeExistingParent(join(parentFile, "child.ts"), root),
      /not a directory/,
    );
  });
});

test("rejects symbolic-link parent segments when the platform permits creating them", (t) => {
  withTemporaryRoot((root) => {
    const outside = mkdtempSync(join(tmpdir(), "gcan-outside-parent-"));
    const link = join(root, "linked");
    try {
      try {
        symlinkSync(outside, link, "junction");
      } catch {
        t.skip("The current Windows account cannot create a directory junction.");
        return;
      }
      assert.throws(
        () => resolveSafeExistingParent(join(link, "new.ts"), root),
        /symbolic link/,
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
