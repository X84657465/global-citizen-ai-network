/**
 * G — exact-head integration and release-quality evidence.
 *
 * This pure evaluator consumes metadata collected from the repository's
 * trusted GitHub Actions API. It does not call GitHub, execute CI, mutate
 * branch protection, approve PRs, merge code, or deploy releases.
 */
export const G_REQUIRED_CI_JOBS = [
  "resolve-candidate",
  "quality",
  "build",
  "database",
] as const;

export type GRequiredJobId = (typeof G_REQUIRED_CI_JOBS)[number];
export type GJobConclusion = "success" | "failure" | "cancelled" | "skipped" | "timed_out" | "action_required" | "neutral";

export interface GJobEvidence {
  readonly jobId: string;
  readonly runAttempt: number;
  readonly status: "completed" | "in_progress" | "queued";
  readonly conclusion: GJobConclusion | null;
  readonly jobUrl: string;
}

export interface GExactRunEvidence {
  readonly runId: number;
  readonly runAttempt: number;
  readonly pullRequestNumber: number;
  readonly repository: string;
  readonly headRepository: string;
  readonly event: string;
  readonly baseRef: string;
  readonly headSha: string;
  readonly workflowPath: string;
  readonly status: "completed" | "in_progress" | "queued";
  readonly conclusion: GJobConclusion | null;
  readonly runUrl: string;
  readonly jobs: readonly GJobEvidence[];
}

export interface GAcceptanceBundle {
  readonly candidateRepository: string;
  readonly candidateSha: string;
  readonly pullRequestNumber: number;
  readonly run: GExactRunEvidence;
}

export type GJobAssessment =
  | { readonly jobId: GRequiredJobId; readonly status: "missing" }
  | { readonly jobId: GRequiredJobId; readonly status: "pending" }
  | { readonly jobId: GRequiredJobId; readonly status: "failed"; readonly conclusion: GJobConclusion }
  | { readonly jobId: GRequiredJobId; readonly status: "passed"; readonly jobUrl: string };

export interface GAcceptanceAssessment {
  readonly schemaVersion: "1";
  readonly candidateRepository: string;
  readonly candidateSha: string;
  readonly pullRequestNumber: number;
  readonly runId: number;
  readonly runAttempt: number;
  readonly status: "blocked" | "stale" | "incomplete" | "ready-for-review";
  readonly reason: string;
  readonly jobs: readonly GJobAssessment[];
  readonly passed: number;
  readonly failed: number;
  readonly missing: number;
  readonly pending: number;
  readonly acceptanceGranted: false;
  readonly mergeAuthorized: false;
  readonly deploymentAuthorized: false;
}

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_RUN_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+(?:\/attempts\/\d+)?$/;

const G_MAX_JOBS = 100;

function snapshotSafeRecord(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || !allowed.includes(key))) return null;
    const keySet = new Set(keys as string[]);
    if (required.some((key) => !keySet.has(key))) return null;

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function snapshotSafeArray(value: unknown, maximumLength: number): unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0 ||
        lengthDescriptor.value > maximumLength) return null;
    const length = lengthDescriptor.value as number;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 ||
        keys.some((key) => typeof key !== "string" ||
          (key !== "length" && !/^(0|[1-9]\d*)$/.test(key)))) return null;

    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      snapshot.push(descriptor.value);
    }
    return snapshot;
  } catch {
    return null;
  }
}
const GITHUB_JOB_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+\/job\/\d+$/;

function validPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * A complete result means the exact candidate has all required successful CI
 * jobs and may proceed to human review. It is never an approval or release.
 */
