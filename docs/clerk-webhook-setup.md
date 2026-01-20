# Setting Up Clerk Webhooks for Convex Integration

This guide walks you through setting up Clerk webhooks to automatically sync user data to Convex.

## Prerequisites

Before starting, ensure you have:
- Clerk account created
- Clerk application configured with email/password auth
- Convex deployment URL (dev or production)
- Webhook handler route created in Convex (`convex/http.ts`)

---

## Step-by-Step Setup

### 1. Navigate to Webhooks Section

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application from the left sidebar
3. Click **Webhooks** in the navigation menu
4. Click the **Add endpoint** button

---

### 2. Configure Webhook Endpoint

#### Endpoint URL
Enter your Convex HTTP route URL:
- **Development**: `https://your-deployment-name.convex.site/clerk-webhook`
- **Production**: `https://your-prod-name.convex.cloud/clerk-webhook`

**How to find your deployment URL**:
```bash
# Development
bunx convex deploy --cmd "echo $CONVEX_DEPLOYMENT"

# Or check convex dashboard
# Dashboard → Deployment → Production URL
```

#### Description (optional)
Add a description like: "Sync user data to Convex database"

Click **Create webhook** to continue.

---

### 3. Subscribe to Events

After creating the webhook, you'll see a list of available events. **Toggle on** these events:

#### Required Events
- ✅ **user.created** - Syncs new users to Convex when they sign up
- ✅ **user.updated** - Updates user data when they change profile info, email, or role
- ✅ **user.deleted** - Removes user from Convex when deleted from Clerk

#### Optional Events (for future use)
- ❌ **session.created** - Track user sessions
- ❌ **session.ended** - Track session end
- ❌ **email.created** - Track email changes
- ❌ **email.updated** - Track email updates

**Recommendation**: Start with just the 3 required events. You can add more later as needed.

---

### 4. Configure Event Handlers

For each subscribed event, you can configure:

#### User Created
- **Sync to Convex**: ✅ Enabled
- **Retry policy**: Keep default (exponential backoff)
- **Rate limiting**: Keep default

#### User Updated
- **Sync to Convex**: ✅ Enabled
- **Fields to sync**: All (or select specific fields)
- **Retry policy**: Keep default

#### User Deleted
- **Sync to Convex**: ✅ Enabled
- **Delete from database**: ✅ Enabled (recommended)
- **Retry policy**: Keep default

---

### 5. Test the Webhook

#### Manual Test
1. Scroll down to the "Testing" section
2. Select an event type (e.g., `user.created`)
3. Click **Send test webhook**
4. Check the response:
   - ✅ **200 OK** - Webhook received successfully
   - ❌ **400 Bad Request** - Signature validation failed
   - ❌ **404 Not Found** - Endpoint URL incorrect
   - ❌ **500 Internal Server Error** - Backend logic error

#### Verify in Convex
After successful test:
```bash
bunx convex run users:list  # Or check Convex Dashboard
```
You should see a test user in your Convex database.

---

### 6. Copy the Signing Secret

**Critical**: You need this secret for verifying webhook authenticity.

1. Scroll to the top of the webhook configuration
2. Find **Signing Secret** (starts with `whsec_`)
3. Click the copy button (📋)
4. Save it securely - **never commit to git**

#### Add to Convex Environment Variables
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `CLERK_WEBHOOK_SECRET`
   - **Value**: `whsec_xxxxx` (paste your secret)
5. Click **Save**

---

### 7. Verify Webhook Route in Convex

Your Convex backend must have a webhook handler at `/clerk-webhook`. Here's the structure:

