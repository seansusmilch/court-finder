import { describe, expect, it, vi } from 'vitest';
import { applyClerkMigrationLinks, upsertFromClerk } from './users';

const handler = (upsertFromClerk as unknown as {
  _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
})._handler;

const migrationHandler = (applyClerkMigrationLinks as unknown as {
  _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
})._handler;

function context(
  existing: Record<string, unknown> | null = null,
  users: Array<Record<string, unknown>> = []
) {
  return {
    db: {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({ unique: vi.fn().mockResolvedValue(existing) }),
        collect: vi.fn().mockResolvedValue(users),
      }),
      insert: vi.fn().mockResolvedValue('new_user'),
      patch: vi.fn(),
      replace: vi.fn(),
    },
  };
}

describe('Clerk user synchronization', () => {
  it('reuses an existing local identity bridge', async () => {
    const ctx = context({ _id: 'local_user', externalId: 'clerk_user' });

    expect(await handler(ctx, { id: 'clerk_user' })).toBe('local_user');
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it('creates an identity bridge from the Clerk user ID', async () => {
    const ctx = context();

    expect(await handler(ctx, { id: 'clerk_user' })).toBe('new_user');
    expect(ctx.db.insert).toHaveBeenCalledWith('users', { externalId: 'clerk_user' });
  });

  it('links legacy users without deleting their application data', async () => {
    const legacyUser = { _id: 'legacy_user', email: 'casey@example.com' };
    const ctx = context(null, [legacyUser]);

    const result = await migrationHandler(ctx, {
      links: [{ userId: legacyUser._id, clerkUserId: 'clerk_user' }],
      cleanupLegacyFields: false,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(legacyUser._id, {
      externalId: 'clerk_user',
    });
    expect(ctx.db.replace).not.toHaveBeenCalled();
    expect(result).toEqual({ linkedCount: 1, cleanedCount: 0 });
  });

  it('leaves unresolved legacy users for a later migration pass', async () => {
    const legacyUser = { _id: 'legacy_user', email: 'missing@example.com' };
    const ctx = context(null, [legacyUser]);

    const result = await migrationHandler(ctx, {
      links: [],
      cleanupLegacyFields: false,
    });

    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.replace).not.toHaveBeenCalled();
    expect(result).toEqual({ linkedCount: 0, cleanedCount: 0 });
  });

  it('removes legacy profile fields only during explicit cleanup', async () => {
    const users = [
      { _id: 'user_one', externalId: 'clerk_one', email: 'one@example.com' },
      { _id: 'user_two', externalId: 'clerk_two', email: 'two@example.com' },
    ];
    const ctx = context(null, users);

    const result = await migrationHandler(ctx, {
      links: [],
      cleanupLegacyFields: true,
    });

    expect(ctx.db.replace).toHaveBeenNthCalledWith(1, 'user_one', {
      externalId: 'clerk_one',
    });
    expect(ctx.db.replace).toHaveBeenNthCalledWith(2, 'user_two', {
      externalId: 'clerk_two',
    });
    expect(result).toEqual({ linkedCount: 0, cleanedCount: 2 });
  });
});
