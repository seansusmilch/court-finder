# Clerk authentication migration

This runbook moves Court Finder from Convex Auth to Clerk without changing existing
Convex user IDs. Keeping those IDs preserves scans, feedback, profile images, and rate
limit records.

## How user records are linked

The first verified Clerk event or signed-in request looks for a Convex user in this order:

1. Clerk user ID in `users.externalId`
2. Lowercase primary email in `users.email`
3. A new Convex user record when neither lookup matches

Existing users must use the same primary email in Clerk. Resolve duplicate or missing
emails before cutover.

## Required configuration

Create separate Clerk development and production instances. Configure email as a sign-in
identifier and choose the sign-in methods Court Finder should support.

Activate the Convex integration in the Clerk Dashboard (or create the `convex` JWT
template in dashboards that expose templates). Keep the token audience/template name
`convex`. Include the primary email and its boolean `email_verified` claim so Convex
can link legacy users only after verification. Put the issuer URL in each matching
Convex deployment. See the [current integration guide](https://docs.convex.dev/auth/clerk).

```sh
bunx convex env set CLERK_JWT_ISSUER_DOMAIN 'https://your-instance.clerk.accounts.dev'
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

The webhook updates names, primary emails, profile images, roles, and permissions. Deleting
a Clerk user disconnects the Clerk ID but keeps the Convex row and its related app data.

## Existing users

Deploy this branch to a non-production Convex deployment first, then audit its users:

```sh
bunx convex run users:clerkMigrationStatus
bunx convex run users:exportForClerkMigration
```

The export contains only users that have an email and are not linked to Clerk. Import those
users with Clerk's migration tool or create them through the Clerk Dashboard. Court Finder
does not copy Convex Auth password hashes. Users should sign in with an email code or use
Clerk's password reset flow to set a Clerk password.

For an admin, set `public_metadata.role` to `admin` in Clerk. The webhook will write the
admin role and permissions to Convex.

## Rollout order

1. Back up the production Convex deployment.
2. Configure and test Clerk plus Convex in development.
3. Confirm `duplicateEmails` and `missingEmail` are empty in the migration status.
4. Import existing users into the Clerk production instance.
5. Configure the production issuer, webhook secret, and Vercel publishable key.
6. Deploy Convex, then deploy the frontend.
7. Test sign-in, sign-out, a protected route, admin access, profile editing, and a scan.
8. Run `users:clerkMigrationStatus` again and confirm users link as they sign in or as
   webhook events arrive.
9. After the rollback window, delete the old Convex Auth `accounts`, `sessions`, and related
   tables from the Convex dashboard. The application no longer reads them.

## Rollback

Before deleting the legacy auth tables, rollback means redeploying the previous frontend and
Convex code together. Do not delete legacy tables until Clerk has been stable in production
and the backup has been verified.
