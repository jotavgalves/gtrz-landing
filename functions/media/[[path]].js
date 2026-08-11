export async function onRequestGet({ env, params }) {
  if (!env.MEDIA) return new Response('MEDIA binding não configurado', { status:404 });
  const parts = Array.isArray(params.path) ? params.path : [params.path];
  const key = parts.filter(Boolean).join('/');
  if (!key) return new Response('Not found', { status:404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status:404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}
