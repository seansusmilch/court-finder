# Authentication and Permissions

Court Finder uses Clerk for authentication and account management, with Convex storing the application user record and enforcing permissions.

## Core technology

- **Identity provider:** [Clerk](https://clerk.com/) handles sign-in, sign-up, profile photos, names, email addresses, passwords, and connected accounts.
- **Backend:** [Convex](https://convex.dev/) validates Clerk JWTs and stores application data.
- **User linking:** A one-time migration matches verified primary emails to existing Convex users and stores Clerk's user ID as `users.externalId`. Convex keeps only that local identity bridge so existing scans and feedback retain their stable user references.

## Authentication flow

1. `src/main.tsx` mounts `ClerkProvider` and connects Clerk to Convex with `ConvexProviderWithClerk`.
2. `src/routes/login.tsx` renders Clerk's `SignIn` component.
3. Convex functions read the authenticated Clerk identity through `ctx.auth.getUserIdentity()`.
4. After the one-time migration, the root route calls `users.ensureCurrentUser` after authentication. This reuses or creates the local identity bridge by Clerk subject.
5. A one-time administrator migration links existing Convex users to Clerk by verified primary email before the frontend cutover. After that, Clerk `user.created` and `user.updated` events maintain the identity bridge for new users. `user.deleted` removes the Clerk link while retaining the application's historical records.

## Account management

Clerk's `UserButton` is the single entry point for account management. The account page links to Clerk and does not duplicate profile photo, display name, email, password, or sign-in security controls. The account page remains available at `/account` for the mobile navigation and the custom Clerk menu item.

## Permissions

Roles are stored in Clerk `public_metadata.role` and included in the Clerk session token as a small custom claim. Convex derives the application's capabilities from that role; no role or permission copy is persisted in the `users` table.

- **Backend enforcement:** Protected Convex functions call `requireCurrentUser` from `convex/lib/auth.ts` and derive authorization from the verified Clerk role claim before changing protected data.
- **Frontend checks:** UI code can call `api.users.hasPermission` for conditional controls. This is a convenience check; backend authorization remains authoritative.
- **Admin access:** The `admin` role includes `admin.access`. The admin route waits for the authenticated user record and role claim before redirecting users who lack that role.
- **Background work:** Scheduled functions do not receive a user session. When a background operation needs a live role decision, an internal action retrieves the Clerk user through the server-side Clerk API and fails closed if the role cannot be read.

## Clerk configuration

Frontend environment:

```text
VITE_CLERK_PUBLISHABLE_KEY=
```

Production Vercel also needs the Clerk secret key because the app-origin proxy at
`/__clerk` forwards browser requests to Clerk's Frontend API:

```text
CLERK_SECRET_KEY=
CLERK_PROXY_URL=https://geocourt.vercel.app/__clerk
```

The production Clerk provider uses `/__clerk` automatically for a `pk_live_` key. The
proxy URL must exactly match the URL configured in Clerk. Set both variables in the
Vercel Production environment, then redeploy. The Vercel rewrite and
`api/clerk-proxy.ts` implementation must remain deployed with the frontend so Clerk's
proxy verification can reach the endpoint. The proxy must also rewrite Clerk redirects
back under `/__clerk`; OAuth callbacks otherwise fall through to the Vite app as 404s.
Do not add these variables to Preview unless Preview is intentionally configured with the
live Clerk instance.

Convex environment:

```text
CLERK_JWT_ISSUER_DOMAIN=
CLERK_WEBHOOK_SIGNING_SECRET=
CLERK_SECRET_KEY=
```

`CLERK_JWT_ISSUER_DOMAIN` must be the Clerk Frontend API URL copied from the
production Clerk API keys page. For this proxied production instance, Clerk reports that
value as `https://geocourt.vercel.app/__clerk`, so set that exact value in the Convex
production deployment. Its JWKS URL is the same URL with
`/.well-known/jwks.json` appended. Do not substitute the Backend API URL
(`https://api.clerk.com`) for the issuer domain.

Configure the Clerk session token with a `role` claim sourced from `user.public_metadata.role`.

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

After the one-time migration and legacy-field cleanup, configure Clerk's webhook endpoint to
point to the deployed Convex HTTP action at `/clerk-webhook` and subscribe it to `user.created`,
`user.updated`, and `user.deleted`.

## Key files

- `src/main.tsx`: Clerk and Convex provider setup.
- `src/routes/login.tsx`: Clerk sign-in UI.
- `src/components/header.tsx`: Clerk account menu.
- `src/routes/_authed.account.tsx`: Account page and Clerk management link.
- `convex/lib/auth.ts`: Clerk identity mapping, role claim parsing, and current-user lookup.
- `convex/users.ts`: Local identity bridge and role-derived authorization checks.
- `convex/http.ts`: Signed Clerk webhook handling.
- `convex/schema.ts`: Local identity-bridge schema.
