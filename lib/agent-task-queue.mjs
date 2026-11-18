import { validateAndBuildTask } from "./agent-task-validation.mjs";

export const TASK_RETRY_LABEL = "ai-task-retry-1";
export const TASK_SKIPPED_LABEL = "ai-task-skipped";

const PRIORITY_ORDER = [
  17, 3, 71, 94, 81, 97, 95, 72, 73, 74, 75, 96, 76, 86, 82, 83, 84, 85,
  87, 88, 89, 90, 92, 91, 93,
];

const priorityRank = new Map(PRIORITY_ORDER.map((number, index) => [number, index]));

function labelsOf(issue) {
  return new Set((Array.isArray(issue.labels) ? issue.labels : [])
    .map((label) => typeof label === "string" ? label : label?.name)
    .filter(Boolean));
}

function comparePriority(a, b) {
  const rankA = priorityRank.get(a.number) ?? Number.MAX_SAFE_INTEGER;
  const rankB = priorityRank.get(b.number) ?? Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) return rankA - rankB;
  return a.number - b.number;
}

export function selectNextQueuedTask(issues, pulls, repository) {
  const owner = repository.split("/")[0]?.toLowerCase();
  const alreadyPublished = new Set();

  for (const pull of pulls) {
    const match = typeof pull.body === "string"
      ? pull.body.match(/<!-- ai-task:(\d+) -->/)
      : null;
    if (match && (pull.state === "open" || pull.merged === true)) {
      alreadyPublished.add(Number(match[1]));
    }
  }

  const eligible = [];
  const blocked = [];

  for (const issue of issues) {
    if (
      issue.pull_request ||
      issue.state !== "open" ||
      issue.user?.login?.toLowerCase() !== owner ||
      typeof issue.title !== "string" ||
      !issue.title.startsWith("[AI Task]") ||
      alreadyPublished.has(issue.number)
    ) continue;

    const labels = labelsOf(issue);
    if (labels.has(TASK_SKIPPED_LABEL)) continue;

    try {
      validateAndBuildTask(issue, repository);
      eligible.push({ issue, retry: labels.has(TASK_RETRY_LABEL) });
    } catch (error) {
      blocked.push({
        number: issue.number,
        reason: error instanceof Error ? error.message : "Task specification is invalid.",
      });
    }
  }

  const fresh = eligible.filter((item) => !item.retry).map((item) => item.issue).sort(comparePriority);
  const retries = eligible.filter((item) => item.retry).map((item) => item.issue).sort(comparePriority);

  return {
    selected: fresh[0] ?? retries[0] ?? null,
    blocked,
    eligible_count: eligible.length,
    retry_count: retries.length,
  };
}
