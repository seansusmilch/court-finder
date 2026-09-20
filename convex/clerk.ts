'use node';

import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import { env } from './env';
import { ROLES, type UserRole } from './lib/constants';

type ClerkUserResponse = {
  public_metadata?: {
    role?: unknown;
  };
};

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
