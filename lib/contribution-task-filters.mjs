export const UNSUBMITTED_FILTER = "__gcan_unsubmitted__";

/**
 * The contribution-task API returns submissions newest-first. Keep the first
 * row for each task so the filter reflects the member's latest submission.
 */
export function getLatestSubmissionByTask(submissions = []) {
  const latest = new Map();
  for (const submission of submissions) {
    if (
      submission &&
      typeof submission.task_id === "string" &&
      submission.task_id.length > 0 &&
      !latest.has(submission.task_id)
    ) {
      latest.set(submission.task_id, submission);
    }
  }
  return latest;
}

export function getContributionTaskFilterOptions(tasks = [], submissions = []) {
  const latest = getLatestSubmissionByTask(submissions);
  const taskIds = new Set(tasks.map((task) => task.id));

  const categories = [...new Set(
    tasks
      .map((task) => task.category)
      .filter((category) => typeof category === "string" && category.trim().length > 0),
  )].sort((left, right) => left.localeCompare(right));

  const submissionStatuses = [...new Set(
    [...latest.entries()]
      .filter(([taskId]) => taskIds.has(taskId))
      .map(([, submission]) => submission.status)
      .filter((status) => typeof status === "string" && status.trim().length > 0),
  )].sort((left, right) => left.localeCompare(right));

  return {
    categories,
    submissionStatuses,
    hasUnsubmitted: tasks.some((task) => !latest.has(task.id)),
  };
}

export function filterContributionTasks(tasks = [], submissions = [], filters = {}) {
  const latest = getLatestSubmissionByTask(submissions);
  const category = typeof filters.category === "string" ? filters.category : "";
  const submissionStatus = typeof filters.submissionStatus === "string"
    ? filters.submissionStatus
    : "";

  return tasks.filter((task) => {
    if (category && task.category !== category) return false;
    if (!submissionStatus) return true;

    const submission = latest.get(task.id);
    if (submissionStatus === UNSUBMITTED_FILTER) return !submission;
    return submission?.status === submissionStatus;
  });
}
