# Clerk Migration Scripts

These scripts address critical gaps in the Clerk migration plan by automating user creation, adding on-demand sync, and handling profile image migration.

## Prerequisites

1. **Install Clerk SDK**:
   ```bash
   bun add @clerk/clerk-sdk-node @clerk/backend svix convex-react-clerk
   bun remove @convex-dev/auth @convex-dev/migrations @auth/core
   ```

2. **Set environment variables**:
   - `CLERK_SECRET_KEY` - From Clerk Dashboard → API Keys
   - `CLERK_WEBHOOK_SECRET` - From Clerk Dashboard → Webhooks
   - `CLERK_JWT_ISSUER_DOMAIN` - Format: `https://your-app.clerk.accounts.dev`

## Scripts Overview

### 1. createUsersInClerk.ts

Automatically creates users in Clerk via Admin API (replaces manual user creation).

**Features**:
- Reads migration records from Convex
- Maps old permissions to new roles (admin or user)
- Creates users with appropriate roles in metadata (or omits role for default users)
- Sends password reset emails automatically
- Skips anonymous users (no email) - they will need to sign up after migration

**Usage**:
```bash
# Set up environment
export CLERK_SECRET_KEY="sk_test_..."
export VITE_CONVEX_URL="https://your-app.convex.site"

# Run the script
bun scripts/migration/createUsersInClerk.ts
```

**Output**:
- List of successfully created users with Clerk IDs
- List of failed users with error messages
- Next steps (run mapping, validation)

---

### 2. prepareMigration.ts

Creates migration tracking records in Convex database.

**Features**:
- Reads all existing users from old users table
- Inserts records into user_migration table with status 'pending'
- Captures old permissions for role mapping

**Usage**:
```bash
# After deploying new schema with user_migration table
bunx convex run migrations:prepareMigration
```

**Output**:
- Count of migration records created
- List of user IDs and emails

---

### 3. mapUsersToClerk.ts

Maps old Convex user IDs to new Clerk user IDs.

**Features**:
- Supports single user mapping
- Supports bulk mapping
- Updates migration status to 'migrated'
- Records timestamp

**Usage (single)**:
```bash
bunx convex run migrations:mapUserToClerk --json '{"oldUserId": "abc123", "clerkUserId": "user_xxx"}'
```

**Usage (bulk)**:
```bash
bunx convex run migrations:mapUsersBulk --json '{
  "mappings": [
    {"oldUserId": "abc123", "clerkUserId": "user_xxx"},
    {"oldUserId": "def456", "clerkUserId": "user_yyy"}
  ]
}'
```

---

### 4. validate.ts

Validates migration status and provides statistics.

**Features**:
- Counts total old users and new users
- Reports successfully migrated users
- Lists pending and failed migrations
- Provides failure reasons

**Usage**:
```bash
bunx convex run migrations:validateMigration
```

**Output**:
```json
{
  "totalOldUsers": 10,
  "totalNewUsers": 8,
  "successfullyMigrated": 8,
  "pending": 2,
  "failed": 0,
  "failedRecords": []
}
```

---

### 5. image-migration.ts

Migrates profile images from old users to new users.

**Features**:
- Transfers Convex storage IDs for profile images
- Preserves Clerk imageUrl if no Convex image exists
- Skips users who already have images
- Tracks migration counts and errors

**Usage**:
```bash
bunx convex run internal:migrateProfileImages
```

**Output**:
```json
{
  "migrated": 5,
  "skipped": 3,
  "errors": 0,
  "errorDetails": []
}
```

---

### 6. auth-helpers.ts

On-demand user sync to handle webhook failures or edge cases.

**Features**:
- `getCurrentUser()` - Get user by Clerk ID
- `getCurrentUserOrThrow()` - Require auth, throw if missing
- `getUserId()` - Get user ID or null
- `syncUserFromClerk()` - Fetch user from Clerk and insert into Convex
- `getCurrentUserOrSync()` - Get user or sync if missing

**Usage in backend functions**:
```typescript
import { getCurrentUserOrThrow } from './lib/auth-helpers';

export const myMutation = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    // Use user
  },
});
```

**Recommended pattern**: Use `getCurrentUserOrSync()` as fallback:
```typescript
export const myQuery = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrSync(ctx);
    // Syncs from Clerk if webhook missed the user
    return user;
  },
});
```

---

### 7. roles.ts

Utility functions for role-based permission checking.

