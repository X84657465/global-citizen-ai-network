# Application API

All data endpoints require a valid Supabase session. They use the publishable key with the signed-in user's cookie session; row-level security remains the database authorization boundary. The service-role key is not used by these routes.

## Health

- `GET /api/health`: reports application status and whether integration variables are present. It does not test credentials or connectivity.

## Authentication

- `POST /api/auth/signup`: server-gated email registration. Disabled unless `ENABLE_PUBLIC_SIGNUP=true`; Supabase dashboard sign-ups must also be enabled intentionally.
- `GET /auth/callback`: verifies email confirmation code and creates the session.
- `POST /auth/signout`: clears the current session.
- `GET /account`: server-verified private member profile.

## Projects

- `GET /api/projects`: list up to 100 projects owned by the current member.
- `POST /api/projects`: create a project.

Request:
```json
{ "title": "Research workspace", "description": "Optional description" }
```

- `PATCH /api/projects/:id`: update title and/or description for an owned project.
- `DELETE /api/projects/:id`: delete an owned project.

## Conversations and messages

- `GET /api/conversations`: list up to 100 conversations owned by the current member.
- `POST /api/conversations`: create a conversation; optional `project_id` must belong to the current member.

Request:
```json
{ "title": "New conversation", "project_id": null }
```

- `GET /api/conversations/:id/messages`: read up to 500 messages in an owned conversation.
- `POST /api/conversations/:id/messages`: append a user message (1–20,000 characters).

Request:
```json
{ "content": "Please compare these two approaches." }
```

Clients cannot submit assistant or system messages. Those roles are reserved for trusted server-side AI orchestration. AI generation is not connected yet.

## Error behavior

- `401`: session missing or invalid.
- `400`: invalid input or rejected write.
- `404`: requested project not found for the current member.
- `503`: required backend configuration is missing.
- `500`: read failure; response does not expose database diagnostics.

All private data responses use `Cache-Control: no-store`.
