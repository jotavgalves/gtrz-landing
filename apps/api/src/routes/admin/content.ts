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

contentAdminRoutes.get('/pages', async (c) => {
  return c.json(await c.env.DB.prepare('SELECT * FROM pages ORDER BY created_at DESC').all());
});

contentAdminRoutes.get('/pages/:id', async (c) => {
  const pageId = c.req.param('id');
  const page = await c.env.DB.prepare('SELECT * FROM pages WHERE id=?').bind(pageId).first();
  if (!page) return c.json({ error:'not_found' },404);
  const localizations = await c.env.DB.prepare('SELECT * FROM page_localizations WHERE page_id=?').bind(pageId).all();
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

contentAdminRoutes.post('/pages/:id/sections', async (c) => {
  const pageId = c.req.param('id');
  const body = await c.req.json<any>();
  if (!body?.type) return c.json({ error:'section_type_required' },400);
  const sectionId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO page_sections(id,page_id,type,position,enabled,config_json) VALUES(?,?,?,?,?,?)'
  ).bind(sectionId,pageId,body.type,Number(body.position||0),body.enabled===false?0:1,JSON.stringify(body.config||{})).run();
  for (const [locale,content] of Object.entries(body.locales||{})) {
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
    body.config?JSON.stringify(body.config):null,
    sectionId
  ).run();
  for (const [locale,content] of Object.entries(body.locales||{})) {
    await c.env.DB.prepare(`
      INSERT INTO section_localizations(section_id,locale,content_json) VALUES(?,?,?)
      ON CONFLICT(section_id,locale) DO UPDATE SET content_json=excluded.content_json
    `).bind(sectionId,locale,JSON.stringify(content)).run();
  }
  await audit(c.env,'update','page_section',sectionId);
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
