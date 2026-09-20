import { describe, expect, it, vi } from 'vitest';
import { upsertFromClerk } from './users';

const handler = (upsertFromClerk as unknown as {
  _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
})._handler;

function context(
  existing: Record<string, unknown> | null = null,
  legacyUsers: Record<string, unknown>[] = []
) {
  const unique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
  return {
    db: {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({ unique }),
        collect: vi.fn().mockResolvedValue(legacyUsers),
      }),
      patch: vi.fn(),
      insert: vi.fn().mockResolvedValue('new_user'),
    },
  };
}

describe('Clerk webhook user synchronization', () => {
  it('does not link or create a user before their primary email is verified', async () => {
    const ctx = context({ _id: 'legacy_admin', role: 'admin' });
    expect(await handler(ctx, { id: 'clerk_user', email: 'test@example.com', emailVerified: false })).toBeNull();
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it('links a verified email and preserves a legacy admin without role metadata', async () => {
    const ctx = context({ _id: 'legacy_admin', permissions: ['admin.access', 'custom.permission'] });
    expect(await handler(ctx, { id: 'clerk_user', email: 'TEST@example.com', emailVerified: true })).toBe('legacy_admin');
    expect(ctx.db.patch).toHaveBeenCalledWith('legacy_admin', expect.objectContaining({
      email: 'test@example.com', externalId: 'clerk_user', role: 'admin',
      permissions: expect.arrayContaining(['admin.access', 'custom.permission']),
    }));
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it('links a mixed-case legacy email instead of inserting a duplicate', async () => {
    const legacyUser = { _id: 'legacy_user', email: 'Test@Example.com', permissions: [] };
    const ctx = context(null, [legacyUser]);

    expect(await handler(ctx, { id: 'clerk_user', email: 'test@example.com', emailVerified: true })).toBe(
      'legacy_user'
    );
    expect(ctx.db.patch).toHaveBeenCalledWith(
      'legacy_user',
      expect.objectContaining({ email: 'test@example.com', externalId: 'clerk_user' })
    );
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it('rejects overwriting another Clerk identity by email', async () => {
    const ctx = context({ _id: 'legacy_user', externalId: 'other_clerk_user' });
    await expect(handler(ctx, { id: 'clerk_user', email: 'test@example.com', emailVerified: true })).rejects.toThrow('already linked');
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it('honors an explicit admin demotion', async () => {
    const ctx = context({ _id: 'legacy_admin', role: 'admin', permissions: ['admin.access'] });
    await handler(ctx, { id: 'clerk_user', email: 'test@example.com', emailVerified: true, role: 'user' });
    expect(ctx.db.patch.mock.calls[0][1].permissions).not.toContain('admin.access');
    expect(ctx.db.patch.mock.calls[0][1].role).toBe('user');
  });
});
