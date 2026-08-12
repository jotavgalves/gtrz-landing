import { fetchDriveFile } from '../../src/google-drive.js';
import { resolveMediaPublicId } from '../../src/security.js';

function mediaHeaders(type) {
  const headers = new Headers();
  headers.set('content-type', type || 'image/jpeg');
  headers.set('cache-control', 'public, max-age=86400, s-maxage=604800');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('content-disposition', 'inline');
  headers.set('referrer-policy', 'no-referrer');
  return headers;
}

export async function onRequestGet({ request, env, params, waitUntil }) {
  const parts = (Array.isArray(params.path) ? params.path : [params.path]).filter(Boolean);

  // URLs antigas revelavam a origem e o ID real do Google Drive. Não são mais servidas.
  if (parts[0] === 'drive') return new Response('Not found', { status:404 });

  if (parts.length === 1 && parts[0]) {
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const driveFileId = await resolveMediaPublicId(env, parts[0]);
      if (driveFileId) {
        const upstream = await fetchDriveFile(env, driveFileId);
        if (!upstream.ok) return new Response('Imagem não encontrada', { status:upstream.status });
        const response = new Response(upstream.body, { status:200, headers:mediaHeaders(upstream.headers.get('content-type')) });
        if (waitUntil) waitUntil(cache.put(request, response.clone()));
        return response;
      }
    } catch (error) {
      return new Response(error?.message || 'Falha ao carregar imagem', { status:503, headers:{ 'cache-control':'no-store' } });
    }
  }

  // Compatibilidade com mídias antigas armazenadas no R2.
  if (env.MEDIA) {
    const key = parts.join('/');
    if (!key) return new Response('Not found', { status:404 });
    const object = await env.MEDIA.get(key);
    if (!object) return new Response('Not found', { status:404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('x-content-type-options', 'nosniff');
    headers.set('content-disposition', 'inline');
    headers.set('referrer-policy', 'no-referrer');
    return new Response(object.body, { headers });
  }

  return new Response('Not found', { status:404 });
}
