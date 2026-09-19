# Clerk webhook setup

1. Deploy the Convex backend and copy its HTTP Actions URL from the Convex dashboard.
2. In the matching Clerk instance, create an endpoint at
   `https://YOUR_CONVEX_SITE.convex.site/clerk-webhook`.
3. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
4. Copy the endpoint signing secret.
5. Set it on the matching Convex deployment:

   ```sh
   bunx convex env set CLERK_WEBHOOK_SIGNING_SECRET 'whsec_...'
   ```

6. Redeploy Convex so the environment revision and HTTP action are active.
7. Send a test `user.created` event from Clerk. It should return HTTP 200.
8. Check Convex logs for `clerk_webhook_user_upserted` and confirm the user row has an
   `externalId`.

Use a development Clerk endpoint with the development Convex deployment and a production
endpoint with production. Signing secrets are endpoint-specific.

If verification fails, compare the secret against the same endpoint, confirm the three Svix
headers reach Convex, and inspect `clerk_webhook_verification_failed` in Convex logs.