**Features**:
- `ROLES` - Constants (USER, ADMIN)
- `ROLE_PERMISSIONS` - Mapping of roles to permissions
- `GUEST_PERMISSIONS` - Guest (unauthenticated) permissions
- `mapPermissionsToRole()` - Convert old permissions to new role
- `hasPermission()` - Check if role has specific permission (handles null/guest)
- `hasAnyPermission()` - Check if role has any of the permissions
- `hasAllPermissions()` - Check if role has all permissions
- `getPermissions()` - Get full permission array for a role

**Important**: Guest is never stored in the database. Role is `null` for unauthenticated users, undefined for regular users, and 'admin' for admins.

**Usage**:
```typescript
import { ROLES, hasPermission, getPermissions } from './lib/roles';

const isAdmin = user.role === ROLES.ADMIN;
const isGuest = user.role === null;
const canExecute = hasPermission(user.role, 'scans.execute');
const permissions = getPermissions(user.role);
```

---

## Migration Workflow

### Step 1: Deploy new schema
```bash
# Update schema.ts with new users table and user_migration table
bunx convex deploy
```

### Step 2: Prepare migration records
```bash
bunx convex run migrations:prepareMigration
```

### Step 3: Create users in Clerk
```bash
export CLERK_SECRET_KEY="sk_test_..."
bun scripts/migration/createUsersInClerk.ts
```

### Step 4: Map old users to Clerk users
```bash
# Create a mapping file (e.g., mappings.json) from createUsersInClerk output
bunx convex run migrations:mapUsersBulk --json "$(cat mappings.json)"
```

### Step 5: Validate migration
```bash
bunx convex run migrations:validateMigration
```

### Step 6: Migrate profile images
```bash
bunx convex run internal:migrateProfileImages
```

### Step 7: Test auth
- Sign in with migrated account (password reset email sent)
- Verify role is correct
- Test admin routes (if applicable)

---

## Troubleshooting

### Users not syncing after migration

If webhook fails or is delayed, `getCurrentUserOrSync()` will automatically sync the user on their first request. This is a safety net - don't rely on it as a primary sync mechanism.

### Anonymous users

Anonymous users are skipped during Clerk migration. They'll need to create a new account after migration. Unauthenticated users automatically get guest permissions without needing a user record.

### Profile images showing Clerk default

If a user had an image in the old system but shows Clerk's default avatar:
1. Check if image migration was successful
2. The new schema supports both `imageUrl` (Clerk) and `image` (Convex storage)
3. Convex storage takes precedence over Clerk imageUrl

### Permission errors after migration

1. Verify role was set correctly in Clerk metadata (or omitted for default user permissions)
2. Check webhook logs in Clerk Dashboard
3. Use `validateMigration` to see status
4. Try logging out and back in to trigger sync

### Guest users getting denied access

Guest (unauthenticated) users should have read-only access. If they're getting denied:
1. Check if the permission being checked is in GUEST_PERMISSIONS
2. Ensure the auth helper is returning null for unauthenticated users
3. Verify the backend function is using `hasPermission(role, permission)` which handles null role correctly

---

## Files Created

- `scripts/migration/createUsersInClerk.ts` - Bulk user creation in Clerk
- `scripts/migration/prepareMigration.ts` - Prepares migration tracking
- `scripts/migration/mapUsersToClerk.ts` - Maps old IDs to Clerk IDs
- `scripts/migration/validate.ts` - Validates migration status
- `scripts/migration/fetchMigrationRecords.ts` - Fetch helper for scripts
- `convex/migrations/fetchRecords.ts` - Convex query for fetch helper
- `convex/lib/auth-helpers.ts` - Auth helpers with on-demand sync
- `convex/lib/image-migration.ts` - Profile image migration
- `convex/lib/roles.ts` - Role and permission utilities

---

## Type Errors

You'll see type errors in these files until the migration is complete because:
1. The `user_migration` table doesn't exist yet
2. The new `users` table structure doesn't match the old schema
3. Clerk types aren't installed until you add the package

These errors are **expected** and will resolve after:
1. Updating the schema with new tables
2. Installing Clerk packages
3. Running the migration scripts

---

## Security Notes

- Never commit `CLERK_SECRET_KEY` to git
- Use environment variables for all secrets
- Clerk webhook secret should be in Convex environment variables, not frontend
- Password reset emails are sent automatically - you don't handle passwords directly
