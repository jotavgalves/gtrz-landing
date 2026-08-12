import { json, verifyAdmin } from '../../../../src/functions-lib.js';
import { DEFAULT_DRIVE_FOLDER_ID, driveConnected } from '../../../../src/google-drive.js';

export async function onRequestGet({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  return json({
    ok:true,
    clientConfigured:Boolean(env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET),
    connected:await driveConnected(env),
    folderId:env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID
  });
}
