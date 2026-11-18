$ErrorActionPreference = "Stop"

$workspace = $env:GITHUB_WORKSPACE
$runnerTemp = $env:RUNNER_TEMP
if (-not $workspace -or -not $runnerTemp) { throw "GitHub workspace or runner temp path is unavailable." }

$imageDigest = "node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a"
$outputDir = Join-Path $runnerTemp ("agent-patch-sandbox-" + $env:GITHUB_RUN_ID)
$projectDir = Join-Path $outputDir "project"
$resultPath = Join-Path $outputDir "sandbox-validation.json"
$hostProjectDir = Join-Path $runnerTemp ("agent-patch-host-check-" + $env:GITHUB_RUN_ID)
$depsPath = Join-Path $workspace "node_modules"
$hostChecks = @()

try {
  if (Test-Path $outputDir) { Remove-Item $outputDir -Recurse -Force }
  if (Test-Path $hostProjectDir) { Remove-Item $hostProjectDir -Recurse -Force }
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
  if ($LASTEXITCODE -ne 0) { throw "Disposable patch application or in-container unit tests failed." }
  if (-not (Test-Path $resultPath)) { throw "Sandbox validation result was not created." }

  $result = Get-Content $resultPath -Raw | ConvertFrom-Json
  if ($result.success -ne $true -or $result.execution_enabled -ne $false -or $result.source_was_modified -ne $false) {
    throw "Sandbox result did not retain the required safety state."
  }

  # Copy only source files into a second scratch directory. The original checkout stays untouched.
  $copyArgs = @(
    $workspace, $hostProjectDir, "/E", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP",
    "/XD", ".git", "node_modules", "artifacts", ".next", ".vercel", "coverage"
  )
  & robocopy.exe @copyArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Unable to create the Windows static-check scratch copy (robocopy exit $LASTEXITCODE)." }

  $hostNodeModules = Join-Path $hostProjectDir "node_modules"
  $mklinkCommand = 'mklink /J "' + $hostNodeModules + '" "' + $depsPath + '"'
  & cmd.exe /c $mklinkCommand | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Unable to link locked dependencies into the Windows scratch copy." }

  Push-Location $hostProjectDir
  try {
    npx --no-install tsc --noEmit
    if ($LASTEXITCODE -ne 0) { throw "TypeScript validation failed against the patched Windows scratch copy." }
    $hostChecks += @{ name = "TypeScript"; passed = $true }

    npm run lint
    if ($LASTEXITCODE -ne 0) { throw "ESLint failed against the patched Windows scratch copy." }
    $hostChecks += @{ name = "ESLint"; passed = $true }
  } finally {
    Pop-Location
  }

  $result | Add-Member -NotePropertyName host_checks -NotePropertyValue $hostChecks -Force
  $result.success = $true
  $result.execution_enabled = $false
  $result.source_was_modified = $false
  $result | ConvertTo-Json -Depth 10 | Set-Content -Path $resultPath -Encoding UTF8

  $artifactDir = Join-Path $workspace "artifacts"
  New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
  Copy-Item $resultPath (Join-Path $artifactDir "sandbox-validation.json") -Force

  Write-Host "PASS: unit tests ran in network-isolated Docker scratch space."
  Write-Host "PASS: TypeScript and ESLint passed against a separate Windows scratch copy."
  Write-Host "PASS: source repository remained unchanged."
} catch {
  if (Test-Path $resultPath) {
    try {
      $failedResult = Get-Content $resultPath -Raw | ConvertFrom-Json
      $failedResult.success = $false
      $failedResult.error = $_.Exception.Message
      $failedResult | Add-Member -NotePropertyName host_checks -NotePropertyValue $hostChecks -Force
      $artifactDir = Join-Path $workspace "artifacts"
      New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
      $failedResult | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $artifactDir "sandbox-validation.json") -Encoding UTF8
    } catch {
      Write-Host "Unable to write the sandbox failure artifact."
    }
  }
  throw
} finally {
  if (Test-Path $projectDir) { Remove-Item $projectDir -Recurse -Force }
  if (Test-Path $hostProjectDir) { Remove-Item $hostProjectDir -Recurse -Force }
}
