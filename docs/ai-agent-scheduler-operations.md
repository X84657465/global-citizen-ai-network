## AI Task Runbook for Scheduled AI Task Worker

### 1. Submitting a Safe Task
To submit a safe task, create an issue with the title format `[AI Task] <task description>` and ensure the task is self-contained, does not involve production deployment, database mutation, or paid API usage. The task must be clearly defined and include all necessary instructions for the AI worker to execute safely.

### 2. 30-Minute Scheduler Behavior
The AI task scheduler runs every 30 minutes. It processes one task per cycle. If the Windows self-hosted runner is offline or not available, the task will not execute, and the scheduler will wait until the runner is online and available.

### 3. Runner Prerequisites and Dependencies
The Windows self-hosted runner must be online and available for the task to execute. The local environment must have Ollama and Docker installed and running. These dependencies are required for the AI task to execute successfully. If the runner is offline or the dependencies are not met, the task will not run.

### 4. Identifying Empty Queue or Waiting Run
If the queue is empty, the scheduler will wait until a task is added. You can check the status of the queue by reviewing the GitHub Actions runs. If a task is waiting, it will be listed as pending in the GitHub Actions interface. Ensure the runner is online and the dependencies are met to avoid delays.

### 5. Reviewing the Resulting Draft PR
After the task completes, a Draft PR will be created. To review the Draft PR, navigate to the GitHub repository, locate the Draft PR, and review the changes without merging or deploying. Ensure that no production deployment, database mutation, or automatic merge is performed.

### Key Requirements and Verified Behavior
- **Verified Behavior**: The AI task scheduler runs every 30 minutes, processes one task per cycle, and requires the Windows self-hosted runner and local Ollama/Docker dependencies to be online and available.
- **Requirements**: No production deployment, database mutation, paid API, or automatic merge is performed. The local Windows runner must be verified as online to ensure background execution is active.

### Non-Technical Steps to Inspect GitHub Actions Runs
1. Navigate to the GitHub repository.
2. Go to the Actions tab.
3. Review the list of workflow runs to identify the AI task run.
4. Check the status of the run to determine if it is pending, in progress, or completed.
5. If the run is completed, review the output logs to ensure the task executed successfully.

### Reviewing a Draft PR
1. Navigate to the GitHub repository.
2. Go to the Pull Requests tab.
3. Locate the Draft PR created by the AI task.
4. Review the changes in the Draft PR without merging or deploying.
5. Ensure that no production deployment, database mutation, or automatic merge is performed.

### Final Notes
- The AI task worker does not perform any production deployment, database mutation, paid API calls, or automatic merges.
- The local Windows runner must be verified as online to ensure background execution is active.
- The AI task worker is designed to run safely and securely without affecting any production systems or environments.