# Factory Kilo free-model bridge

**Status:** opt-in integration candidate; not enabled on the default Factory path.

This bridge exposes the Our Free Model standalone service's OpenAI-compatible Kilo free channel through the Ollama HTTP contract already used by Factory planning and patch generation. It does not change the Factory generator scripts, task state machine, Runner concurrency, scratch isolation, patch validator, CI gates, or PR publisher.

## Scope and upstream restrictions

- Use the Kilo public free channel only. The default model is `kilo-auto/free`; `OFM_MODEL` may select another model whose ID begins with `kilo-` or `kilo/`.
- OpenCode anonymous/free-lane model IDs are deliberately rejected. Do not spoof another product's client identity or bypass an upstream's client restrictions.
- Kilo free service availability, model routing and quotas are controlled by Kilo and may change. "Free" does not mean unlimited or guaranteed availability.
- The upstream documentation warns that Kilo free-pool prompts may be recorded to improve its service. Do not send secrets, credentials, personal data, production data, or confidential source code unless the project owner has explicitly accepted that disclosure risk.
- The third-party Our Free Model service is not a sandbox. Review and pin its source before running it. This bridge only accepts a loopback upstream URL and listens on loopback; it does not expose a LAN endpoint.

## Start the upstream service

The upstream repository currently documents its standalone service as source-run only; a standalone installation artifact is not yet published. It requires Node.js `^22.19.0 || >=24.0.0` (the Factory workflow's pinned Node 22.13 runtime is too old to host it).

1. Review and pin the upstream source revision before use: `Ebony-Vinyl/dsh-our-free-model`, commit `8f3182b78938344436cc50c34dbfe947136cce9f`.
2. In a separate PowerShell session on the trusted Windows self-hosted Runner host, run the upstream standalone service from its full repository checkout:

   ```powershell
   npm run start:standalone -- --port 18900 --data-dir "$env:USERPROFILE\.our-free-model-factory"
   ```

3. Complete local setup in the service's own management page. Read the generated `forwardKey` from that local data directory's `settings.json`; never commit it or paste it into an Issue, PR, log, or chat.

## Start the bridge

In a second PowerShell session on the same host, set the key in the process environment (do not place the literal key in shell history or source control), then start the bridge:

```powershell
$settings = Get-Content "$env:USERPROFILE\.our-free-model-factory\settings.json" -Raw | ConvertFrom-Json
$env:OFM_API_KEY = $settings.forwardKey
$env:OFM_BASE_URL = "http://127.0.0.1:18900/v1"
$env:OFM_MODEL = "kilo-auto/free"
$env:OFM_BRIDGE_PORT = "11435"
node scripts/ollama-ofm-bridge.mjs
```

The bridge validates that the upstream URL is loopback, the selected model is from the Kilo channel, and the listener is loopback-only. It never prints the API key.

## Connect Factory

Set `OLLAMA_BASE_URL=http://127.0.0.1:11435` in the trusted self-hosted Runner service environment, then restart that Runner service so new jobs inherit it. Keep the existing Ollama daemon on port 11434; the CI quality job and local Ollama smoke checks explicitly continue to use 11434. Factory's plan and patch generators use `OLLAMA_BASE_URL`, so they can use the bridge without changing their existing validation and scratch-execution gates.

To return to local Ollama, remove the Runner-level `OLLAMA_BASE_URL` override and restart the Runner service. The default remains `http://127.0.0.1:11434`.

## Verification and acceptance

- Run `node --test tests/ollama-ofm-bridge.test.mjs` on the Runner host.
- Confirm `GET http://127.0.0.1:11435/api/tags` lists only the configured Kilo model.
- Confirm a planning request and a patch-generation request complete through the bridge.
- Confirm generated patches still pass the existing patch-manifest validator and disposable scratch tests.
- Record the exact model ID, upstream service revision, bridge revision, test output, and exact CI run/attempt/SHA.
- Keep this integration opt-in until the exact-head CI is terminal and an independent GPT3 review is recorded. No CI bypass, automatic merge, deployment, or change to Factory authorization is part of this integration.
