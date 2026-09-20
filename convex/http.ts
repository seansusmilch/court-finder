import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
import { env } from './env';

const http = httpRouter();

http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const startTs = Date.now();
    const secret = env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      console.error('clerk_webhook_configuration_error', {
        startTs,
        durationMs: Date.now() - startTs,
        missingEnvironmentVariable: 'CLERK_WEBHOOK_SIGNING_SECRET',
      });
      return new Response('Webhook is not configured', { status: 500 });
    }

    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response('Missing svix headers', { status: 400 });
    }

    const payload = await req.text();
    const wh = new Webhook(secret);

    let evt: { type: string; data: Record<string, unknown> };
    try {
      evt = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as { type: string; data: Record<string, unknown> };
    } catch (error) {
      console.error('clerk_webhook_verification_failed', {
        startTs,
        durationMs: Date.now() - startTs,
        svixId,
        error,
      });
      return new Response('Webhook verification failed', { status: 400 });
    }

    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const data = evt.data as {
        id: string;
        email_addresses?: Array<{
          id?: string;
          email_address: string;
          verification?: { status?: string };
        }>;
        primary_email_address_id?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string | null;
        public_metadata?: { role?: 'user' | 'admin' };
      };

      const primaryEmail = data.email_addresses?.find(
        (emailAddress) => emailAddress.id === data.primary_email_address_id
      );
      const selectedEmail = primaryEmail;
      const userId = await ctx.runMutation(internal.users.upsertFromClerk, {
        id: data.id,
        email: selectedEmail?.email_address,
        emailVerified: selectedEmail?.verification?.status === 'verified',
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        imageUrl: data.image_url ?? undefined,
        role: data.public_metadata?.role === 'admin' || data.public_metadata?.role === 'user'
          ? data.public_metadata.role
          : undefined,
      });

      console.log('clerk_webhook_user_upserted', {
        startTs,
        durationMs: Date.now() - startTs,
        svixId,
        eventType: evt.type,
        clerkUserId: data.id,
        userId,
      });
    }

    if (evt.type === 'user.deleted') {
      const data = evt.data as { id?: string | null };
      if (data.id) {
        await ctx.runMutation(internal.users.disconnectFromClerk, { id: data.id });
        console.log('clerk_webhook_user_disconnected', {
          startTs,
          durationMs: Date.now() - startTs,
          svixId,
          eventType: evt.type,
          clerkUserId: data.id,
        });
      }
    }

    return new Response('ok', { status: 200 });
  }),
});

export default http;
