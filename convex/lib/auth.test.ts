import { describe, expect, it, vi } from 'vitest';

import {
  ensureCurrentUserRecord,
  getRoleFromIdentity,
  getRolePermissions,
  identityToUserFields,
  roleHasPermissionForIdentity,
} from './auth';

const clerkIdentity = {
  subject: 'user_clerk_123',
  issuer: 'https://example.clerk.accounts.dev',
  tokenIdentifier: 'https://example.clerk.accounts.dev|user_clerk_123',
  role: 'admin',
};

describe('Clerk auth helpers', () => {
  it('stores only the Clerk subject in the local identity bridge', () => {
    expect(identityToUserFields(clerkIdentity)).toEqual({
      externalId: 'user_clerk_123',
    });
  });

  it('reads a direct Clerk role claim', () => {
    expect(getRoleFromIdentity(clerkIdentity)).toBe('admin');
    expect(roleHasPermissionForIdentity(clerkIdentity, 'admin.access')).toBe(true);
  });

  it('reads a nested metadata role claim', () => {
    expect(
      getRoleFromIdentity({
        ...clerkIdentity,
        role: undefined,
        metadata: { role: 'admin' },
      })
    ).toBe('admin');
  });

  it('defaults an absent or unsupported role to a regular user', () => {
    expect(
      getRoleFromIdentity({ ...clerkIdentity, role: 'unsupported' })
    ).toBe('user');
    expect(roleHasPermissionForIdentity(clerkIdentity, 'unknown.permission')).toBe(false);
  });

  it('derives permissions from roles without persisting them', () => {
    expect(getRolePermissions('admin')).toContain('admin.access');
    expect(getRolePermissions('user')).not.toContain('admin.access');
  });

  it('reuses an existing local identity bridge', async () => {
    const existing = { _id: 'local_user', _creationTime: 1, externalId: clerkIdentity.subject };
    const ctx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue(clerkIdentity) },
      db: {
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({ unique: vi.fn().mockResolvedValue(existing) }),
        }),
        insert: vi.fn(),
      },
    };

    const result = await ensureCurrentUserRecord(ctx as never);

    expect(result).toMatchObject({ ...existing, role: 'admin' });
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it('creates a local identity bridge without profile data', async () => {
    const insert = vi.fn().mockResolvedValue('local_user');
    const get = vi.fn().mockResolvedValue({
      _id: 'local_user',
      _creationTime: 1,
      externalId: clerkIdentity.subject,
    });
    const ctx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue(clerkIdentity) },
      db: {
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({ unique: vi.fn().mockResolvedValue(null) }),
        }),
        insert,
        get,
      },
    };

    const result = await ensureCurrentUserRecord(ctx as never);

    expect(insert).toHaveBeenCalledWith('users', { externalId: clerkIdentity.subject });
    expect(result).toMatchObject({ externalId: clerkIdentity.subject, role: 'admin' });
  });
});
