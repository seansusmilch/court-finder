import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { DEFAULT_USER_PERMISSIONS } from './constants';

type AuthCtx = QueryCtx | MutationCtx;

type ClerkIdentity = Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>;

function getIdentityField(identity: ClerkIdentity, key: string): string | null {
  const value = identity ? (identity as Record<string, unknown>)[key] : null;
  return typeof value === 'string' && value.trim() ? value : null;
}

export function getRolePermissions(role: Doc<'users'>['role'] | undefined): string[] {
  if (role === 'admin') {
    return [...DEFAULT_USER_PERMISSIONS, 'admin.access'];
  }

  return [...DEFAULT_USER_PERMISSIONS];
}

export function identityToUserFields(identity: NonNullable<ClerkIdentity>) {
  const firstName = getIdentityField(identity, 'firstName');
  const lastName = getIdentityField(identity, 'lastName');
  const name =
    getIdentityField(identity, 'name') ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    null;
  const email =
    getIdentityField(identity, 'email') ||
    getIdentityField(identity, 'emailAddress') ||
    getIdentityField(identity, 'primaryEmailAddress') ||
    null;
  const imageUrl =
    getIdentityField(identity, 'pictureUrl') ||
    getIdentityField(identity, 'imageUrl') ||
    null;

  return {
    externalId: identity.subject,
    name: name || undefined,
    email: email || undefined,
    imageUrl: imageUrl || undefined,
    emailVerified: email ? true : undefined,
    isAnonymous: false,
    updatedAt: Date.now(),
  };
}

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query('users')
    .withIndex('by_external_id', (q: any) => q.eq('externalId', identity.subject))
    .unique();
}

export async function getCurrentUserId(ctx: AuthCtx) {
  const user = await getCurrentUser(ctx);
  return user?._id ?? null;
}

export async function ensureCurrentUserRecord(ctx: MutationCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const existing = await ctx.db
    .query('users')
    .withIndex('by_external_id', (q: any) => q.eq('externalId', identity.subject))
    .unique();

  if (existing) {
    const fields = identityToUserFields(identity);
    await ctx.db.patch(existing._id, {
      ...fields,
      createdAt: existing.createdAt ?? Date.now(),
    });
    return await ctx.db.get(existing._id);
  }

  const userId = await ctx.db.insert('users', {
    ...identityToUserFields(identity),
    createdAt: Date.now(),
    permissions: [...DEFAULT_USER_PERMISSIONS],
    role: 'user' as const,
  });

  return await ctx.db.get(userId);
}

export async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<'users'>> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error('Not authenticated');
  }

  return user;
}
