# Authentication and Permissions

Court Finder uses Clerk for authentication and account management, with Convex storing the application user record and enforcing permissions.

## Core technology

- **Identity provider:** [Clerk](https://clerk.com/) handles sign-in, sign-up, profile photos, names, email addresses, passwords, and connected accounts.
- **Backend:** [Convex](https://convex.dev/) validates Clerk JWTs and stores application data.
- **User linking:** Clerk's user ID is stored as `users.externalId`. During migration, a verified primary email can link a Clerk identity to an existing Convex Auth user while preserving that user's `_id`, permissions, scans, and feedback.

## Authentication flow

1. `src/main.tsx` mounts `ClerkProvider` and connects Clerk to Convex with `ConvexProviderWithClerk`.
2. `src/routes/login.tsx` renders Clerk's `SignIn` component.
3. Convex functions read the authenticated Clerk identity through `ctx.auth.getUserIdentity()`.
4. The root route calls `users.ensureDefaultPermissions` after authentication. This links or creates the application user record and preserves existing roles and permissions.
5. Clerk `user.created` and `user.updated` events are delivered to `/clerk-webhook`, which keeps the Convex user record synchronized. `user.deleted` removes the Clerk link while retaining the application's historical records.

## Account management

Clerk's `UserButton` is the single entry point for account management. The account page links to Clerk and does not duplicate profile photo, display name, email, password, or sign-in security controls. The account page remains available at `/account` for the mobile navigation and the custom Clerk menu item.

## Permissions

Permissions are stored in the `permissions` array on the `users` table. Roles are stored in `users.role` and map to the default permission sets in `convex/users.ts`.

- **Backend enforcement:** Protected Convex functions call `requireCurrentUser` from `convex/lib/auth.ts` and verify the required permission before changing protected data.
- **Frontend checks:** UI code can call `api.users.hasPermission` for conditional controls. This is a convenience check; backend authorization remains authoritative.
- **Admin access:** The `admin` role includes `admin.access`. The admin route waits for the Convex user record to synchronize before redirecting users who lack that permission.

## Clerk configuration

Frontend environment:

```text
VITE_CLERK_PUBLISHABLE_KEY=
```

Convex environment:

```text
CLERK_JWT_ISSUER_DOMAIN=
CLERK_WEBHOOK_SIGNING_SECRET=
```

Configure Clerk's webhook endpoint to point to the deployed Convex HTTP action at `/clerk-webhook` and subscribe it to `user.created`, `user.updated`, and `user.deleted`.

## Migration checks

Before switching traffic, inspect the internal `users:clerkMigrationStatus` query. Resolve duplicate normalized emails manually before allowing those accounts to link. The migration intentionally requires a verified primary email and never overwrites a user already linked to a different Clerk identity.

## Key files

- `src/main.tsx`: Clerk and Convex provider setup.
- `src/routes/login.tsx`: Clerk sign-in UI.
- `src/components/header.tsx`: Clerk account menu.
- `src/routes/_authed.account.tsx`: Account page and Clerk management link.
- `convex/lib/auth.ts`: Identity mapping, migration-safe user linking, and current-user lookup.
- `convex/users.ts`: User synchronization, roles, permissions, and migration helpers.
- `convex/http.ts`: Signed Clerk webhook handling.
- `convex/schema.ts`: User and permission storage schema.
