'use node';

import { internal, api } from './_generated/api';
import { action } from './_generated/server';
import type { ActionCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { env } from './env';
import { PERMISSIONS } from './lib/constants';

type ClerkEmailAddress = {
  id: string;
  email_address: string;
  verification?: { status?: string };
};

type ClerkUser = {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
};

type ClerkUserListResponse = ClerkUser[] | { data?: ClerkUser[] };

type LocalMigrationUser = {
  userId: Id<'users'>;
  externalId: string | null;
  email: string | null;
};

type MigrationResult = {
  apply: boolean;
  cleanupLegacyFields: boolean;
  localUserCount: number;
  clerkUserCount: number;
  alreadyLinkedCount: number;
  matchedCount: number;
  missingEmailCount: number;
  missingClerkUserCount: number;
  ambiguousMatchCount: number;
  alreadyLinkedClerkUserCount: number;
  duplicateExternalIdCount: number;
  unmatchedCount: number;
  cleanupReady: boolean;
  linkedCount: number;
  cleanedCount: number;
  startTs: number;
  durationMs: number;
};

function getVerifiedPrimaryEmail(user: ClerkUser): string | null {
  const primaryEmail = user.email_addresses?.find(
    (emailAddress) => emailAddress.id === user.primary_email_address_id
  );
  if (primaryEmail?.verification?.status !== 'verified') return null;
  return primaryEmail.email_address.trim().toLowerCase();
}

async function listClerkUsers(secretKey: string): Promise<ClerkUser[]> {
  const users: ClerkUser[] = [];
  const limit = 500;
  let offset = 0;

  while (true) {
    const url = new URL('https://api.clerk.com/v1/users');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Clerk user migration lookup failed with status ${response.status}`);
    }

    const body = (await response.json()) as ClerkUserListResponse;
    const page = Array.isArray(body) ? body : body.data ?? [];
    users.push(...page);

    if (page.length < limit) return users;
    offset += page.length;
  }
}

export const migrateLegacyUsers = action({
  args: {
    apply: v.optional(v.boolean()),
    cleanupLegacyFields: v.optional(v.boolean()),
  },
  handler: async (
    ctx: ActionCtx,
    args
  ): Promise<MigrationResult> => {
    const startTs = Date.now();
    const apply = args.apply === true;
    const cleanupLegacyFields = args.cleanupLegacyFields === true;

    if (cleanupLegacyFields && !apply) {
      throw new Error('cleanupLegacyFields requires apply=true');
    }

    const canMigrate = await ctx.runQuery(api.users.hasPermission, {
      permission: PERMISSIONS.ADMIN.ACCESS,
    });
    if (!canMigrate) {
      throw new Error('Administrator access is required for the Clerk migration');
    }

    const secretKey = env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is required for the Clerk migration');
    }

    const [localUsers, clerkUsers]: [LocalMigrationUser[], ClerkUser[]] = await Promise.all([
      ctx.runQuery(internal.users.listForClerkMigration, {}),
      listClerkUsers(secretKey),
    ]) as [LocalMigrationUser[], ClerkUser[]];

    const localEmailCounts = new Map<string, number>();
    const localExternalIdCounts = new Map<string, number>();
    for (const user of localUsers) {
      if (user.externalId) {
        localExternalIdCounts.set(
          user.externalId,
          (localExternalIdCounts.get(user.externalId) ?? 0) + 1
        );
        continue;
      }
      if (!user.email) continue;
      const email = user.email.trim().toLowerCase();
      localEmailCounts.set(email, (localEmailCounts.get(email) ?? 0) + 1);
    }

    const duplicateExternalIdCount = [...localExternalIdCounts.values()]
      .filter((count) => count > 1)
      .reduce((total, count) => total + count - 1, 0);

    const clerkUsersByEmail = new Map<string, string[]>();
    for (const user of clerkUsers) {
      const email = getVerifiedPrimaryEmail(user);
      if (!email) continue;
      const matches = clerkUsersByEmail.get(email) ?? [];
      matches.push(user.id);
      clerkUsersByEmail.set(email, matches);
    }

    const links: Array<{ userId: Id<'users'>; clerkUserId: string }> = [];
    let alreadyLinkedCount = 0;
    let missingEmailCount = 0;
    let missingClerkUserCount = 0;
    let ambiguousMatchCount = 0;
    let alreadyLinkedClerkUserCount = 0;

    for (const user of localUsers) {
      if (user.externalId) {
        alreadyLinkedCount += 1;
        continue;
      }

      if (!user.email) {
        missingEmailCount += 1;
        continue;
      }

      const email = user.email.trim().toLowerCase();
      if ((localEmailCounts.get(email) ?? 0) > 1) {
        ambiguousMatchCount += 1;
        continue;
      }

      const clerkMatches = clerkUsersByEmail.get(email) ?? [];
      if (clerkMatches.length === 0) {
        missingClerkUserCount += 1;
        continue;
      }
      if (clerkMatches.length > 1) {
        ambiguousMatchCount += 1;
        continue;
      }

      if (localExternalIdCounts.has(clerkMatches[0])) {
        alreadyLinkedClerkUserCount += 1;
        continue;
      }

      links.push({ userId: user.userId, clerkUserId: clerkMatches[0] });
    }

    const unmatchedCount =
      missingEmailCount +
      missingClerkUserCount +
      ambiguousMatchCount +
      alreadyLinkedClerkUserCount;
    const cleanupReady = unmatchedCount === 0 && duplicateExternalIdCount === 0;

    if (cleanupLegacyFields && !cleanupReady) {
      throw new Error(
        `Cannot clean legacy fields while migration has ${unmatchedCount} unmatched users or ${duplicateExternalIdCount} duplicate Clerk links`
      );
    }

    let linkedCount = 0;
    let cleanedCount = 0;
    if (apply) {
      const result = await ctx.runMutation(internal.users.applyClerkMigrationLinks, {
        links,
        cleanupLegacyFields,
      });
      linkedCount = result.linkedCount;
      cleanedCount = result.cleanedCount;
    }

    const result: MigrationResult = {
      apply,
      cleanupLegacyFields,
      localUserCount: localUsers.length,
      clerkUserCount: clerkUsers.length,
      alreadyLinkedCount,
      matchedCount: links.length,
      missingEmailCount,
      missingClerkUserCount,
      ambiguousMatchCount,
      alreadyLinkedClerkUserCount,
      duplicateExternalIdCount,
      unmatchedCount,
      cleanupReady,
      linkedCount,
      cleanedCount,
      startTs,
      durationMs: Date.now() - startTs,
    };

    console.log('clerk_legacy_user_migration_complete', result);
    return result;
  },
});
