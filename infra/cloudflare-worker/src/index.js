export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const origin = new URL(request.url);
    origin.protocol = 'http:';
    origin.hostname = env.ORIGIN_HOST;
    origin.port = '80';

    const headers = new Headers(request.headers);
    headers.set('X-Rook-Origin-Token', env.ORIGIN_TOKEN);
    headers.set('X-Forwarded-Host', incoming.host);
    headers.set('X-Forwarded-Proto', 'https');

    const requestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestInit.body = request.body;
    }

    return fetch(new Request(origin, requestInit));
  },
};
