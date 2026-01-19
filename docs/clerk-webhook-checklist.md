# Clerk Webhook Setup Checklist

Quick reference for setting up Clerk webhooks. For detailed instructions, see [clerk-webhook-setup.md](./clerk-webhook-setup.md).

## Before You Start
- [ ] Clerk account created and application configured
- [ ] Convex deployment URL available
- [ ] Webhook handler route created in `convex/http.ts`
- [ ] `svix` package installed

## In Clerk Dashboard
- [ ] Navigate to Webhooks → Add Endpoint
- [ ] Enter Convex deployment URL with `/clerk-webhook` path
- [ ] Subscribe to `user.created` event
- [ ] Subscribe to `user.updated` event
- [ ] Subscribe to `user.deleted` event
- [ ] Test webhook with Clerk's test button
- [ ] Verify 200 OK response
- [ ] Copy signing secret (starts with `whsec_`)

## In Convex Dashboard
- [ ] Go to Settings → Environment Variables
- [ ] Add `CLERK_WEBHOOK_SECRET` (from Clerk webhook)
- [ ] Add `CLERK_JWT_ISSUER_DOMAIN` (e.g., `https://your-app.clerk.accounts.dev`)
- [ ] Add `CLERK_SECRET_KEY` (from Clerk API Keys - for on-demand sync fallback)

## Verification
- [ ] Test webhook in Clerk Dashboard
- [ ] Check Convex database for test user
- [ ] Check Convex function logs for errors
- [ ] Test with real user sign-up
- [ ] Verify user data syncs correctly

## Environment Variables Reference

### Convex Dashboard (Backend)
```
CLERK_WEBHOOK_SECRET=whsec_xxxxx
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_live_xxxxx or sk_test_xxxxx
```

### Frontend (.env.local only)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx or pk_test_xxxxx
VITE_CONVEX_URL=https://your-app.convex.site
```

## Common Issues

**404 Not Found**
- Check deployment URL is correct
- Verify `/clerk-webhook` path is included
- Run `bunx convex deploy` to ensure route is deployed

**Invalid Signature**
- Verify `CLERK_WEBHOOK_SECRET` matches exactly (no extra spaces)
- Make sure it's set in Convex Dashboard, not just `.env.local`

**User Not Appearing**
- Check webhook logs in Clerk Dashboard
- Check Convex function logs
- Verify all 3 events are subscribed
- Use `getCurrentUserOrSync()` as fallback

## Need Help?

See [clerk-webhook-setup.md](./clerk-webhook-setup.md) for detailed troubleshooting and examples.
