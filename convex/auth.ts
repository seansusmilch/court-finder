import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import {
  DEFAULT_ANONYMOUS_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
} from './lib/constants';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(
      ctx: MutationCtx,
      args: {
        existingUserId?: Id<'users'>;
        profile: { email?: string | null };
      }
    ) {
      console.log('createOrUpdateUser', args);
      if (args.existingUserId) {
        return args.existingUserId;
      }
      if (args.profile.email) {
        return ctx.db.insert('users', {
          email: args.profile.email,
          permissions: DEFAULT_USER_PERMISSIONS,
        });
      }

      return ctx.db.insert('users', {
        isAnonymous: true,
        permissions: DEFAULT_ANONYMOUS_PERMISSIONS,
      });
    },
  },
});
