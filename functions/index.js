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

const mediaProtectionStyle = `<style>
img,picture,svg,canvas,.svg-card,.artist-normalized,.svg-fallback,.dj-photo{
  -webkit-user-select:none!important;
  user-select:none!important;
  -webkit-user-drag:none!important;
  -webkit-touch-callout:none!important;
}
</style>`;

const mediaProtectionScript = `<script>
(()=>{
  document.addEventListener('contextmenu',e=>e.preventDefault(),true);
  document.addEventListener('dragstart',e=>{
    if(e.target&&e.target.closest&&e.target.closest('img,picture,svg,canvas,.svg-card'))e.preventDefault();
  },true);
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='s')e.preventDefault();
  },true);
  const lock=root=>{
    if(!root||!root.querySelectorAll)return;
    root.querySelectorAll('img').forEach(img=>{img.draggable=false;img.setAttribute('draggable','false')});
  };
  lock(document);
  new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches&&node.matches('img')){node.draggable=false;node.setAttribute('draggable','false')}
      lock(node);
    }
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

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

  html = html.replace('</head>', `${tags.join('\n')}\n<link rel="stylesheet" href="/assets/ordinal-fix.css">\n${mediaProtectionStyle}\n</head>`);
  html = html.replace('</body>', `<script src="/assets/ordinal-fix.js" defer></script>\n${mediaProtectionScript}\n</body>`);
  const headers = new Headers(asset.headers);
  headers.set('content-type','text/html; charset=UTF-8');
  headers.set('cache-control','no-cache');
  headers.delete('content-length');
  return new Response(html,{status:asset.status,statusText:asset.statusText,headers});
}
