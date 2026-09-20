# Clerk cutover checklist

- [ ] Clerk development and production instances exist.
- [ ] Email sign-in and the chosen authentication methods are enabled.
- [ ] First and last name attributes are enabled if personal display names are desired.
- [ ] The JWT template is named `convex`.
- [ ] `CLERK_JWT_ISSUER_DOMAIN` is set in both matching Convex deployments.
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` is set locally and in Vercel.
- [ ] Clerk webhooks point to each matching `*.convex.site/clerk-webhook` URL.
- [ ] `CLERK_WEBHOOK_SIGNING_SECRET` is set in each Convex deployment.
- [ ] Webhooks subscribe to `user.created`, `user.updated`, and `user.deleted`.
- [ ] A Convex production backup exists.
- [ ] The migration audit has no duplicate or missing emails.
- [ ] Existing users were imported into the Clerk production instance.
- [ ] At least one normal user and one admin were tested end to end.
- [ ] Sign-in, sign-out, protected routes, profile changes, and scans work.
- [ ] Legacy Convex Auth tables remain in place through the rollback window.
