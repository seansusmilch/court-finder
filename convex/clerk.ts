'use node';

import { action, internalAction } from './_generated/server';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { env } from './env';
import {
  PERMISSIONS,
  ROLES,
  type UserRole,
} from './lib/constants';

type ClerkUserResponse = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{
    id: string;
    email_address: string;
  }>;
  public_metadata?: {
    role?: unknown;
  };
};

type IdentityResolutionResult = {
  identities: Array<{
    userId: Id<'users'>;
    name: string | null;
    email: string | null;
    resolved: boolean;
  }>;
};

function getPrimaryEmail(user: ClerkUserResponse) {
  if (!user.primary_email_address_id) return null;

  return (
    user.email_addresses?.find(
      (emailAddress) => emailAddress.id === user.primary_email_address_id
    )?.email_address ?? null
  );
}

function getDisplayName(user: ClerkUserResponse) {
  const name = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return name || null;
}

export const resolveUserIdentities = action({
  args: {},
  handler: async (ctx): Promise<IdentityResolutionResult> => {
    const startTs = Date.now();
    const canAccess = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.ADMIN.ACCESS,
    });
    if (!canAccess) {
      throw new Error('Administrator access is required');
    }

    const secretKey = env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error('clerk_identity_resolution_configuration_error', {
        startTs,
        durationMs: Date.now() - startTs,
        missingEnvironmentVariable: 'CLERK_SECRET_KEY',
      });
      throw new Error('CLERK_SECRET_KEY is required to resolve Clerk identities');
    }

    const users = await ctx.runQuery(
      internal.users.listForClerkIdentityResolution,
      {}
    );
    const identities = await Promise.all(
      users.map(async (user) => {
        if (!user.externalId) {
          return {
            userId: user.userId,
            name: user.name,
            email: user.email,
            resolved: false,
          };
        }

        const lookupStartTs = Date.now();
        try {
          const response = await fetch(
            `https://api.clerk.com/v1/users/${encodeURIComponent(user.externalId)}`,
            {
              headers: {
                Authorization: `Bearer ${secretKey}`,
                Accept: 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Clerk user lookup failed with status ${response.status}`);
          }

          const clerkUser = (await response.json()) as ClerkUserResponse;
          return {
            userId: user.userId,
            name: getDisplayName(clerkUser) ?? user.name,
            email: getPrimaryEmail(clerkUser) ?? user.email,
            resolved: true,
          };
        } catch (error) {
          console.error('clerk_identity_lookup_failed', {
            startTs: lookupStartTs,
            durationMs: Date.now() - lookupStartTs,
            clerkUserId: user.externalId,
            userId: user.userId,
            error,
          });

          return {
            userId: user.userId,
            name: user.name,
            email: user.email,
            resolved: false,
          };
        }
      })
    );

    console.log('clerk_identity_resolution_complete', {
      startTs,
      durationMs: Date.now() - startTs,
      userCount: identities.length,
      resolvedCount: identities.filter((identity) => identity.resolved).length,
      unresolvedCount: identities.filter((identity) => !identity.resolved).length,
    });

    return { identities };
  },
});

function parseRole(value: unknown): UserRole | null {
  if (value === ROLES.ADMIN || value === ROLES.USER) return value;
  return null;
}

export const getUserRole = internalAction({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (_ctx, args): Promise<UserRole> => {
    const startTs = Date.now();
    const secretKey = env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is required for background Clerk authorization');
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(args.clerkUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('clerk_role_lookup_failed', {
        startTs,
        durationMs: Date.now() - startTs,
        clerkUserId: args.clerkUserId,
        status: response.status,
      });
      throw new Error(`Clerk role lookup failed with status ${response.status}`);
    }

    const user = (await response.json()) as ClerkUserResponse;
    const role = parseRole(user.public_metadata?.role);
    if (!role) {
      console.error('clerk_role_missing', {
        startTs,
        durationMs: Date.now() - startTs,
        clerkUserId: args.clerkUserId,
      });
      throw new Error('Clerk user has no supported application role');
    }

    console.log('clerk_role_lookup_complete', {
      startTs,
      durationMs: Date.now() - startTs,
      clerkUserId: args.clerkUserId,
      role,
    });

    return role;
  },
});
