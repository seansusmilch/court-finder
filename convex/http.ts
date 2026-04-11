import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';

const http = httpRouter();

http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 });
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
      console.error('clerk_webhook_verification_failed', { error });
      return new Response('Webhook verification failed', { status: 400 });
    }

    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const data = evt.data as {
        id: string;
        email_addresses?: Array<{ email_address: string; verification?: { status?: string } }>;
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string | null;
        public_metadata?: { role?: 'user' | 'admin' };
      };

      const email = data.email_addresses?.[0]?.email_address;
      await ctx.runMutation(internal.users.upsertFromClerk, {
        id: data.id,
        email,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        imageUrl: data.image_url ?? undefined,
        role: data.public_metadata?.role,
      });
    }

    if (evt.type === 'user.deleted') {
      const data = evt.data as { id: string };
      await ctx.runMutation(internal.users.deleteFromClerk, { id: data.id });
    }

    return new Response('ok', { status: 200 });
  }),
});

export default http;
