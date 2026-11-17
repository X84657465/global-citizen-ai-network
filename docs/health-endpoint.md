# Health endpoint

`GET /api/health` is a lightweight deployment smoke check.

It reports whether required integration environment variables are present. It does not perform a database query, call an AI provider, expose secrets, or prove that credentials are valid. A configured status must never be interpreted as a successful integration test.

Expected initial response before provisioning:
- service status: ok
- database: not configured
- AI provider: mock
- AI: configured in local mock mode

Do not add detailed environment values, hostnames, keys, stack traces, or infrastructure identifiers to this public endpoint.
