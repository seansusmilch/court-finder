import type { QueryCtx, MutationCtx } from '../_generated/server';

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
) {
  const identity = ctx.auth;

  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_external_id', (q: any) => q.eq('externalId', identity.subject))
    .unique();

  return user;
}

export async function getCurrentUserOrThrow(
  ctx: QueryCtx | MutationCtx
) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

export async function getUserId(
  ctx: QueryCtx | MutationCtx
) {
  const user = await getCurrentUser(ctx);
  return user?._id ?? null;
}

export async function syncUserFromClerk(ctx: QueryCtx | MutationCtx, clerkUserId: string) {
  const existingUser = await ctx.db
    .query('users')
    .withIndex('by_external_id', (q: any) => q.eq('externalId', clerkUserId))
    .unique();

  if (existingUser) {
    return existingUser;
  }

  const { ClerkClient } = await import('@clerk/backend');

  const clerk = new ClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    const clerkUser = await clerk.users.getUser(clerkUserId);

    const primaryEmail = clerkUser.emailAddresses.find(
      (e: any) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    const role = (clerkUser.publicMetadata?.role as string) || 'user';

    const userId = await ctx.db.insert('users', {
      externalId: clerkUser.id,
      name: clerkUser.fullName || undefined,
      email: primaryEmail || undefined,
      emailVerified: !!primaryEmail,
      imageUrl: clerkUser.imageUrl || undefined,
      role: role as 'guest' | 'user' | 'admin',
      createdAt: clerkUser.createdAt.getTime(),
      updatedAt: clerkUser.updatedAt.getTime(),
    });

    const newUser = await ctx.db.get(userId);

    console.log(`Synced user from Clerk: ${primaryEmail} (role: ${role})`);

    return newUser;
  } catch (error) {
    console.error('Failed to sync user from Clerk:', error);
    throw new Error('Failed to sync user from Clerk');
  }
}

export async function getCurrentUserOrSync(
  ctx: QueryCtx | MutationCtx
) {
  const identity = ctx.auth;

  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_external_id', (q: any) => q.eq('externalId', identity.subject))
    .unique();

  if (user) {
    return user;
  }

  return await syncUserFromClerk(ctx, identity.subject);
}
