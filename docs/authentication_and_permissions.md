# Authentication and Permissions

This document outlines the authentication and permissions system for the project, which is built on the Convex backend platform using the `@convex-dev/auth` library.

## Core Technology

- **Backend & Auth Library:** [Convex](https://convex.dev/) with `@convex-dev/auth`.
- **Identity Provider:** The system is configured to use a password-based authentication provider. This is defined in `convex/auth.ts`.

## Authentication Flow

The authentication process is handled by the `@convex-dev/auth` library and Convex's built-in authentication system.

1.  **Frontend Interaction:** The user initiates login/logout through the UI, specifically the component in `src/routes/login.tsx`. This component handles both sign-in and sign-up flows.
2.  **Provider Sign-In:** The `useAuthActions()` hook from `@convex-dev/auth/react` is used to call the `signIn` action. This action, configured in `convex/auth.ts`, uses the `Password` provider to authenticate the user.
3.  **User Record Sync:** Upon successful authentication, the `@convex-dev/auth` library automatically handles the creation and updating of user records in the `users` table. The schema for this is defined in `convex/schema.ts` via the `authTables` helper.

The `users` table stores essential information for the user, including email and permissions.

## Permissions System

Permissions are managed through a `permissions` attribute on the `users` table.

-   **Schema:** The `users` table in `convex/schema.ts` has an optional `permissions` field, which is an array of strings.
-   **Permission Constants:** All permission strings are centralized in `convex/lib/constants.ts` under the `PERMISSIONS` export. This ensures consistency and avoids magic strings. All permissions should follow the `feature:permission` convention (e.g., `scans:read`, `training:submit`).
-   **Enforcement (Backend):** Convex functions (queries, mutations, and actions) are responsible for enforcing permissions. Before performing a protected action, a function must use the `requirePermission` helper from `convex/auth.ts`. This helper verifies the user's identity and checks if they have the required permission.
-   **Checking Permissions (Frontend):** For UI purposes (e.g., conditionally rendering a button), the client can use the `hasPermission` query from `convex/users.ts`. This allows the UI to react to a user's permissions without exposing sensitive logic.

**Example (Backend Enforcement):**

```typescript
// Inside a Convex mutation
import { PERMISSIONS } from './lib/constants';
import { requirePermission } from './auth';

export const someProtectedMutation = mutation({
  async handler(ctx, args) {
    await requirePermission(ctx, PERMISSIONS.TRAINING.SUBMIT);

    // ... proceed with protected logic
  },
});
```

**Example (Frontend Check):**

```typescript
// Inside a React component
import { useQuery } from 'convex/react';
import { api } from '@backend/api';
import { PERMISSIONS } from '@backend/lib/constants';

function MyComponent() {
  const canSubmit = useQuery(api.users.hasPermission, {
    permission: PERMISSIONS.TRAINING.SUBMIT,
  });

  return canSubmit ? <Button>Submit</Button> : null;
}
```

## Key Files

-   `convex/auth.ts`: Configures authentication providers and contains permission-checking helpers like `requirePermission`.
-   `convex/users.ts`: Contains user-related queries, including `hasPermission` for frontend checks.
-   `convex/lib/constants.ts`: Defines all permission strings used throughout the application.
-   `convex/schema.ts`: Defines the schema for the `users` table, including the critical `permissions` field.
-   `src/routes/login.tsx`: The frontend implementation for authentication.

## Future Refactoring and Considerations

1.  **Adding More Auth Providers:** To add a new provider (e.g., Google, GitHub, Clerk, Auth0), it would need to be added to the `providers` array in `convex/auth.ts` and the `convex/auth.config.ts` would need to be updated.
2.  **Role-Based Access Control (RBAC):** The current `permissions` array is flexible. For a more structured approach, a `role` field could be added to the user, and roles could be mapped to a predefined set of permissions. This would simplify permission management for common user types (e.g., `admin`, `member`).
3.  **User Profile Management:** If users need to edit their profile information, new mutations will need to be added to `convex/users.ts` to handle these updates.
