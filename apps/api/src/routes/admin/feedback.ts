import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';

export const feedbackAdminRoutes = new Hono<{ Bindings: Env }>();

const has=(value:unknown,key:string)=>Object.prototype.hasOwnProperty.call(value||{},key);
const statuses=new Set(['new','reviewed','archived']);
const cleanAdminNote=(value:unknown)=>{
  const raw=String(value??'').normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,'').trim();
  return raw.slice(0,3000);
};

feedbackAdminRoutes.get('/feedback',async(c)=>{
  const status=String(c.req.query('status')||'').trim();
  const limit=Math.min(500,Math.max(1,Number(c.req.query('limit')||300)));
  if(status&&status!=='all'&&!statuses.has(status))return c.json({error:'invalid_status'},400);

  const statement=status&&status!=='all'
    ?c.env.DB.prepare('SELECT * FROM event_feedback WHERE status=? ORDER BY created_at DESC LIMIT ?').bind(status,limit)
    :c.env.DB.prepare('SELECT * FROM event_feedback ORDER BY created_at DESC LIMIT ?').bind(limit);

  return c.json(await statement.all());
});

feedbackAdminRoutes.patch('/feedback/:id',async(c)=>{
  const id=c.req.param('id');
  const body=await c.req.json<any>().catch(()=>({}));
  const row=await c.env.DB.prepare('SELECT id FROM event_feedback WHERE id=? LIMIT 1').bind(id).first();
  if(!row)return c.json({error:'not_found'},404);

  if(has(body,'status')&&!statuses.has(String(body.status)))return c.json({error:'invalid_status'},400);
  const notes=has(body,'adminNotes')?cleanAdminNote(body.adminNotes):null;

  await c.env.DB.prepare(`
    UPDATE event_feedback
    SET status=CASE WHEN ? THEN ? ELSE status END,
        admin_notes=CASE WHEN ? THEN ? ELSE admin_notes END,
        updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    has(body,'status')?1:0,
    has(body,'status')?String(body.status):null,
    has(body,'adminNotes')?1:0,
    notes||null,
    id
  ).run();

  await audit(c.env,'update','event_feedback',id);
  return c.json({ok:true});
});

feedbackAdminRoutes.delete('/feedback/:id',async(c)=>{
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT id FROM event_feedback WHERE id=? LIMIT 1').bind(id).first();
  if(!row)return c.json({error:'not_found'},404);
  await c.env.DB.prepare('DELETE FROM event_feedback WHERE id=?').bind(id).run();
  await audit(c.env,'delete','event_feedback',id);
  return c.json({ok:true});
});
