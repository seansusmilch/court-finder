# Clerk role authorization requirements

## Identity and profile ownership

- Clerk is the source of truth for authentication, names, email addresses, profile photos, passwords, and account security.
- Clerk is the source of truth for each user's application role.
- The application preserves a stable local identity reference so existing scans, feedback, and other user-owned records remain associated with the same application user.
- Existing local users are linked to Clerk exactly once by a unique, verified primary email before legacy identity fields are removed.
- An ambiguous or missing email match must be reported for manual resolution rather than linked automatically.
- The application must not require a user session to run system background work.

## Role behavior

- Roles are assigned by trusted server-side Clerk operations and are readable by the application for authorization.
- A regular user can use the standard Court Finder features.
- An administrator can access administrative features and operations.
- Authorization decisions must be enforced by the backend; frontend checks are only for navigation and presentation.
- Role changes must affect new authorization decisions without requiring a local role record to be manually synchronized.

## Identity migration

- The email-based match is a migration-only operation, not a permanent runtime identity fallback.
- After migration cleanup, authenticated requests and webhooks use the Clerk subject stored in the local identity bridge.

## Request-time authorization

- Authenticated requests must derive the current user's role from the verified Clerk identity.
- An unauthenticated request must not access protected operations.
- A request with a non-administrator role must not access administrative operations.

## Background authorization

- Scheduled and internal background functions do not receive the initiating user's session automatically.
- When a background operation needs a current role decision, it must look up the Clerk user through a server-to-server Clerk credential using the stored Clerk user ID.
- Background operations must fail closed when the Clerk lookup fails or the role is missing or unsupported.
- The system must not store a second authoritative role or permission set in Convex.

## Application data

- Convex may retain the local user document only as an identity bridge for existing foreign keys.
- Role and permission arrays must not be persisted as user profile data in Convex.
- Removing or disconnecting a Clerk user must not delete historical application records.
