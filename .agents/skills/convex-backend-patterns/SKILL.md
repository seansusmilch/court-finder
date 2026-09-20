---
name: convex-backend-patterns
description: Convex backend patterns for this Court Finder project. Use when writing, updating, or reviewing Convex queries, mutations, actions, schema definitions, auth checks, permissions, migrations, storage, logging, or backend integrations.
---

# Convex Backend Patterns

Use this skill for backend work in `convex/`.

## Function Types

- Use `query` for public read-only client calls.
- Use `mutation` for public transactional writes.
- Use `action` for public work that calls external APIs, uses Node APIs, or schedules long-running work.
- Use `internalQuery`, `internalMutation`, and `internalAction` for server-only helpers.
- Add `'use node';` at the top of action modules that need Node APIs or external API access. `convex/actions.ts` and `convex/actions/password.ts` already use this pattern.
- Call public functions through `api.*` and internal functions through `internal.*`.

## Auth And Permissions

- Use Clerk authentication. Get the Convex user through `getCurrentUser`, `getCurrentUserId`, or `requireCurrentUser` from `convex/lib/auth.ts`; Clerk subjects are not Convex document IDs. Do not reintroduce `@convex-dev/auth`.
- Preserve existing user IDs during migration. Email-based linking requires a verified primary email and must not overwrite another Clerk user's link. Keep admin roles and existing permissions when metadata omits a role.
- Verify webhook signatures before applying `user.created`, `user.updated`, or `user.deleted`; deletion disconnects the Clerk identity while retaining application data.
- Check permissions with `api.users.hasPermission` before protected operations.
- Use `PERMISSIONS` from `convex/lib/constants.ts`; current groups include `SCANS`, `TRAINING`, and `ADMIN`.
- Preserve anonymous-user behavior where existing functions allow it.

## Schema And Indexes

- Define tables and indexes in `convex/schema.ts`.
- Use `v.id('table')` for document references and `v.optional(...)` for optional fields.
- Prefer indexed queries with `withIndex()` over table scans. If a new query filters by fields repeatedly, add an index.
- For compound indexes, chain equality filters in index order.

## Environment And Integrations

- Use typed env helpers from `convex/env.ts`; do not read raw `process.env` throughout business logic.
- Server env includes `MAPBOX_API_KEY`, `ROBOFLOW_API_KEY`, `ROBOFLOW_BATCH`, optional `CONVEX_SITE_URL`, and the matching instance's `CLERK_WEBHOOK_SIGNING_SECRET`. `convex/auth.config.ts` reads `CLERK_JWT_ISSUER_DOMAIN` with application ID `convex`.
- Follow `docs/clerk-migration.md` for rollout and audit steps. Keep development and production Clerk/Convex instances paired; report migration counts without emails. Check the current [Convex Clerk integration guide](https://docs.convex.dev/auth/clerk) when dashboard configuration changes.
- Pass `ROBOFLOW_MODEL_NAME` and `ROBOFLOW_MODEL_VERSION` from `convex/lib/constants.ts` when calling Roboflow helpers; helper defaults may not match the active project model.
- Mapbox, Roboflow, geocoding, and tile utilities live under `convex/lib/`.

## Logging

Emit structured logs with context:

- Include timing (`startTs`, `durationMs`) around meaningful operations.
- Include auth and permission context where relevant (`userId`, permission name, `canScan`).
- Include entity IDs (`tileId`, `scanId`, `courtId`, prediction IDs) and progress metrics for batch work.
- Log both start and completion for long-running actions and scheduled work.

## Migrations

- Use `@convex-dev/migrations` in `convex/migrations.ts`.
- Add migrations to the `runAll` runner in execution order.
- Use migrations for data-shape changes, backfills, deletes, and linked document creation.
- Schedule external or async work through `ctx.scheduler.runAfter()` when a migration should trigger follow-up processing.

## CLI

Use Bun wrappers for Convex commands:

```bash
bun dev:backend
bunx convex run module:functionName '{"arg":"value"}'
bunx convex deploy
bunx convex logs
```

Pass JSON arguments directly after the function name; do not use an `--args` flag.

## Verification

```bash
bun check-types
bun run test
bun run build
```
