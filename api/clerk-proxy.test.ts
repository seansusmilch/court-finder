import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import clerkProxy from './clerk-proxy';

const PROXY_URL = 'https://geocourt.vercel.app/__clerk';

describe('Clerk Vercel proxy', () => {
  beforeEach(() => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_live_test');
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('forwards the Clerk path, query, body, and required headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request(
      'https://geocourt.vercel.app/api/clerk-proxy?path=v1/client/sign_ins/sia_test/attempt_first_factor&__clerk_api_version=2026-05-12',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: '__session=session-token',
          'x-forwarded-for': '203.0.113.42',
        },
        body: 'identifier=person%40example.com',
      },
    );

    const response = await clerkProxy.fetch(request);
    const [upstreamUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const upstreamHeaders = new Headers(init.headers);

    expect(response.status).toBe(200);
    expect(upstreamUrl).toBe(
      'https://frontend-api.clerk.dev/v1/client/sign_ins/sia_test/attempt_first_factor?__clerk_api_version=2026-05-12',
    );
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(ArrayBuffer);
    expect(await new Response(init.body).text()).toBe(
      'identifier=person%40example.com',
    );
    expect(upstreamHeaders.get('Clerk-Proxy-Url')).toBe(PROXY_URL);
    expect(upstreamHeaders.get('Clerk-Secret-Key')).toBe('sk_live_test');
    expect(upstreamHeaders.get('X-Forwarded-For')).toBe('203.0.113.42');
    expect(upstreamHeaders.get('cookie')).toBe('__session=session-token');
  });

  it('rewrites Clerk relative redirects back under the proxy path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: '/v1/oauth_callback?code=oauth-code' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await clerkProxy.fetch(
      new Request(
        'https://geocourt.vercel.app/api/clerk-proxy?path=v1/oauth_callback',
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `${PROXY_URL}/v1/oauth_callback?code=oauth-code`,
    );
  });

  it('rewrites absolute Clerk redirects but preserves app redirects', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 301,
        headers: {
          location: 'https://frontend-api.clerk.dev/v1/oauth_callback?state=one',
        },
      }),
    );
    const clerkResponse = await clerkProxy.fetch(
      new Request(
        'https://geocourt.vercel.app/api/clerk-proxy?path=v1/oauth_callback',
      ),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://geocourt.vercel.app/' },
      }),
    );
    const appResponse = await clerkProxy.fetch(
      new Request(
        'https://geocourt.vercel.app/api/clerk-proxy?path=v1/oauth_callback',
      ),
    );

    expect(clerkResponse.headers.get('location')).toBe(
      `${PROXY_URL}/v1/oauth_callback?state=one`,
    );
    expect(appResponse.headers.get('location')).toBe('https://geocourt.vercel.app/');
  });

  it('passes through Clerk error status and response body', async () => {
    const errorBody = '{"errors":[{"code":"invalid_request"}]}';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(errorBody, {
          status: 422,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const response = await clerkProxy.fetch(
      new Request('https://geocourt.vercel.app/api/clerk-proxy?path=v1/client/sign_ins'),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.text()).resolves.toBe(errorBody);
  });

  it('fails closed when the Clerk secret is missing', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await clerkProxy.fetch(
      new Request('https://geocourt.vercel.app/api/clerk-proxy?path=v1/client'),
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Clerk proxy is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
