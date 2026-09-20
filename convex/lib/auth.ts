import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { DEFAULT_USER_PERMISSIONS } from './constants';

type AuthCtx = QueryCtx | MutationCtx;

type ClerkIdentity = Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>;

function getIdentityField(identity: ClerkIdentity, key: string): string | null {
  const value = identity ? (identity as Record<string, unknown>)[key] : null;
  return typeof value === 'string' && value.trim() ? value : null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  return {
    externalId: identity.subject,
    ...(name ? { name } : {}),
    ...(email && identity.emailVerified === true
      ? { email: normalizeEmail(email), emailVerified: true }
      : {}),
    isAnonymous: false,
    updatedAt: Date.now(),
  };
}

export async function findUserByEmail(
  ctx: AuthCtx,
  email: string
): Promise<Doc<'users'> | null> {
  const normalizedEmail = normalizeEmail(email);
  let match = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', normalizedEmail))
    .unique();

  // Convex Auth stored legacy emails exactly as entered. Fall back to a
  // case-insensitive scan so a Clerk email such as `user@example.com` still
  // links to a legacy `User@Example.com` record instead of creating a new ID.
  if (!match) {
    const normalizedMatches = (await ctx.db.query('users').collect()).filter(
      (user) => user.email && normalizeEmail(user.email) === normalizedEmail
    );
    if (normalizedMatches.length > 1) {
      throw new Error('Multiple users share this email; migration requires manual resolution');
    }
    match = normalizedMatches[0] ?? null;
  }

  return match;
}

async function findUserForIdentity(
  ctx: AuthCtx,
  identity: NonNullable<ClerkIdentity>
): Promise<Doc<'users'> | null> {
  const byExternalId = await ctx.db
    .query('users')
    .withIndex('by_external_id', (q) => q.eq('externalId', identity.subject))
    .unique();

  if (byExternalId) return byExternalId;

  const { email } = identityToUserFields(identity);
  if (!email) return null;

  const match = await findUserByEmail(ctx, email);
  if (match?.externalId && match.externalId !== identity.subject) {
    throw new Error('Email is already linked to another Clerk user');
  }
  return match;
}

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await findUserForIdentity(ctx, identity);
}

export async function getCurrentUserId(ctx: AuthCtx) {
  const user = await getCurrentUser(ctx);
  return user?._id ?? null;
}

export async function ensureCurrentUserRecord(ctx: MutationCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const existing = await findUserForIdentity(ctx, identity);

  if (existing) {
    const fields = identityToUserFields(identity);
    const role = existing.role || (existing.permissions?.includes('admin.access') ? 'admin' : 'user');
    await ctx.db.patch(existing._id, {
      ...fields,
      createdAt: existing.createdAt ?? Date.now(),
      role,
      permissions: Array.from(new Set([...(existing.permissions || []), ...getRolePermissions(role)])),
    });
    return await ctx.db.get(existing._id);
  }

  const fields = identityToUserFields(identity);
  if (!fields.email) {
    throw new Error('A verified primary email is required to link your account');
  }
  const userId = await ctx.db.insert('users', {
    ...fields,
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
