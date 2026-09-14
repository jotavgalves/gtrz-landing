import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';
import { createRevision, getRevision, listRevisions } from '../../services/revisions';

export const contentAdminRoutes = new Hono<{ Bindings: Env }>();

async function sectionSnapshot(env: Env, sectionId: string) {
  const section = await env.DB.prepare(`
    SELECT id,page_id,type,position,enabled,config_json,created_at,updated_at
    FROM page_sections WHERE id=? LIMIT 1
  `).bind(sectionId).first<any>();
  if (!section) return null;
  const locales = await env.DB.prepare(
    'SELECT locale,content_json FROM section_localizations WHERE section_id=? ORDER BY locale'
  ).bind(sectionId).all<any>();
  return { section, locales: locales.results };
}

async function upsertPageLocales(env: Env, pageId: string, locales: Record<string, any> = {}) {
  for (const [locale, value] of Object.entries<any>(locales)) {
    if (!['pt-BR', 'es'].includes(locale) || !value?.title) continue;
    await env.DB.prepare(`
      INSERT INTO page_localizations(page_id,locale,title,seo_title,seo_description,og_media_id)
      VALUES(?,?,?,?,?,?)
      ON CONFLICT(page_id,locale) DO UPDATE SET
        title=excluded.title,
        seo_title=excluded.seo_title,
        seo_description=excluded.seo_description,
        og_media_id=excluded.og_media_id
    `).bind(
      pageId,
      locale,
      String(value.title).slice(0, 180),
      value.seoTitle === undefined ? null : String(value.seoTitle || '').slice(0, 220) || null,
      value.seoDescription === undefined ? null : String(value.seoDescription || '').slice(0, 500) || null,
      value.ogMediaId || null
    ).run();
  }
}

