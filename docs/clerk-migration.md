# Clerk Migration Plan

**Migration from Convex Auth to Clerk**

**Status**: Planning
**Created**: January 18, 2026
**Estimated Duration**: 18-30 hours (2-4 days)

---

## Executive Summary

Migrating from Convex Auth to Clerk with these decisions:

| Decision | Choice | Rationale |
|----------|---------|-----------|
| **Passwords** | Require password reset | Simpler, more secure, avoids complex hash migration |
| **Roles** | Manual admin assignment | Fine-grained control over admin access |
| **User Sync** | Hybrid (webhooks + on-demand) | Real-time updates via webhooks, fallback to on-demand |
| **Role Storage** | Clerk metadata (`public_metadata`) | Simple, no Organizations overhead, easily accessible in JWT |

**New Role System**:
- `guest` - Implicit role for unauthenticated users (read-only access to scans and training data)
- `user` - Default for authenticated users (full access: scans:read/write/execute, training:read/write)
- `admin` - Authenticated users with admin privileges (all user permissions + `admin.access`)

**Note**: Guest is never stored in the database - it's implied by the absence of authentication. The `role` field in the users table is optional and defaults to `user`. Only `admin` needs to be explicitly stored.

---

## Current Architecture

### Auth System
- **Provider**: Convex Auth (`@convex-dev/auth`)
- **User Table**: Custom table with `permissions` array
- **Password Hashing**: Scrypt (via Lucia/Password provider)
- **Roles**: Permission-based (array of strings)

### Current Permissions

Define a PERMISSIONS object with three categories:
- SCANS: READ, WRITE, EXECUTE permissions
- TRAINING: READ, WRITE permissions
- ADMIN: ACCESS permission

Define DEFAULT_USER_PERMISSIONS as an array containing scan read/write/execute and training read/write permissions.

Define DEFAULT_ANONYMOUS_PERMISSIONS as an array containing scan read and training read permissions.

### User Schema

The users table should define these fields:
- name: optional string
- image: optional storage ID
- email: optional string
- emailVerificationTime: optional number
- isAnonymous: optional boolean
- permissions: array of strings

Add an index on email field.

### Key Files
- `convex/auth.ts` - Convex Auth configuration
- `convex/auth.config.ts` - Domain configuration
- `convex/users.ts` - User queries/mutations
- `convex/actions/password.ts` - Password hashing utilities
- `src/routes/login.tsx` - Custom login page
- `src/main.tsx` - `ConvexAuthProvider` setup

---

## Target Architecture

### Clerk Integration
- **Provider**: Clerk (`@clerk/clerk-react`)
- **User Table**: Clerk-stored users synced to Convex
- **Authentication**: JWT-based via Clerk's "convex" template
- **Roles**: Stored in `user.public_metadata.role`

### New Schema

The users table should define these fields:
- externalId: string (Clerk user ID from JWT subject)
- name: optional string
- email: optional string
- emailVerified: optional boolean
- imageUrl: optional string (URL to Clerk image)
- image: optional storage ID (Convex storage ID for uploaded image)
- role: optional string (either 'user' [default] or 'admin'; guest is implied by being unauthenticated)
- migratedFromConvexId: optional users ID (track old user ID for migration)
- createdAt: number
- updatedAt: number

Add an index on externalId called 'by_external_id' and an index on email called 'by_email'.

**Important**: Guest is never stored as a role. Unauthenticated users have no user record in the database.

### Role System

Define ROLES constant with two values: USER ('user'), ADMIN ('admin').

Define ROLE_PERMISSIONS object mapping roles to permission arrays:
- user: ['scans.read', 'scans.write', 'scans.execute', 'training.read', 'training.write']
- admin: ['admin.access', 'scans.read', 'scans.write', 'scans.execute', 'training.read', 'training.write']

**Guest permissions** are handled separately in auth checks - unauthenticated users get read-only access.

