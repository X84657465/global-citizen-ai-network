import assert from "node:assert/strict";
import test from "node:test";
import { FPHostAdapter, FPHostError } from "../../lib/fp/host-adapter.ts";
import {
  registerFPGovernanceReviewCapability,
  type FPGovernanceReviewCapabilityInput,
} from "../../lib/fp/register-governance-review-capability.ts";

const candidateSha = "a".repeat(40);
const repository = "owner/repo";
const prPath = "/repos/owner/repo/pulls/42";
const reviewsPath = "/repos/owner/repo/pulls/42/reviews?per_page=100&page=1";
const permissionPath = "/repos/owner/repo/collaborators/reviewer-one/permission";

function context(authorized = true) {
  return {
    principal: {
      actorRef: "host-user:123",
      resourceRef: "workspace:456",
      authorized,
      approved: false,
    },
    correlationId: "request-123",
    now: () => new Date("2026-11-22T12:00:00.000Z"),
  };
}

function review() {
  return {
    id: 7,
    commit_id: candidateSha,
    state: "APPROVED",
    submitted_at: "2026-11-22T11:00:00Z",
    user: { login: "reviewer-one" },
  };
}

test("registers P review collection on the trusted host and returns verified read-only evidence", async () => {
  const calls: string[] = [];
  const api = {
    async request(path: string): Promise<unknown> {
      calls.push(path);
      if (path === prPath) {
        return {
          number: 42,
          state: "open",
          base: { ref: "main", repo: { full_name: repository } },
          head: { sha: candidateSha, repo: { full_name: repository } },
        };
      }
      if (path === reviewsPath) return [review()];
      if (path === permissionPath) return { permission: "write", role_name: "maintain" };
      throw new Error("Unexpected GitHub API request");
    },
  };

  const host = new FPHostAdapter();
  registerFPGovernanceReviewCapability({ host, api, repository });
  const result = await host.invoke<FPGovernanceReviewCapabilityInput, readonly ReturnType<typeof review> extends never ? never : import("../../lib/fp/governance-assurance.ts").FPGovernanceReviewEvidence[]>(
    {
      workstream: "P",
      capability: "collect-review-evidence",
      input: { pullRequestNumber: 42, candidateSha },
    },
    context(),
  );

  assert.equal(result.envelope.workstream, "P");
  assert.equal(result.envelope.capability, "collect-review-evidence");
  assert.equal(result.envelope.correlationId, "request-123");
  assert.equal(result.envelope.payload.length, 1);
  assert.equal(result.envelope.payload[0].reviewerAuthorizationStatus, "verified");
  assert.equal(result.envelope.payload[0].reviewerAuthorizationRef,
    "github:owner/repo:collaborator-permission:reviewer-one:maintain");
  assert.deepEqual(calls, [prPath, reviewsPath, permissionPath]);
});

test("trusted-host denial prevents all GitHub reads", async () => {
  let calls = 0;
  const host = new FPHostAdapter();
  registerFPGovernanceReviewCapability({
    host,
    repository,
    api: { async request() { calls += 1; return null; } },
  });

  await assert.rejects(
    host.invoke(
      {
        workstream: "P",
        capability: "collect-review-evidence",
        input: { pullRequestNumber: 42, candidateSha },
      },
      context(false),
    ),
    (error: unknown) => error instanceof FPHostError && error.code === "UNAUTHORIZED",
  );
  assert.equal(calls, 0);
});

test("rejects invalid request identity before making GitHub requests", async () => {
  let calls = 0;
  const host = new FPHostAdapter();
  registerFPGovernanceReviewCapability({
    host,
    repository,
    api: { async request() { calls += 1; return null; } },
  });

  await assert.rejects(
    host.invoke(
      {
        workstream: "P",
        capability: "collect-review-evidence",
        input: { pullRequestNumber: 0, candidateSha: "invalid" },
      },
      context(),
    ),
    TypeError,
  );
  assert.equal(calls, 0);
});

test("binds repository identity at registration and rejects unsafe configuration", () => {
  const host = new FPHostAdapter();
  assert.throws(
    () => registerFPGovernanceReviewCapability({
      host,
      repository: "../repo",
      api: { async request() { return null; } },
    }),
    TypeError,
  );
});
