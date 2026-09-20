# Clerk authentication migration

This runbook moves Court Finder from Convex Auth to Clerk while preserving the local user
IDs that own scans, feedback, and rate-limit records. Legacy profile fields are retained
only until the one-time identity migration completes.

## How user records are linked

The one-time migration matches existing Convex users to Clerk users by normalized, verified
primary email:

1. Existing Clerk user ID in `users.externalId` is left unchanged.
2. An unlinked Convex user is linked when exactly one Clerk user has the same verified primary email.
3. Missing, duplicate, or ambiguous matches are reported and are not linked.

After the migration, normal requests and webhooks use only `users.externalId`. Email is not
a permanent runtime identity fallback.

## Required configuration

Create separate Clerk development and production instances. Configure email as a sign-in
identifier and choose the sign-in methods Court Finder should support.

If Court Finder should show a personal display name, enable Clerk's first and last name
attributes in the instance's User & authentication settings. Clerk's `<UserProfile />`
modal will then expose those fields; Court Finder reads Clerk's `fullName` and falls back
to the primary email when no name has been set.

Activate the Convex integration in the Clerk Dashboard (or create the `convex` JWT
template in dashboards that expose templates). Keep the token audience/template name
`convex`. Add a small `role` claim sourced from `user.public_metadata.role`. Put the
issuer URL in each matching Convex deployment. See the [current integration guide](https://docs.convex.dev/auth/clerk).

```sh
bunx convex env set CLERK_JWT_ISSUER_DOMAIN 'https://your-instance.clerk.accounts.dev'
bunx convex env set CLERK_SECRET_KEY 'sk_test_...'
```

Set the matching Clerk publishable key in the frontend environment:

```text
VITE_CLERK_PUBLISHABLE_KEY=pk_test_or_live_value
```

Use the development frontend key locally and in Vercel Preview, paired with a development
Convex deployment. Use the production key in Vercel Production, paired with production
Convex. Verify the scope of `CONVEX_DEPLOY_KEY` before a preview build: a production
deploy key would deploy the PR backend to production. Do not put secret keys in `VITE_`
variables.

## Webhook

Deploy the Convex backend, then create a Clerk webhook endpoint at:

```text
https://YOUR_CONVEX_SITE.convex.site/clerk-webhook
```

Subscribe to `user.created`, `user.updated`, and `user.deleted`. Put the endpoint signing
secret in the matching Convex deployment:

```sh
bunx convex env set CLERK_WEBHOOK_SIGNING_SECRET 'whsec_...'
```

The webhook maintains only the local Clerk ID bridge. Clerk owns names, primary emails,
the application role, and profile photos; application permissions are derived from that
role. Clerk's components render profile data. Existing
Convex photo blobs cannot be copied by a user webhook because they are private Convex
storage objects, so users should upload a replacement from Clerk when they first sign in.
Deleting a Clerk user disconnects the Clerk ID but keeps the Convex row and its related app
data.

## Existing users

Before switching the frontend to Clerk, run a dry run of the one-time migration as an
authenticated Clerk administrator:

```sh
bunx convex run clerkMigration:migrateLegacyUsers \
  '{"apply":false}' \
  --identity '{"subject":"user_...","role":"admin"}'
```

Review the counts. The migration only links one-to-one matches between a legacy verified
email and a Clerk verified primary email. Apply those safe matches:

```sh
bunx convex run clerkMigration:migrateLegacyUsers \
  '{"apply":true}' \
  --identity '{"subject":"user_...","role":"admin"}'
```

Resolve any missing, ambiguous, or duplicate matches, then run the dry run again. When it
reports zero unmatched users and zero duplicate Clerk links, remove the remaining legacy
fields in the same migration window:

```sh
bunx convex run clerkMigration:migrateLegacyUsers \
  '{"apply":true,"cleanupLegacyFields":true}' \
  --identity '{"subject":"user_...","role":"admin"}'
```

Only after cleanup succeeds should the legacy fields and email index be removed from the
schema, followed by removal of the temporary migration action and helpers. Court Finder
does not copy Convex Auth password hashes. Users should sign in with an email code or use
Clerk's password reset flow to set a Clerk password.

For an admin, set `public_metadata.role` to `admin` in Clerk and expose that value as a
`role` claim in the session token. Convex derives permissions from the live role claim.

## Rollout order

1. Back up the production Convex deployment.
2. Configure and test Clerk plus Convex in development.
3. Import existing users into the Clerk production instance.
4. Deploy the migration-compatible Convex backend, but do not enable the Clerk webhook or
   switch the frontend to Clerk yet. This prevents webhook-created bridge rows from competing
   with the bulk email match.
5. Configure the production issuer, Clerk secret key, and `role` session claim from
   `user.public_metadata.role`.
6. Run the dry run, resolve every missing or ambiguous match, apply the exact matches, and
   run cleanup.
7. Deploy the cleaned schema and remove the temporary migration action and helpers.
8. Configure the Clerk webhook and signing secret, enable user sync, and deploy the frontend.
9. Test sign-in, sign-out, a protected route, admin access, Clerk profile management, and a scan.
10. After the rollback window, delete the old Convex Auth `accounts`, `sessions`, and related
   tables from the Convex dashboard. The application no longer reads them.

## Rollback

Before deleting the legacy auth tables, rollback means redeploying the previous frontend and
Convex code together. Do not delete legacy tables until Clerk has been stable in production
and the backup has been verified.
