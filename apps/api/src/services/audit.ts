import type { Env } from '../env';

export async function audit(
  env: Env,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: unknown = {}
) {
  await env.DB.prepare(
    'INSERT INTO audit_logs (action, entity_type, entity_id, metadata_json) VALUES (?,?,?,?)'
  )
    .bind(action, entityType || null, entityId || null, JSON.stringify(metadata))
    .run();
}