contentAdminRoutes.get('/pages', async (c) => {
  return c.json(await c.env.DB.prepare(`
    SELECT p.*,
      MAX(CASE WHEN l.locale='pt-BR' THEN l.title END) title_pt,
      MAX(CASE WHEN l.locale='es' THEN l.title END) title_es
    FROM pages p
    LEFT JOIN page_localizations l ON l.page_id=p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all());
});

contentAdminRoutes.post('/pages', async (c) => {
  const body = await c.req.json<any>().catch(() => null);
  if (!body?.slug) return c.json({ error: 'slug_required' }, 400);
  const id = crypto.randomUUID();
  const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
  await c.env.DB.prepare(`
    INSERT INTO pages(id,slug,status,template,published_at,updated_at)
    VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
  `).bind(
    id,
    String(body.slug).trim().toLowerCase(),
    status,
    String(body.template || 'standard').slice(0, 80),
    status === 'published' ? new Date().toISOString() : null
  ).run();
  await upsertPageLocales(c.env, id, body.locales || {});
  await audit(c.env, 'create', 'page', id, { slug: body.slug });
  return c.json({ id }, 201);
});

contentAdminRoutes.get('/pages/:id', async (c) => {
  const pageId = c.req.param('id');
  const page = await c.env.DB.prepare('SELECT * FROM pages WHERE id=?').bind(pageId).first();
  if (!page) return c.json({ error:'not_found' },404);
  const localizations = await c.env.DB.prepare('SELECT * FROM page_localizations WHERE page_id=? ORDER BY locale').bind(pageId).all();
  const sectionRows = await c.env.DB.prepare(`
    SELECT s.id,s.page_id,s.type,s.position,s.enabled,s.config_json,s.updated_at,l.locale,l.content_json
    FROM page_sections s
    LEFT JOIN section_localizations l ON l.section_id=s.id
    WHERE s.page_id=? ORDER BY s.position,l.locale
  `).bind(pageId).all<any>();
  const sectionsMap = new Map<string,any>();
  for (const row of sectionRows.results) {
    const section = sectionsMap.get(row.id) || {
      id:row.id,page_id:row.page_id,type:row.type,position:row.position,
      enabled:row.enabled,config_json:row.config_json,updated_at:row.updated_at,locales:{}
    };
    if (row.locale) section.locales[row.locale] = JSON.parse(row.content_json || '{}');
    sectionsMap.set(row.id, section);
  }
  return c.json({ page, localizations:localizations.results, sections:[...sectionsMap.values()] });
});

contentAdminRoutes.patch('/pages/:id', async (c) => {
  const pageId = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const current = await c.env.DB.prepare('SELECT id FROM pages WHERE id=?').bind(pageId).first();
  if (!current) return c.json({ error: 'not_found' }, 404);
  const status = body.status && ['draft','published','archived'].includes(body.status) ? body.status : null;
  await c.env.DB.prepare(`
    UPDATE pages SET
      slug=COALESCE(?,slug),
      status=COALESCE(?,status),
      template=COALESCE(?,template),
      published_at=CASE
        WHEN ?='published' AND published_at IS NULL THEN CURRENT_TIMESTAMP
        ELSE published_at
      END,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    body.slug === undefined ? null : String(body.slug).trim().toLowerCase(),
    status,
    body.template === undefined ? null : String(body.template || 'standard').slice(0,80),
    status,
    pageId
  ).run();
  await upsertPageLocales(c.env, pageId, body.locales || {});
  await audit(c.env, 'update', 'page', pageId, { slug:body.slug, status });
  return c.json({ ok:true });
});

contentAdminRoutes.delete('/pages/:id', async (c) => {
  const pageId = c.req.param('id');
  const page = await c.env.DB.prepare('SELECT id,slug FROM pages WHERE id=?').bind(pageId).first<any>();
  if (!page) return c.json({ error:'not_found' },404);
  if (page.slug === 'home') return c.json({ error:'home_cannot_be_archived' },400);
  await c.env.DB.prepare("UPDATE pages SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(pageId).run();
  await audit(c.env, 'archive', 'page', pageId);
  return c.json({ ok:true });
});

contentAdminRoutes.post('/pages/:id/sections', async (c) => {
  const pageId = c.req.param('id');
  const body = await c.req.json<any>();
  if (!body?.type) return c.json({ error:'section_type_required' },400);
  const sectionId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO page_sections(id,page_id,type,position,enabled,config_json) VALUES(?,?,?,?,?,?)'
  ).bind(sectionId,pageId,body.type,Number(body.position||0),body.enabled===false?0:1,JSON.stringify(body.config||{})).run();
  for (const [locale,content] of Object.entries(body.locales||{})) {
    if (!['pt-BR','es'].includes(locale)) continue;
    await c.env.DB.prepare(
      'INSERT INTO section_localizations(section_id,locale,content_json) VALUES(?,?,?)'
    ).bind(sectionId,locale,JSON.stringify(content)).run();
  }
  await audit(c.env,'create','page_section',sectionId,{pageId,type:body.type});
  return c.json({ id:sectionId },201);
});

contentAdminRoutes.put('/pages/:pageId/sections/:sectionId', async (c) => {
  const sectionId = c.req.param('sectionId');
  const body = await c.req.json<any>();
  const snapshot = await sectionSnapshot(c.env,sectionId);
  if (!snapshot) return c.json({ error:'not_found' },404);
  await createRevision(c.env,'page_section',sectionId,snapshot);
  await c.env.DB.prepare(`
    UPDATE page_sections
    SET position=COALESCE(?,position),enabled=COALESCE(?,enabled),config_json=COALESCE(?,config_json),updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    body.position??null,
    body.enabled===undefined?null:(body.enabled?1:0),
    body.config === undefined ? null : JSON.stringify(body.config || {}),
    sectionId
  ).run();
  for (const [locale,content] of Object.entries(body.locales||{})) {
    if (!['pt-BR','es'].includes(locale)) continue;
    await c.env.DB.prepare(`
      INSERT INTO section_localizations(section_id,locale,content_json) VALUES(?,?,?)
      ON CONFLICT(section_id,locale) DO UPDATE SET content_json=excluded.content_json
    `).bind(sectionId,locale,JSON.stringify(content)).run();
  }
  await audit(c.env,'update','page_section',sectionId);
  return c.json({ ok:true });
});

contentAdminRoutes.put('/pages/:id/sections-order', async (c) => {
  const pageId = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const order = Array.isArray(body.order) ? body.order.slice(0,100) : [];
  if (!order.length) return c.json({ error:'order_required' },400);
  const statements = order.map((item:any,index:number) => c.env.DB.prepare(
    'UPDATE page_sections SET position=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND page_id=?'
  ).bind(Number(item.position ?? index), String(item.id), pageId));
  await c.env.DB.batch(statements);
  await audit(c.env,'reorder','page_sections',pageId,{count:order.length});
  return c.json({ ok:true });
});

contentAdminRoutes.delete('/pages/:pageId/sections/:sectionId', async (c) => {
  const sectionId = c.req.param('sectionId');
  const snapshot = await sectionSnapshot(c.env,sectionId);
  if (!snapshot) return c.json({ error:'not_found' },404);
  await createRevision(c.env,'page_section',sectionId,snapshot);
  await c.env.DB.prepare('DELETE FROM page_sections WHERE id=?').bind(sectionId).run();
  await audit(c.env,'delete','page_section',sectionId);
  return c.json({ ok:true });
});

contentAdminRoutes.get('/revisions/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType');
  const entityId = c.req.param('entityId');
  return c.json(await listRevisions(c.env,entityType,entityId));
});

contentAdminRoutes.post('/revisions/:revisionId/restore', async (c) => {
  const revision = await getRevision(c.env,c.req.param('revisionId'));
  if (!revision) return c.json({ error:'not_found' },404);
  if (revision.entity_type !== 'page_section') return c.json({ error:'unsupported_revision_type' },400);
  const snapshot = JSON.parse(revision.snapshot_json || '{}');
  const section = snapshot.section;
  if (!section?.id) return c.json({ error:'invalid_snapshot' },400);

  const current = await sectionSnapshot(c.env,section.id);
  if (current) await createRevision(c.env,'page_section',section.id,current);

  await c.env.DB.prepare(`
    INSERT INTO page_sections(id,page_id,type,position,enabled,config_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP),CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      page_id=excluded.page_id,type=excluded.type,position=excluded.position,
      enabled=excluded.enabled,config_json=excluded.config_json,updated_at=CURRENT_TIMESTAMP
  `).bind(
    section.id,section.page_id,section.type,section.position,section.enabled,
    section.config_json||'{}',section.created_at||null
  ).run();

  await c.env.DB.prepare('DELETE FROM section_localizations WHERE section_id=?').bind(section.id).run();
  for (const loc of snapshot.locales || []) {
    await c.env.DB.prepare(
      'INSERT INTO section_localizations(section_id,locale,content_json) VALUES(?,?,?)'
    ).bind(section.id,loc.locale,loc.content_json||'{}').run();
  }
  await audit(c.env,'restore','page_section',section.id,{revisionId:revision.id});
  return c.json({ ok:true,sectionId:section.id });
});
