import { getConfig } from '../src/functions-lib.js';
import { maskConfigMedia } from '../src/security.js';

function esc(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function absoluteUrl(value, origin) {
  if (!value) return '';
  try { return new URL(value, origin).toString(); } catch { return ''; }
}

function safeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g,'\\u003c')
    .replace(/>/g,'\\u003e')
    .replace(/&/g,'\\u0026')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
}

function stripExistingMeta(html) {
  return html
    .replace(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+|description|robots|googlebot|author|application-name|keywords)["'][^>]*>\s*/gi,'')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi,'')
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,'');
}

function eventEndIso(startDate) {
  const time = Date.parse(startDate || '');
  if (!Number.isFinite(time)) return '2026-08-30T05:00:00-03:00';
  return new Date(time + 8 * 60 * 60 * 1000).toISOString();
}

function applySecurityHeaders(headers) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://www.google.com https://challenges.cloudflare.com",
    "upgrade-insecure-requests"
  ].join('; ');

  headers.set('content-security-policy', csp);
  headers.set('x-frame-options', 'DENY');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  headers.set('cross-origin-opener-policy', 'same-origin-allow-popups');
}

export async function onRequest(context) {
  const asset = await context.next();
  const type = asset.headers.get('content-type') || '';
  if (!type.includes('text/html')) return asset;

  let config = {};
  try { config = await maskConfigMedia(context.env, await getConfig(context.env)); } catch {}

  const requestUrl = new URL(context.request.url);
  const origin = requestUrl.origin;
  const canonical = origin + '/';

  const seoTitle = 'La Rumba Jampa | Festa Latina em João Pessoa - 29 Ago 2026';
  const seoDescription = 'La Rumba Jampa em João Pessoa dia 29 de agosto de 2026, no Fascynios Recepções. Reggaeton, salsa, bachata, merengue, dembow, cumbia e mais.';
  const shareTitle = config.shareTitle || 'La Rumba Jampa — 29 AGO 2026';
  const shareDescription = config.shareDescription || seoDescription;
  const shareImage = absoluteUrl(config.shareImage, origin);
  const schemaImage = shareImage || absoluteUrl('/LOGO%20LA%20RUMBA%20JAMPA.svg', origin);
  const ticketUrl = absoluteUrl(config.sympla, origin) || canonical;
  const instagramUrl = absoluteUrl(config.insta, origin);
  const venueName = config.venue || 'Fascynios Recepções';
  const streetAddress = String(config.address || 'R. Pastor Misael Jácome Cavalcante, 814').split('\n')[0].trim();
  const startDate = config.date || '2026-08-29T21:00:00-03:00';
  const endDate = eventEndIso(startDate);
  const price = Number(config.price ?? 50);

  const graph = {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'Organization',
        '@id':`${canonical}#organization`,
        name:'GTRZ Eventos',
        url:canonical,
        email:config.email || 'gtrzeventos@gmail.com',
        sameAs:instagramUrl ? [instagramUrl] : []
      },
      {
        '@type':'WebSite',
        '@id':`${canonical}#website`,
        url:canonical,
        name:'La Rumba Jampa',
        inLanguage:['pt-BR','es'],
        publisher:{'@id':`${canonical}#organization`}
      },
      {
        '@type':'WebPage',
        '@id':`${canonical}#webpage`,
        url:canonical,
        name:seoTitle,
        description:seoDescription,
        inLanguage:'pt-BR',
        isPartOf:{'@id':`${canonical}#website`},
        about:{'@id':`${canonical}#event`},
        primaryImageOfPage:schemaImage ? {'@type':'ImageObject',url:schemaImage} : undefined
      },
      {
        '@type':'Event',
        '@id':`${canonical}#event`,
        name:'La Rumba Jampa',
        description:seoDescription,
        url:canonical,
        startDate,
        endDate,
        eventStatus:'https://schema.org/EventScheduled',
        eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
        isAccessibleForFree:false,
        image:schemaImage ? [schemaImage] : undefined,
        location:{
          '@type':'Place',
          name:venueName,
          address:{
            '@type':'PostalAddress',
            streetAddress,
            addressLocality:'João Pessoa',
            addressRegion:'PB',
            addressCountry:'BR'
          }
        },
        organizer:{'@id':`${canonical}#organization`},
        performer:[
          {'@type':'Person',name:'DJ Vogn'},
          {'@type':'Person',name:'DJ Glitzy'}
        ],
        offers:{
          '@type':'Offer',
          url:ticketUrl,
          price:Number.isFinite(price) ? String(price) : '50',
          priceCurrency:'BRL',
          availability:'https://schema.org/InStock'
        },
        keywords:'festa latina, João Pessoa, reggaeton, salsa, bachata, merengue, dembow, cumbia, vallenato, perreo, La Rumba Jampa'
      }
    ]
  };

  let html = stripExistingMeta(await asset.text());
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(seoTitle)}</title>`);

  const tags = [
    `<meta name="description" content="${esc(seoDescription)}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta name="author" content="GTRZ Eventos">`,
    `<meta name="application-name" content="La Rumba Jampa">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="La Rumba Jampa">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:locale:alternate" content="es_ES">`,
    `<meta property="og:title" content="${esc(shareTitle)}">`,
    `<meta property="og:description" content="${esc(shareDescription)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta name="twitter:card" content="${shareImage ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(shareTitle)}">`,
    `<meta name="twitter:description" content="${esc(shareDescription)}">`
  ];

  if (shareImage) {
    tags.push(
      `<meta property="og:image" content="${esc(shareImage)}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${esc(shareTitle)}">`,
      `<meta name="twitter:image" content="${esc(shareImage)}">`
    );
  }

  const jsonLd = `<script type="application/ld+json">${safeJsonLd(graph)}</script>`;

  html = html.replace('</head>', `${tags.join('\n')}\n${jsonLd}\n<link rel="stylesheet" href="/assets/ordinal-fix.css">\n<link rel="stylesheet" href="/assets/security.css">\n</head>`);
  html = html.replace('</body>', `<script src="/assets/ordinal-fix.js" defer></script>\n<script src="/assets/security.js" defer></script>\n</body>`);

  const headers = new Headers(asset.headers);
  headers.set('content-type','text/html; charset=UTF-8');
  headers.set('cache-control','no-cache');
  headers.set('x-robots-tag','index, follow, max-image-preview:large');
  applySecurityHeaders(headers);
  headers.delete('content-length');
  return new Response(html,{status:asset.status,statusText:asset.statusText,headers});
}
