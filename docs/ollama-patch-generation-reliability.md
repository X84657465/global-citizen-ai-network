# Ollama Patch Generation Reliability

## Failure evidence from 2026-11-18

Two task-worker runs were inspected from their full GitHub Actions job logs:

- Run 57 (17:55:00Z–17:58:56Z), issue #71: plan generation, patch generation, 97 unit tests, TypeScript, and ESLint completed. Draft PR publication failed with HTTP 403: `GitHub Actions is not permitted to create or approve pull requests.`
- Run 58 (17:59:25Z–18:03:49Z), issue #72: the selected local model was `qwen3:8b`; plan and patch generation completed; all 97 unit tests passed. TypeScript then rejected the generated `app/workspace/workspace-client.tsx` at line 102, column 17 with `TS1005: '}' expected`.

The second run's preserved patch artifact showed the replacement file ended mid-expression (`} & Api,`) rather than being a complete TypeScript module. The failure was in generated source completeness, not an Ollama connection timeout or plan JSON validation. The run log did not expose Ollama's `done_reason`, so the original token-cap hypothesis cannot be proven retrospectively.

## Guardrails added

- Increase Ollama patch generation's `num_predict` from 2,048 to 6,144 tokens to provide more output room for complete replacement files.
- Inspect Ollama's `done_reason`; explicitly reject a response that reports `length`, and log the model, completion reason, and generated token count for diagnosis.
- Keep the existing isolated validation gate: unit tests, TypeScript, and ESLint must all pass before a Draft PR can be published. A malformed patch remains confined to the disposable scratch workspace and is not published.

## Repository permission blocker

Run 57 is a separate repository configuration issue. A workflow job's `pull-requests: write` permission is not sufficient while the repository setting blocks Actions from creating pull requests. A repository administrator must enable:

**Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**

No workflow code can safely override that repository-level setting. Until it is enabled, successful candidate validation can still end in a 403 at Draft PR publication.
