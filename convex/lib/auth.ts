import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import {
  ROLE_PERMISSIONS,
  ROLES,
  roleHasPermission,
  type UserRole,
} from './constants';

type AuthCtx = QueryCtx | MutationCtx;

type ClerkIdentity = Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>;

export type CurrentUser = Doc<'users'> & {
  role: UserRole;
};

function readIdentityValue(identity: ClerkIdentity, key: string): unknown {
  return identity ? (identity as Record<string, unknown>)[key] : undefined;
}

function readRole(value: unknown): UserRole | null {
  if (value === ROLES.ADMIN || value === ROLES.USER) return value;
  return null;
}

export function getRoleFromIdentity(
  identity: NonNullable<ClerkIdentity>
): UserRole {
  const metadataKeys = ['metadata', 'publicMetadata', 'public_metadata'];
  const candidates: unknown[] = [readIdentityValue(identity, 'role')];

  for (const key of metadataKeys) {
    const metadata = readIdentityValue(identity, key);
    if (metadata && typeof metadata === 'object') {
      candidates.push((metadata as Record<string, unknown>).role);
    }
  }

  return candidates.map(readRole).find((role): role is UserRole => role !== null) ?? ROLES.USER;
}

export function roleHasPermissionForIdentity(
  identity: NonNullable<ClerkIdentity>,
  permission: string
): boolean {
  return roleHasPermission(getRoleFromIdentity(identity), permission);
}

export function getRolePermissions(role: UserRole): readonly string[] {
  return ROLE_PERMISSIONS[role];
}

export function identityToUserFields(identity: NonNullable<ClerkIdentity>) {
  return {
    externalId: identity.subject,
  };
}

async function findUserForIdentity(
  ctx: AuthCtx,
  identity: NonNullable<ClerkIdentity>
): Promise<Doc<'users'> | null> {
  return await ctx.db
    .query('users')
    .withIndex('by_external_id', (q) => q.eq('externalId', identity.subject))
    .unique();
}

function withRole(
  user: Doc<'users'>,
  identity: NonNullable<ClerkIdentity>
): CurrentUser {
  return {
    ...user,
    role: getRoleFromIdentity(identity),
  };
}

export async function getCurrentUser(ctx: AuthCtx): Promise<CurrentUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await findUserForIdentity(ctx, identity);
  return user ? withRole(user, identity) : null;
}

export async function getCurrentUserId(ctx: AuthCtx) {
  const user = await getCurrentUser(ctx);
  return user?._id ?? null;
}

export async function ensureCurrentUserRecord(
  ctx: MutationCtx
): Promise<CurrentUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const existing = await findUserForIdentity(ctx, identity);
  if (existing) return withRole(existing, identity);

  const userId = await ctx.db.insert('users', identityToUserFields(identity));
  const user = await ctx.db.get(userId);
  return user ? withRole(user, identity) : null;
}

export async function requireCurrentUser(ctx: AuthCtx): Promise<CurrentUser> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error('Not authenticated');
  }

  return user;
}
