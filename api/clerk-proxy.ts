const CLERK_FRONTEND_API_URL = 'https://frontend-api.clerk.dev';
const DEFAULT_CLERK_PROXY_URL = 'https://geocourt.vercel.app/__clerk';

const HOP_BY_HOP_HEADERS = [
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

function getProxyUrl() {
  // Clerk validates this value against the proxy URL configured in its
  // dashboard. Do not derive it from Vercel's forwarded host, which may be a
  // deployment alias instead of the production domain.
  return process.env.CLERK_PROXY_URL || DEFAULT_CLERK_PROXY_URL;
}

function getUpstreamUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const path = requestUrl.searchParams.get('path') || '';
  requestUrl.searchParams.delete('path');

  const upstreamPath = path ? `/${path.replace(/^\/+/, '')}` : '/';
  return `${CLERK_FRONTEND_API_URL}${upstreamPath}${requestUrl.search}`;
}

function rewriteRedirectLocation(location: string, upstreamUrl: string) {
  const upstreamLocation = new URL(location, upstreamUrl);
  const clerkOrigin = new URL(CLERK_FRONTEND_API_URL).origin;

  if (upstreamLocation.origin !== clerkOrigin) {
    return location;
  }

  const proxyBase = new URL(getProxyUrl());
  const proxyPath = proxyBase.pathname.replace(/\/+$/, '');
  proxyBase.pathname = `${proxyPath}${upstreamLocation.pathname}`;
  proxyBase.search = upstreamLocation.search;
  proxyBase.hash = upstreamLocation.hash;

  return proxyBase.toString();
}

export default {
  async fetch(request: Request) {
    const startTs = Date.now();
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      console.error('clerk_proxy_configuration_error', {
        startTs,
        durationMs: Date.now() - startTs,
        method: request.method,
        reason: 'CLERK_SECRET_KEY is not configured',
      });

      return new Response('Clerk proxy is not configured', { status: 500 });
    }

    const requestUrl = new URL(request.url);
    const headers = new Headers(request.headers);

    for (const header of HOP_BY_HOP_HEADERS) {
      headers.delete(header);
    }

    headers.set('Clerk-Proxy-Url', getProxyUrl());
    headers.set('Clerk-Secret-Key', secretKey);
    headers.set(
      'X-Forwarded-For',
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    );

    try {
      const upstreamUrl = getUpstreamUrl(request);
      const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
      });
      const responseHeaders = new Headers(response.headers);

      // The runtime may transparently decode the upstream response.
      responseHeaders.delete('content-encoding');
      responseHeaders.delete('content-length');

      const location = responseHeaders.get('location');
      if (location) {
        responseHeaders.set('location', rewriteRedirectLocation(location, upstreamUrl));
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('clerk_proxy_request_failed', {
        startTs,
        durationMs: Date.now() - startTs,
        method: request.method,
        path: requestUrl.searchParams.get('path') || '/',
        error,
      });

      return new Response('Unable to reach Clerk', { status: 502 });
    }
  },
};