**Permission checking logic**:
- Unauthenticated (no user): Return guest permissions ['scans.read', 'training.read']
- Authenticated with role undefined or 'user': Return ROLE_PERMISSIONS.user
- Authenticated with role 'admin': Return ROLE_PERMISSIONS.admin

### Key Components
- `ClerkProvider` - Wraps app with Clerk context
- `ConvexProviderWithClerk` - Integrates Clerk with Convex
- `Webhook Handler` - Syncs Clerk users to Convex database
- JWT Template - Custom "convex" template with role claims

---

## Phase 1: Clerk Setup

### 1.1 Create Clerk Application
1. Sign up at [clerk.com/sign-up](https://dashboard.clerk.com/sign-up)
2. Create new application:
   - Enable email/password authentication
   - Enable "Allow sign-ups" temporarily for migration
   - Configure email verification (recommended)

### 1.2 Create JWT Template for Convex
1. Navigate to Clerk Dashboard → **JWT Templates**
2. Click **New Template**
3. Select **Convex** template type
4. **Critical**: Do NOT rename the template (must be `convex`)
5. **Configure Claims** to include user role from public_metadata
6. Save the **Issuer URL** (Frontend API URL):
   - Dev format: `https://verb-noun-00.clerk.accounts.dev`
   - Prod format: `https://clerk.<your-domain>.com`

### 1.3 Configure Webhook

For detailed step-by-step instructions, see [clerk-webhook-setup.md](./clerk-webhook-setup.md).

Quick reference:
1. Clerk Dashboard → **Webhooks** → **Add Endpoint**
2. Endpoint URL: `https://<deployment>.convex.site/clerk-webhook`
3. **Subscribe to events**:
    - `user.created`
    - `user.updated`
    - `user.deleted`
4. Save and copy the **Signing Secret** (starts with `whsec_`)
5. Add `CLERK_WEBHOOK_SECRET` to Convex environment variables

### Checklist
- [ ] Sign up at clerk.com/sign-up
- [ ] Create new application with email/password authentication
- [ ] Enable "Allow sign-ups" temporarily
- [ ] Configure email verification
- [ ] Navigate to Clerk Dashboard → JWT Templates
- [ ] Click New Template
- [ ] Select Convex template type
- [ ] Do NOT rename the template (must be `convex`)
- [ ] Configure Claims to include user role
- [ ] Save the Issuer URL
- [ ] Clerk Dashboard → Webhooks → Add Endpoint
- [ ] Set Endpoint URL
- [ ] Subscribe to user.created event
- [ ] Subscribe to user.updated event
- [ ] Subscribe to user.deleted event
- [ ] Save and copy the Signing Secret

---

## Phase 2: Environment & Dependencies

### 2.1 Update Package Dependencies

Install these packages:
- @clerk/clerk-react
- convex-react-clerk
- svix (for webhook verification)

Remove these packages:
- @convex-dev/auth
- @convex-dev/migrations
- @auth/core

### 2.2 Update Environment Variables

In `.env.local` (frontend):
- Add VITE_CLERK_PUBLISHABLE_KEY (starts with pk_test_)
- Keep existing VITE_CONVEX_URL

In Convex Dashboard (Environment Variables):
- Add CLERK_JWT_ISSUER_DOMAIN (format: https://your-app.clerk.accounts.dev)
- Add CLERK_WEBHOOK_SECRET (starts with whsec_)

### 2.3 Update `convex/auth.config.ts`

Create a new AuthConfig that:
- Imports AuthConfig from convex/server
- Exports a configuration with one provider
- The provider should have domain from CLERK_JWT_ISSUER_DOMAIN environment variable
- The applicationID should be "convex"

### Checklist
- [ ] Install @clerk/clerk-react
- [ ] Install convex-react-clerk
- [ ] Install svix
- [ ] Remove @convex-dev/auth
- [ ] Remove @convex-dev/migrations
- [ ] Remove @auth/core
- [ ] Add VITE_CLERK_PUBLISHABLE_KEY to .env.local
- [ ] Verify VITE_CONVEX_URL exists in .env.local
- [ ] Add CLERK_JWT_ISSUER_DOMAIN to Convex Dashboard
- [ ] Add CLERK_WEBHOOK_SECRET to Convex Dashboard
- [ ] Import AuthConfig from convex/server
- [ ] Export configuration with one provider
- [ ] Configure provider with domain from CLERK_JWT_ISSUER_DOMAIN
- [ ] Set applicationID to "convex"

---

## Phase 3: Database Schema Changes

### 3.1 Update `convex/schema.ts`

**Remove these lines**:
- Import of authTables from '@convex-dev/auth/server'
- The spread operator adding authTables to schema
- The entire current users table definition

**Add new users table** with the structure described in Target Architecture section.

**Add temporary migration tracking table** called user_migration with these fields:
- oldUserId: users ID
- clerkUserId: string
- email: string
- status: string ('pending', 'migrated', 'failed')
- failureReason: optional string
- migratedAt: optional number
- Index on oldUserId called 'by_old_user'

### Checklist
- [ ] Remove import of authTables from '@convex-dev/auth/server'
- [ ] Remove spread operator adding authTables to schema
- [ ] Remove current users table definition
- [ ] Add new users table with externalId, name, email, emailVerified, imageUrl, image, role, migratedFromConvexId, createdAt, updatedAt
- [ ] Add index on externalId called 'by_external_id'
- [ ] Add index on email called 'by_email'
- [ ] Add user_migration table
- [ ] Add index on oldUserId called 'by_old_user'

---

## Phase 4: Convex Backend Changes

### 4.1 Replace `convex/users.ts`

Create new implementation with these components:

**Role constants**: Export ROLES object with GUEST, USER, ADMIN constants. Export ROLE_PERMISSIONS object mapping roles to permission arrays.

**Query functions**:
- `me`: Returns current user using getCurrentUser helper (null for guests)
- `hasPermission`: Takes permission string, checks if user's role includes that permission. Returns false for guests unless checking guest permissions.
- `getUserRole`: Returns the current user's role or 'guest' if unauthenticated
- `getPermissions`: Returns permission array for current user (guest permissions if unauthenticated, role permissions if authenticated)

**Internal mutations for webhook handlers**:
- `upsertFromClerk`: Handles user.created and user.updated events. Should:
  - Extract primary email from email addresses array (prefer verified)
  - Get role from public_metadata (default to 'user' if not set)
  - Build user attributes with externalId, name, email, emailVerified, imageUrl, role, updatedAt
  - Check for existing user by externalId
  - If exists, update user; if not, insert new user with createdAt
  - Return user ID
- `deleteFromClerk`: Handles user.deleted events. Should:
  - Find user by externalId (clerkUserId)
  - Delete user if found

**Admin mutation**:
- `setUserRole`: Allows admins to set user roles. Should:
  - Get current user and require authentication
  - Check if current user is admin, throw error if not
  - Validate the role is either 'user' or 'admin'
  - Update the target user's role (set to undefined to make them a regular user)
  - Return updated user

**Profile mutations**:
- `updateProfile`: Allows user to update their name
- `generateUploadUrl`: Returns upload URL for authenticated user
- `updateProfileImage`: Updates user's profile image, deletes old one if exists
- `getProfileImageUrl`: Returns URL for user's profile image
- `removeProfileImage`: Removes user's profile image and deletes from storage

### 4.2 Create `convex/lib/auth-helpers.ts`

Create helper functions for authentication:

- `getCurrentUser`: Takes QueryCtx, MutationCtx, or ActionCtx. Should:
  - Get user identity from ctx.auth
  - Return null if no identity (guest/unauthenticated)
  - Query users table by externalId matching identity.subject
  - Return unique result or null

- `getCurrentUserOrThrow`: Same as getCurrentUser but throws "Not authenticated" error if no user found

- `getUserId`: Calls getCurrentUser and returns user._id or null

- `getCurrentUserOrSync`: Same as getCurrentUser but calls syncUserFromClerk if user record is missing (webhook missed the user)

- `syncUserFromClerk`: Fetches user from Clerk API and inserts/updates in Convex database. Used as fallback when webhook fails.

### 4.3 Create `convex/http.ts` (Webhook Handler)

Create HTTP route handler that:
- Imports httpRouter from convex/server
- Imports httpAction, internal API, and Webhook from svix
- Creates route at /clerk-webhook with POST method
- Validates request using Webhook with CLERK_WEBHOOK_SECRET
- Routes events to appropriate mutations:
  - user.created or user.updated → calls users.upsertFromClerk
  - user.deleted → calls users.deleteFromClerk
  - Other events → log and ignore
- Returns 200 status on success, 400 on invalid webhook

Validation function should:
- Extract payload string from request body
- Extract svix headers (svix-id, svix-timestamp, svix-signature)
- Create Webhook instance with secret
- Verify and return event, or null on error (log error)

### 4.4 Update All Backend Functions

Replace all uses of `getAuthUserId` with helper functions:

**Pattern replacements**:
- Replace `const userId = await getAuthUserId(ctx)` with `const user = await getCurrentUserOrThrow(ctx)`
- Replace conditional check pattern with `const user = await getCurrentUser(ctx); if (!user) return null`
- Replace `user.permissions.includes(...)` checks with `role === ROLES.ADMIN` or use `hasPermission` query

**Files to update**:
- `convex/actions.ts` - Replace `getAuthUserId` and permission checks
- `convex/feedback_submissions.ts` - Replace `getAuthUserId`
- `convex/courts.ts` - Replace `getAuthUserId` and admin check
- `convex/scans.ts` - Replace permission checks

### 4.5 Create Migration Scripts

**`convex/migrations/prepare-migration.ts`**:
Create internalMutation that:
- Queries all existing users from users table
- For each user, inserts record into user_migration table with:
  - oldUserId from user._id
  - clerkUserId as empty string
  - email from user.email
  - status as 'pending'
- Returns count of records and list of {oldUserId, email}

**`convex/migrations/map-user.ts`**:
Create internalMutation that:
- Takes oldUserId and clerkUserId as arguments
- Queries user_migration table by oldUserId index
- For each matching record, updates:
  - clerkUserId from argument
  - status to 'migrated'
  - migratedAt to current timestamp

**`convex/migrations/validate.ts`**:
Create query that:
- Queries all migration records from user_migration table
- Queries all users from users table
- Returns statistics:
  - totalOldUsers: migration records count
  - totalNewUsers: users table count
  - successfullyMigrated: records with status 'migrated'
  - pending: records with status 'pending'
  - failed: records with status 'failed'

### Checklist
- [ ] Create ROLES object with GUEST, USER, ADMIN constants
- [ ] Create ROLE_PERMISSIONS object mapping roles to permissions
- [ ] Create me query function
- [ ] Create hasPermission query function
- [ ] Create hasRole query function
- [ ] Create upsertFromClerk mutation
- [ ] Create deleteFromClerk mutation
- [ ] Create setUserRole mutation
- [ ] Create updateProfile mutation
- [ ] Create generateUploadUrl mutation
- [ ] Create updateProfileImage mutation
- [ ] Create getProfileImageUrl mutation
- [ ] Create removeProfileImage mutation
- [ ] Create getCurrentUser helper function
- [ ] Create getCurrentUserOrThrow helper function
- [ ] Create getUserId helper function
- [ ] Import httpRouter from convex/server
- [ ] Import httpAction and Webhook from svix
- [ ] Create /clerk-webhook route
- [ ] Create validation function
- [ ] Update convex/actions.ts with helper functions
- [ ] Update convex/feedback_submissions.ts with helper functions
- [ ] Update convex/courts.ts with helper functions
- [ ] Update convex/scans.ts with helper functions
- [ ] Create prepare-migration.ts script
- [ ] Create map-user.ts script
- [ ] Create validate.ts script

---

## Phase 5: Frontend Changes

### 5.1 Update `src/main.tsx`

Modify the file to:
- Import ClerkProvider and useAuth from @clerk/clerk-react
- Import ConvexProviderWithClerk from convex-react-clerk
- Keep existing imports for Router, ConvexReactClient, QueryClient, etc.
- Create Convex client instance as before
- Create router with:
  - Same routeTree and defaultPreload settings
  - Loader component as defaultPendingComponent
  - Update context to include convex client
- Update Wrap component to:
  - Create QueryClient
  - Wrap children in ClerkProvider with publishableKey from env
  - Wrap in ConvexProviderWithClerk passing convex client and useAuth
  - Wrap in QueryClientProvider with queryClient
- Keep existing type declaration and root rendering logic

### 5.2 Update `src/components/header.tsx`

Modify to:
- Import Authenticated and Unauthenticated from convex/react
- Import SignInButton and UserButton from @clerk/clerk-react
- Keep existing imports (Link, ModeToggle, etc.)
- Use useConvexAuth hook to check isLoading and isAuthenticated
- Return null while loading
- For authenticated users:
  - Show "Account" button linking to /account with UserIcon
  - Show UserButton component for profile menu
- For unauthenticated users:
  - Show "Sign in" button using SignInButton with UserIcon
- Keep existing navigation and mode toggle

### 5.3 Create `src/hooks/useCurrentUser.ts`

Create hook that:
- Imports useConvexAuth and useQuery from convex/react
- Imports api.users.me from convex
- Uses useEffect to sync authentication state
- Returns object with:
  - isLoading: true if Convex loading or authenticated but no userId
  - isAuthenticated: true if authenticated and userId exists
  - user: user object from query

### 5.4 Update `src/routes/_authed.account.tsx`

Replace permission checks with role checks:
- Import ROLES from convex/users
- Use api.users.me query to get current user
- Display user email and role in the UI
- Show admin privileges message if user.role === ROLES.ADMIN

### 5.5 Update `src/routes/login.tsx`

Replace with Clerk's sign-in component:
- Import SignIn from @clerk/clerk-react
- Keep createFileRoute and redirect
- Use beforeLoad to redirect to home if context.me exists
- Replace custom form with Clerk SignIn component
- Style SignIn with transparent appearance
- Center the component in a full-height container

### 5.6 Update All Route Guards

**`src/routes/_authed.tsx`**:
- Update beforeLoad to check context.me exists
- If no user, redirect to /login with redirect URL in search params
- Keep Outlet component

**`src/routes/_authed.admin.tsx`**:
- Import ROLES from convex/users
- Update beforeLoad to check context.me.role === ROLES.ADMIN
- If not admin, redirect to /unauthorized with redirect URL and reason
- Keep Outlet component

### Checklist
- [ ] Import ClerkProvider and useAuth from @clerk/clerk-react
- [ ] Import ConvexProviderWithClerk from convex-react-clerk
- [ ] Create Convex client instance
- [ ] Create router with convex client in context
- [ ] Update Wrap component with providers
- [ ] Import Authenticated and Unauthenticated
- [ ] Import SignInButton and UserButton
- [ ] Use useConvexAuth hook
- [ ] Update header component logic
- [ ] Create useCurrentUser hook
- [ ] Import ROLES from convex/users
- [ ] Update account route to use api.users.me
- [ ] Display user email and role
- [ ] Import SignIn from @clerk/clerk-react
- [ ] Update login route beforeLoad
- [ ] Replace form with Clerk SignIn
- [ ] Update _authed.tsx beforeLoad
- [ ] Update _authed.admin.tsx beforeLoad

---

## Phase 6: Data Migration Process

### 6.1 Pre-Migration Backup

Export all data before migration and create a commit:
- Run convex export command to save data to JSON file
- Create git commit with message "Pre-migration backup"

### 6.2 Migration Steps

#### Step 1: Deploy New Schema

Start dev backend with new schema or deploy to production using convex deploy.

#### Step 2: Run Preparation Script

Create migration tracking records by running the prepareMigration function with message "Prepare user migration".

#### Step 3: Create Users in Clerk

For each existing user:
1. Go to Clerk Dashboard → Users → Create User
2. Enter email from old user record
3. Send password reset email (user will set new password)
4. Set role in Public Metadata:
   - Users with admin.access permission → "admin"
   - All other registered users (with email) → "user"
   - Anonymous users → Do not create in Clerk (they will need to sign up after migration)

**Alternative**: Use Clerk Admin API for bulk creation

#### Step 4: Map Old Users to Clerk Users

For each migrated user, run mapOldUserToClerk function with:
- oldUserId from migration tracking record
- clerkUserId from Clerk user ID

#### Step 5: Verify Migration

Run validate query to get migration statistics showing successful migrations, pending, and failed.

### 6.3 Post-Migration Validation

After completing all user migrations:
1. Sign in with migrated account (set new password)
2. Verify role is correctly set
3. Test admin routes access
4. Test data access (scans, feedback, courts)
5. Check webhook events in Clerk Dashboard

### Checklist
- [ ] Run convex export command to save data to JSON file
- [ ] Create git commit with message "Pre-migration backup"
- [ ] Deploy new schema to Convex
- [ ] Run prepareMigration function
- [ ] Create users in Clerk Dashboard for each existing user
- [ ] Send password reset emails
- [ ] Set roles in Public Metadata
- [ ] Run mapOldUserToClerk function for each user
- [ ] Run validate query
- [ ] Sign in with migrated account (set new password)
- [ ] Verify role is correctly set
- [ ] Test admin routes access
- [ ] Test data access (scans, feedback, courts)
- [ ] Check webhook events in Clerk Dashboard

---

## Phase 7: Testing & Rollout

### 7.1 Testing Checklist

Complete these tests:
- Sign in with migrated account (password reset)
- Sign in with new account
- Verify user role is set correctly
- Test admin routes access
- Test scans/feedback creation
- Verify all data (scans, feedback, courts) is accessible
- Test webhook events (create/update user)
- Test profile image upload
- Test sign out functionality
- Test role assignment (admin to another user)
- Test permission checks in all mutations

### 7.2 Staged Rollout

**Development Environment**:
1. Complete migration with test data
2. Test all functionality thoroughly
3. Document any issues found

**Production Migration**:
1. Set up production Clerk app
2. Update environment variables in Convex Dashboard
3. Deploy schema changes to production
4. Run migration scripts
5. Monitor logs and webhooks for issues
6. Have rollback plan ready

### 7.3 Rollback Plan

If critical issues arise:
1. Revert frontend using git revert on migration commit
2. Keep Clerk setup (can resume later)
3. Data integrity: Original data remains in Convex; new users table will have Clerk users; can manually merge later if needed

### Checklist
- [ ] Sign in with migrated account (password reset)
- [ ] Sign in with new account
- [ ] Verify user role is set correctly
- [ ] Test admin routes access
- [ ] Test scans/feedback creation
- [ ] Verify all data (scans, feedback, courts) is accessible
- [ ] Test webhook events (create/update user)
- [ ] Test profile image upload
- [ ] Test sign out functionality
- [ ] Test role assignment (admin to another user)
- [ ] Test permission checks in all mutations
- [ ] Complete migration with test data in development
- [ ] Test all functionality thoroughly
- [ ] Document any issues found
- [ ] Set up production Clerk app
- [ ] Update environment variables in Convex Dashboard
- [ ] Deploy schema changes to production
- [ ] Run migration scripts in production
- [ ] Monitor logs and webhooks for issues
- [ ] Prepare rollback plan

---

## Phase 8: Cleanup

### 8.1 Remove Old Files (After 2+ Weeks Stable)

Remove these files:
- convex/auth.ts
- convex/actions/password.ts
- convex/internal/ directory
- convex/migrations/ directory

### 8.2 Remove Migration Table

From `convex/schema.ts`, remove the user_migration table definition.

### 8.3 Update Documentation

Update `AGENTS.md`:
- Replace "Convex Auth" with "Clerk"
- Document role system
- Update permission checking patterns
- Add Clerk webhook setup instructions

### Checklist
- [ ] Remove convex/auth.ts
- [ ] Remove convex/actions/password.ts
- [ ] Remove convex/internal/ directory
- [ ] Remove convex/migrations/ directory
- [ ] Remove user_migration table from convex/schema.ts
- [ ] Update AGENTS.md - Replace "Convex Auth" with "Clerk"
- [ ] Update AGENTS.md - Document role system
- [ ] Update AGENTS.md - Update permission checking patterns
- [ ] Update AGENTS.md - Add Clerk webhook setup instructions

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|---------|--------------|------------|
| **Password reset required** | High user friction | Certain | Send clear email communication; provide easy reset flow |
| **Role mapping errors** | Admins locked out | Low | Test with admin account first; keep backup access via Clerk Dashboard |
| **Webhook failures** | Stale user data | Medium | Monitor webhook logs; implement retry logic |
| **Data loss** | Critical | Low | Backup before migration; test with subset first |
| **Downtime** | User impact | Medium | Schedule during low-traffic period; prepare rollback plan |
| **JWT template issues** | Auth breaks | Low | Test in development first; follow Clerk docs exactly |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|-----------|-------|
| Phase 1: Clerk Setup | 2-4 hours | Create app, JWT template, webhook |
| Phase 2: Environment & Dependencies | 1-2 hours | Install packages, configure env vars |
| Phase 3: Schema Changes | 2-3 hours | Update schema, add migration table |
| Phase 4: Backend Changes | 4-6 hours | New users.ts, auth helpers, webhook, migrations |
| Phase 5: Frontend Changes | 3-4 hours | Update main.tsx, components, routes |
| Phase 6: Data Migration | 4-8 hours | Depends on user count |
| Phase 7: Testing & Rollout | 4-6 hours | Thorough testing, staged deployment |
| Phase 8: Cleanup | 1-2 hours | After stable period |

**Total**: 21-35 hours (3-5 days)

---

## Success Criteria

Migration is successful when:
1. All users can sign in with Clerk (after password reset)
2. Roles are correctly assigned (user or admin only; guest is implicit)
3. Unauthenticated users have guest permissions (read-only)
4. Authenticated users with no explicit role have user permissions (full access)
5. Admin users have admin permissions
6. All data is accessible (scans, feedback, courts, uploads)
7. Admin routes work for admin users only
8. Permission checks work based on authentication status and role
9. Webhooks sync user data automatically
10. Profile features work (name update, image upload)
11. Zero data loss from migration

---

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Convex Auth in Functions](https://docs.convex.dev/auth/functions-auth)
- [Storing Users in Convex Database](https://docs.convex.dev/auth/database-auth)
- [Clerk JWT Templates](https://dashboard.clerk.com/~/jwt-templates)

---

## Appendix: Permission to Role Mapping

### Old System (Permissions Array)
- Anonymous user: ['scans.read', 'training.read']
- Regular user: ['scans.read', 'scans.write', 'scans.execute', 'training.read', 'training.write']
- Admin user: ['admin.access', 'scans.read', 'scans.write', 'scans.execute', 'training.read', 'training.write']

### New System (Roles)
- Guest (formerly anonymous): Unauthenticated → ['scans.read', 'training.read']
- User (formerly regular user): role 'user' or undefined → ['scans.read', 'scans.write', 'scans.execute', 'training.read', 'training.write']
- Admin: role 'admin' → ['admin.access', 'scans.read', 'scans.write', 'scans.execute', 'training.read', 'training.write']

### Migration Rule

When migrating users from old system to new system:
- If user.permissions includes 'admin.access', set role to 'admin'
- Else if user has email and is not anonymous, set role to 'user' (or omit to default to user)
- Anonymous users: Do NOT migrate - they will need to sign up after migration

**Important**: Guest is never stored in the database. Unauthenticated users are checked separately and receive guest permissions.
