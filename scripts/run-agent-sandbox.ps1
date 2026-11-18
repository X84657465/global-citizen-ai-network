$ErrorActionPreference = "Stop"

$workspace = $env:GITHUB_WORKSPACE
$runnerTemp = $env:RUNNER_TEMP
if (-not $workspace -or -not $runnerTemp) { throw "GitHub workspace or runner temp path is unavailable." }

$imageDigest = "node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a"
$outputDir = Join-Path $runnerTemp ("agent-patch-sandbox-" + $env:GITHUB_RUN_ID)
$projectDir = Join-Path $outputDir "project"
$resultPath = Join-Path $outputDir "sandbox-validation.json"
$depsPath = Join-Path $workspace "node_modules"

if (Test-Path $outputDir) { Remove-Item $outputDir -Recurse -Force }
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
if (-not (Test-Path $depsPath)) { throw "Locked dependencies are not installed before sandbox validation." }

docker pull $imageDigest
if ($LASTEXITCODE -ne 0) { throw "Unable to prepare the pinned Node sandbox image." }

$inputMount = "type=bind,source=$workspace,target=/input,readonly"
$outputMount = "type=bind,source=$outputDir,target=/output"
$depsMount = "type=bind,source=$depsPath,target=/deps,readonly"

$dockerArgs = @(
  "run", "--rm", "--pull", "never",
  "--network", "none",
  "--read-only",
  "--cap-drop", "ALL",
  "--security-opt", "no-new-privileges",
  "--pids-limit", "128",
  "--memory", "3g",
  "--cpus", "2",
  "--user", "1000:1000",
  "--env", "HOME=/tmp/home",
  "--env", "CI=true",
  "--env", "npm_config_cache=/tmp/npm-cache",
  "--env", "npm_config_offline=true",
  "--tmpfs", "/tmp:rw,noexec,nosuid,size=512m,uid=1000,gid=1000",
  "--mount", $inputMount,
  "--mount", $outputMount,
  "--mount", $depsMount,
  "--workdir", "/input",
  $imageDigest,
  "node",
  "/input/scripts/apply-agent-patch-sandbox.mjs",
  "/input/artifacts/agent-task.json",
  "/input/artifacts/agent-plan.json",
  "/input/artifacts/agent-patch.json",
  "/output/project",
  "/deps",
  "/output/sandbox-validation.json"
)

& docker.exe @dockerArgs
if ($LASTEXITCODE -ne 0) { throw "Disposable patch application or in-container checks failed." }
if (-not (Test-Path $resultPath)) { throw "Sandbox validation result was not created." }

$result = Get-Content $resultPath -Raw | ConvertFrom-Json
if ($result.success -ne $true -or $result.execution_enabled -ne $false -or $result.source_was_modified -ne $false) {
  throw "Sandbox result did not retain the required safety state."
}

$artifactDir = Join-Path $workspace "artifacts"
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
Copy-Item $resultPath (Join-Path $artifactDir "sandbox-validation.json") -Force
if (Test-Path $projectDir) { Remove-Item $projectDir -Recurse -Force }

Write-Host "PASS: validated patch ran only in disposable Docker scratch space."
Write-Host "PASS: $($result.checks.Count) checks passed; source repository remained unchanged."
