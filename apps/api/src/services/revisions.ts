import type { Env } from '../env';

export async function createRevision(
  env: Env,
  entityType: string,
  entityId: string,
  snapshot: unknown
) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO content_revisions(id,entity_type,entity_id,snapshot_json) VALUES(?,?,?,?)'
  ).bind(id, entityType, entityId, JSON.stringify(snapshot)).run();
  return id;
}

export async function listRevisions(env: Env, entityType: string, entityId: string) {
  return env.DB.prepare(`
    SELECT id,entity_type,entity_id,created_at
    FROM content_revisions
    WHERE entity_type=? AND entity_id=?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(entityType, entityId).all();
}

export async function getRevision(env: Env, revisionId: string) {
  return env.DB.prepare(`
    SELECT id,entity_type,entity_id,snapshot_json,created_at
    FROM content_revisions WHERE id=? LIMIT 1
  `).bind(revisionId).first<{
    id:string;
    entity_type:string;
    entity_id:string;
    snapshot_json:string;
    created_at:string;
  }>();
}