**File**: `convex/http.ts`

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "convex/server";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get payload
    const payloadString = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing required headers", { status: 400 });
    }

    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    let event;
    try {
      event = wh.verify(payloadString, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    // Route events to appropriate handlers
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(api.users.upsertFromClerk, { user: event.data });
        break;
      case "user.deleted":
        await ctx.runMutation(api.users.deleteFromClerk, { userId: event.data.id });
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
```

**Required Convex function**: `convex/users.ts` needs these mutations:
- `upsertFromClerk` - Insert or update user from Clerk data
- `deleteFromClerk` - Delete user from Convex

---

## Troubleshooting

### Webhook Not Reaching Convex

**Symptoms**: Test webhook shows 200 OK, but user not in Convex database

**Solutions**:
1. Check Convex deployment URL is correct
2. Verify `/clerk-webhook` route exists in `convex/http.ts`
3. Check Convex function logs:
   ```bash
   bunx convex logs
   ```
4. Ensure environment variables are set in Convex, not just locally

### Signature Validation Failed

**Symptoms**: Clerk Dashboard shows "Invalid signature" error

**Solutions**:
1. Verify `CLERK_WEBHOOK_SECRET` in Convex matches exactly (no extra spaces)
2. Check environment variable is set in Convex Dashboard, not `.env.local`
3. Make sure you're using the correct webhook's secret (different webhooks have different secrets)

### 404 Not Found

**Symptoms**: Webhook test returns 404

**Solutions**:
1. Verify endpoint URL includes `/clerk-webhook` (not just the base URL)
2. Check Convex deployment is running:
   ```bash
   bunx convex dev  # or check dashboard
   ```
3. Make sure you've deployed the webhook handler:
   ```bash
   bunx convex deploy
   ```

### Webhook Delayed or Missing

**Symptoms**: User created in Clerk but not appearing in Convex

**Solutions**:
1. Check webhook logs in Clerk Dashboard → Webhooks → Your webhook → Logs
2. Look for errors or failed retries
3. Verify webhook events are subscribed:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Check if Clerk is hitting rate limits (usually 1000 req/min)
5. As fallback, your app should use `getCurrentUserOrSync()` which will create the user on their first request

### Webhook Retrying Too Much

**Symptoms**: Convex logs show repeated failed webhook attempts

**Solutions**:
1. Check Convex mutation errors in logs
2. Ensure database schema matches expected fields
3. Verify `upsertFromClerk` handles both insert and update cases
4. Check for duplicate externalId conflicts

---

## Webhook vs On-Demand Sync

### With Webhooks (Recommended)
- ✅ Real-time sync
- ✅ No extra API calls in user requests
- ✅ Handles deletions automatically
- ✅ Works for Clerk Dashboard user management
- ⚠️ Requires setup and monitoring

### On-Demand Sync Only
- ✅ Simpler setup
- ✅ No webhook infrastructure
- ❌ Extra API call on every request (slow)
- ❌ Stale data between updates
- ❌ No deletion sync
- ❌ Dashboard updates don't work

**Recommendation**: Use webhooks with on-demand sync as fallback.

---

## Environment Variables Checklist

Add these to your **Convex Dashboard** (not `.env.local`):

| Variable | Value | Purpose |
|----------|---------|----------|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-app.clerk.accounts.dev` | JWT authentication |
| `CLERK_WEBHOOK_SECRET` | `whsec_xxxxx` | Webhook signature verification |
| `CLERK_SECRET_KEY` | `sk_live_xxxxx` or `sk_test_xxxxx` | Admin API access (for on-demand sync) |

**Frontend only** (`.env.local`):
| Variable | Value | Purpose |
|----------|---------|----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxxx` or `pk_test_xxxxx` | Clerk frontend authentication |
| `VITE_CONVEX_URL` | `https://your-app.convex.site` | Convex connection |

---

## Monitoring Webhooks

### Clerk Dashboard
1. Go to **Webhooks** → Your webhook
2. Click **Logs** tab
3. View recent webhook deliveries:
   - Status (200, 400, 500)
   - Event type
   - Timestamp
   - Retry attempts

### Convex Dashboard
1. Go to your project
2. Click **Logs** tab
3. Filter by function name:
   - `users.upsertFromClerk`
   - `users.deleteFromClerk`
4. Look for errors or warnings

### Best Practices
- Set up alerts for failed webhooks
- Monitor webhook latency
- Review logs daily after initial setup
- Test webhook with real user sign-up

---

## Testing Complete Setup

After setting up webhooks, test with a real user:

1. **Create a test user** in Clerk Dashboard → Users → Create User
2. **Wait 2-3 seconds** for webhook to process
3. **Check Convex**:
   ```bash
   bunx convex run users:list
   ```
4. **Verify fields match**:
   - Email
   - Name
   - Role (from metadata)
   - Image URL

If all checks pass, webhooks are working correctly!

---

## Next Steps

After webhook setup is complete:

1. ✅ Update migration plan to mark webhook setup as complete
2. ✅ Test migration scripts with webhook enabled
3. ✅ Monitor webhooks during production migration
4. ✅ Set up webhook failure alerts
5. ✅ Document webhook endpoint URL for rollback

---

## Resources

- [Clerk Webhooks Documentation](https://clerk.com/docs/webhooks/sync-data)
- [Clerk Webhooks Reference](https://clerk.com/docs/reference/backend-api/resources/webhook)
- [Svix Webhook Library](https://github.com/svix/svix-webhooks)
- [Convex HTTP Routes](https://docs.convex.dev/http-routes)
