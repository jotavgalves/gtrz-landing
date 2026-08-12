import { getConfig } from '../src/functions-lib.js';

function esc(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function absoluteUrl(value, origin) {
  if (!value) return '';
  try { return new URL(value, origin).toString(); } catch { return ''; }
}

function stripExistingMeta(html) {
  return html
    .replace(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+|description)["'][^>]*>\s*/gi,'')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi,'');
}

export async function onRequest(context) {
  const asset = await context.next();
  const type = asset.headers.get('content-type') || '';
  if (!type.includes('text/html')) return asset;

  let config = {};
  try { config = await getConfig(context.env); } catch {}

  const requestUrl = new URL(context.request.url);
  const origin = requestUrl.origin;
  const canonical = origin + '/';
  const title = config.shareTitle || 'La Rumba Jampa — 29 AGO 2026';
  const description = config.shareDescription || 'João Pessoa recebe a La Rumba Jampa em 29 de agosto. Uma noite latina das 21h às 5h.';
  const image = absoluteUrl(config.shareImage, origin);

  let html = stripExistingMeta(await asset.text());
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);

  const tags = [
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="La Rumba Jampa">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`
  ];

  if (image) {
    tags.push(
      `<meta property="og:image" content="${esc(image)}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${esc(title)}">`,
      `<meta name="twitter:image" content="${esc(image)}">`
    );
  }

  html = html.replace('</head>', `${tags.join('\n')}\n</head>`);
  const headers = new Headers(asset.headers);
  headers.set('content-type','text/html; charset=UTF-8');
  headers.set('cache-control','no-cache');
  headers.delete('content-length');
  return new Response(html,{status:asset.status,statusText:asset.statusText,headers});
}