export function assessGExactHeadEvidence(bundle: GAcceptanceBundle): GAcceptanceAssessment {
  const candidate = snapshotSafeRecord(
    bundle,
    ["candidateRepository", "candidateSha", "pullRequestNumber", "run"],
    ["candidateRepository", "candidateSha", "pullRequestNumber", "run"],
  );
  if (
    !candidate ||
    typeof candidate.candidateRepository !== "string" ||
    typeof candidate.candidateSha !== "string" ||
    !REPOSITORY_PATTERN.test(candidate.candidateRepository) ||
    !SHA_PATTERN.test(candidate.candidateSha) ||
    typeof candidate.pullRequestNumber !== "number" ||
    !validPositiveInteger(candidate.pullRequestNumber)
  ) {
    throw new TypeError("Invalid G candidate repository, SHA, or pull request number.");
  }

  const run = snapshotSafeRecord(
    candidate.run,
    ["runId", "runAttempt", "pullRequestNumber", "repository", "headRepository", "event", "baseRef", "headSha", "workflowPath", "status", "conclusion", "runUrl", "jobs"],
    ["runId", "runAttempt", "pullRequestNumber", "repository", "headRepository", "event", "baseRef", "headSha", "workflowPath", "status", "conclusion", "runUrl", "jobs"],
  ) as unknown as GExactRunEvidence | null;
  if (!run) {
    throw new TypeError("Invalid G run record; expected plain own-data fields.");
  }
  const rawJobs = snapshotSafeArray(run.jobs, G_MAX_JOBS);
  if (rawJobs === null) {
    throw new TypeError("G jobs must be a bounded dense plain array with own data slots.");
  }
  const jobItems: GJobEvidence[] = [];
  for (const rawJob of rawJobs) {
    const job = snapshotSafeRecord(
      rawJob,
      ["jobId", "runAttempt", "status", "conclusion", "jobUrl"],
      ["jobId", "runAttempt", "status", "conclusion", "jobUrl"],
    ) as unknown as GJobEvidence | null;
    if (
      !job ||
      typeof job.jobId !== "string" ||
      !job.jobId ||
      typeof job.runAttempt !== "number" ||
      !validPositiveInteger(job.runAttempt) ||
      job.runAttempt !== run.runAttempt ||
      typeof job.status !== "string" ||
      !["completed", "in_progress", "queued"].includes(job.status) ||
      !(job.conclusion === null || (typeof job.conclusion === "string" &&
        ["success", "failure", "cancelled", "skipped", "timed_out", "action_required", "neutral"].includes(job.conclusion))) ||
      typeof job.jobUrl !== "string" ||
      !GITHUB_JOB_URL_PATTERN.test(job.jobUrl)
    ) {
      throw new TypeError("Invalid G GitHub Actions run evidence.");
    }
    jobItems.push(job);
  }

  if (
    !validPositiveInteger(run.runId) ||
    !validPositiveInteger(run.runAttempt) ||
    !validPositiveInteger(run.pullRequestNumber) ||
    typeof run.repository !== "string" ||
    typeof run.headRepository !== "string" ||
    typeof run.event !== "string" ||
    typeof run.baseRef !== "string" ||
    typeof run.headSha !== "string" ||
    typeof run.workflowPath !== "string" ||
    typeof run.status !== "string" ||
    !(run.conclusion === null || typeof run.conclusion === "string") ||
    typeof run.runUrl !== "string" ||
    !REPOSITORY_PATTERN.test(run.repository) ||
    !REPOSITORY_PATTERN.test(run.headRepository) ||
    !SHA_PATTERN.test(run.headSha) ||
    !GITHUB_RUN_URL_PATTERN.test(run.runUrl)
  ) {
    throw new TypeError("Invalid G GitHub Actions run evidence.");
  }

  const expectedRunUrl = `https://github.com/${run.repository}/actions/runs/${run.runId}`;
  const expectedRunAttemptUrl = `${expectedRunUrl}/attempts/${run.runAttempt}`;
  if (run.runUrl !== expectedRunAttemptUrl) {
    throw new TypeError("G run URL must identify the exact repository, run ID, and attempt.");
  }

  const expectedJobPrefix = `${expectedRunUrl}/job/`;
  const jobIds = new Set<string>();
  for (const job of jobItems) {
    if (jobIds.has(job.jobId)) throw new TypeError("Duplicate G CI job evidence.");
    if (!job.jobUrl.startsWith(expectedJobPrefix)) {
      throw new TypeError("G job URL does not belong to the candidate workflow run.");
    }
    jobIds.add(job.jobId);
  }

  const jobs: GJobAssessment[] = G_REQUIRED_CI_JOBS.map((jobId) => {
    const evidence = jobItems.find((item) => item.jobId === jobId);
    if (!evidence) return { jobId, status: "missing" };
    if (evidence.status !== "completed") return { jobId, status: "pending" };
    if (evidence.conclusion !== "success") {
      return {
        jobId,
        status: "failed",
        conclusion: evidence.conclusion ?? "neutral",
      };
    }
    return { jobId, status: "passed", jobUrl: evidence.jobUrl };
  });

  const failed = jobs.filter((job) => job.status === "failed").length;
  const missing = jobs.filter((job) => job.status === "missing").length;
  const pending = jobs.filter((job) => job.status === "pending").length;
  const passed = jobs.filter((job) => job.status === "passed").length;

  const identityMatches =
    run.repository === candidate.candidateRepository &&
    run.headRepository === candidate.candidateRepository &&
    run.pullRequestNumber === candidate.pullRequestNumber &&
    run.event === "pull_request" &&
    run.baseRef === "main" &&
    run.workflowPath === ".github/workflows/ci.yml" &&
    run.headSha.toLowerCase() === candidate.candidateSha.toLowerCase();

  const status = failed > 0
    ? "blocked"
    : !identityMatches
      ? "stale"
      : run.status !== "completed" || run.conclusion !== "success" || missing > 0 || pending > 0
        ? "incomplete"
        : "ready-for-review";

  const reason = failed > 0
    ? "One or more required CI jobs did not conclude successfully."
    : !identityMatches
      ? "Run identity, source repository, base branch, workflow, event, or exact candidate SHA does not match."
      : run.status !== "completed" || run.conclusion !== "success" || missing > 0 || pending > 0
        ? "The exact-head run or one or more required CI jobs are incomplete."
        : "All required exact-head CI jobs passed; independent review is still required.";

  return Object.freeze({
    schemaVersion: "1",
    candidateRepository: candidate.candidateRepository as string,
    candidateSha: candidate.candidateSha as string,
    pullRequestNumber: candidate.pullRequestNumber as number,
    runId: run.runId,
    runAttempt: run.runAttempt,
    status,
    reason,
    jobs: Object.freeze(jobs),
    passed,
    failed,
    missing,
    pending,
    acceptanceGranted: false,
    mergeAuthorized: false,
    deploymentAuthorized: false,
  });
}
