import { fetchDriveFile } from '../../src/google-drive.js';

export async function onRequestGet({ request, env, params, waitUntil }) {
  const parts = (Array.isArray(params.path) ? params.path : [params.path]).filter(Boolean);

  if (parts[0] === 'drive' && parts[1]) {
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const upstream = await fetchDriveFile(env, parts[1]);
      if (!upstream.ok) return new Response('Imagem não encontrada', { status:upstream.status });
      const headers = new Headers();
      headers.set('content-type', upstream.headers.get('content-type') || 'image/jpeg');
      headers.set('cache-control', 'public, max-age=86400, s-maxage=604800');
      const response = new Response(upstream.body, { status:200, headers });
      if (waitUntil) waitUntil(cache.put(request, response.clone()));
      return response;
    } catch (error) {
      return new Response(error?.message || 'Falha ao carregar imagem', { status:503 });
    }
  }

  // Compatibilidade com imagens antigas que eventualmente tenham sido salvas no R2.
  if (env.MEDIA) {
    const key = parts.join('/');
    if (!key) return new Response('Not found', { status:404 });
    const object = await env.MEDIA.get(key);
    if (!object) return new Response('Not found', { status:404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }

  return new Response('Not found', { status:404 });
}
