import { describe, expect, it, vi } from 'vitest';

import { ensureCurrentUserRecord, getRolePermissions, identityToUserFields } from './auth';

const clerkIdentity = {
  subject: 'user_clerk_123',
  issuer: 'https://example.clerk.accounts.dev',
  tokenIdentifier: 'https://example.clerk.accounts.dev|user_clerk_123',
  name: 'Casey Court',
  email: 'CASEY@EXAMPLE.COM',
  emailVerified: true,
};

describe('Clerk auth helpers', () => {
  it('maps Clerk claims into normalized Convex user fields', () => {
    expect(identityToUserFields(clerkIdentity)).toMatchObject({
      externalId: 'user_clerk_123',
      name: 'Casey Court',
      email: 'casey@example.com',
      emailVerified: true,
      isAnonymous: false,
    });
  });

  it('preserves admin permissions', () => {
    expect(getRolePermissions('admin')).toContain('admin.access');
    expect(getRolePermissions('user')).not.toContain('admin.access');
  });

  it('links a legacy user by email instead of inserting a duplicate', async () => {
    const legacyUser = {
      _id: 'legacy_user_id',
      _creationTime: 1,
      email: 'casey@example.com',
      permissions: ['scans.read'],
      role: 'user' as const,
    };
    const unique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(legacyUser);
    const patch = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn();
    const get = vi.fn().mockResolvedValue({
      ...legacyUser,
      externalId: clerkIdentity.subject,
    });
    const query = vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnValue({ unique }),
    });
    const ctx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue(clerkIdentity) },
      db: { query, patch, insert, get },
    };

    const result = await ensureCurrentUserRecord(ctx as never);

    expect(patch).toHaveBeenCalledWith(
      legacyUser._id,
      expect.objectContaining({
        externalId: clerkIdentity.subject,
        email: 'casey@example.com',
      })
    );
    expect(insert).not.toHaveBeenCalled();
    expect(result?._id).toBe(legacyUser._id);
  });

  it.each([false, undefined])('does not trust an email with verification %s', (emailVerified) => {
    expect(identityToUserFields({ ...clerkIdentity, emailVerified })).not.toHaveProperty('email');
  });

  it('rejects an email already linked to a different Clerk identity', async () => {
    const unique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
      _id: 'legacy_user_id', email: 'casey@example.com', externalId: 'another_clerk_user',
    });
    const patch = vi.fn();
    const insert = vi.fn();
    const ctx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue(clerkIdentity) },
      db: { query: vi.fn().mockReturnValue({ withIndex: vi.fn().mockReturnValue({ unique }) }), patch, insert },
    };
    await expect(ensureCurrentUserRecord(ctx as never)).rejects.toThrow('already linked');
    expect(patch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('waits for verification instead of creating a duplicate before the webhook', async () => {
    const insert = vi.fn();
    const ctx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue({ ...clerkIdentity, emailVerified: false }) },
      db: {
        query: vi.fn().mockReturnValue({ withIndex: vi.fn().mockReturnValue({ unique: vi.fn().mockResolvedValue(null) }) }),
        insert,
      },
    };
    await expect(ensureCurrentUserRecord(ctx as never)).rejects.toThrow('verified primary email');
    expect(insert).not.toHaveBeenCalled();
  });

  it('preserves legacy admin access and custom permissions without a role field', async () => {
    const existing = { _id: 'legacy_admin', permissions: ['admin.access', 'custom.permission'] };
    const patch = vi.fn();
    const ctx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue(clerkIdentity) },
      db: {
        query: vi.fn().mockReturnValue({ withIndex: vi.fn().mockReturnValue({ unique: vi.fn().mockResolvedValue(existing) }) }),
        patch,
        get: vi.fn().mockResolvedValue(existing),
      },
    };
    await ensureCurrentUserRecord(ctx as never);
    expect(patch).toHaveBeenCalledWith('legacy_admin', expect.objectContaining({
      role: 'admin', permissions: expect.arrayContaining(['admin.access', 'custom.permission']),
    }));
  });
});
