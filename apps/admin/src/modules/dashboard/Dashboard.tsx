import { useEffect,useMemo,useState } from 'react';
import { api } from '../../lib/api';
import { Badge,Empty,Metric,Panel } from '../../components/StateViews';
import { Icon } from '../../components/Icons';

type Target='content'|'events'|'people'|'feedback'|'commercial'|'marketing'|'media'|'analytics'|'settings';
const actionLabel:Record<string,string>={login:'Login',logout:'Logout',create:'Criação',update:'Alteração',delete:'Exclusão',archive:'Arquivamento',restore:'Restauração',reorder:'Reordenação'};

export function Dashboard({onNavigate}:{onNavigate:(view:any)=>void}){
  const [data,setData]=useState<any>(null);const [events,setEvents]=useState<any[]>([]);const [logs,setLogs]=useState<any[]>([]);const [mediaCount,setMediaCount]=useState<number|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  const load=async()=>{setLoading(true);setError('');try{const [d,e,a,m]=await Promise.all([api<any>('/api/admin/dashboard'),api<any>('/api/admin/events'),api<any>('/api/admin/audit?limit=12'),api<any>('/api/media')]);setData(d);setEvents(e.results||[]);setLogs(a.results||[]);setMediaCount((m.results||[]).length)}catch(e:any){setError(e.message)}finally{setLoading(false)}};
  useEffect(()=>{load();},[]);
  const pageViews=(data?.metrics||[]).find((x:any)=>x.metric==='page_view')?.value??0;
  const ticketClicks=(data?.metrics||[]).find((x:any)=>x.metric==='ticket_click')?.value??0;
  const active=useMemo(()=>events.filter(x=>['published','sales_open','sold_out'].includes(x.status)).slice(0,4),[events]);
  const upcoming=useMemo(()=>events.filter(x=>x.starts_at&&new Date(x.starts_at).getTime()>Date.now()&&x.status!=='archived').length,[events]);
  const go=(target:Target)=>onNavigate(target);
  return <div className="module-stack">
    <section className="dashboard-hero">
      <div><small>OPERAÇÃO CENTRAL</small><h2>O que precisa<br/>acontecer <em>agora?</em></h2><p>Atalhos para as áreas que mais movimentam a operação da GTRZ.</p></div>
      <div className="quick-actions"><button onClick={()=>go('events')}><span><Icon name="plus"/></span><div><strong>Novo evento</strong><small>Crie edição, ingressos e line-up</small></div><Icon name="arrow"/></button><button onClick={()=>go('content')}><span><Icon name="edit"/></span><div><strong>Editar site</strong><small>Textos, seções e páginas</small></div><Icon name="arrow"/></button><button onClick={()=>go('media')}><span><Icon name="image"/></span><div><strong>Enviar mídia</strong><small>Biblioteca oficial no R2</small></div><Icon name="arrow"/></button><button onClick={()=>go('analytics')}><span><Icon name="analytics"/></span><div><strong>Ver resultado</strong><small>Aquisição e conversão</small></div><Icon name="arrow"/></button></div>
    </section>
    {error&&<div className="notice notice-error">{error}</div>}
    <div className="metric-grid dashboard-metrics"><Metric label="Visitantes únicos" value={loading?'…':data?.uniqueVisitors30d??0} detail="últimos 30 dias" icon="people" tone="red"/><Metric label="Page views" value={loading?'…':pageViews} detail="últimos 30 dias" icon="eye"/><Metric label="Cliques em ingressos" value={loading?'…':ticketClicks} detail="intenção de compra" icon="link" tone="good"/><Metric label="Eventos ativos" value={loading?'…':data?.activeEvents??0} detail={`${upcoming} futuros cadastrados`} icon="events"/><Metric label="Freelancers novos" value={loading?'…':data?.newFreelancers??0} detail="aguardando triagem" icon="people" tone={(data?.newFreelancers||0)>0?'warn':'default'}/><Metric label="Sugestões novas" value={loading?'…':data?.newFeedback??0} detail="aguardando leitura" icon="activity" tone={(data?.newFeedback||0)>0?'warn':'default'}/><Metric label="Biblioteca" value={loading?'…':mediaCount??0} detail="assets no R2" icon="media"/></div>
    <div className="dashboard-columns">
      <Panel title="Eventos em destaque" eyebrow="Agenda operacional" action={<button onClick={()=>go('events')}>Gerenciar <Icon name="arrow" size={14}/></button>}>
        {active.length?<div className="dashboard-event-list">{active.map(event=><button key={event.id} onClick={()=>go('events')}><div className="event-date-box"><strong>{new Date(event.starts_at).toLocaleDateString('pt-BR',{day:'2-digit'})}</strong><span>{new Date(event.starts_at).toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span></div><div className="dashboard-event-copy"><strong>{event.title||event.slug}</strong><span>{event.city}{event.state?` · ${event.state}`:''}{event.venue_name?` · ${event.venue_name}`:''}</span></div><Badge tone={event.status==='sales_open'?'green':event.status==='sold_out'?'yellow':'red'}>{event.status.replaceAll('_',' ')}</Badge></button>)}</div>:<Empty icon="calendar">Nenhum evento publicado neste momento.</Empty>}
      </Panel>
      <Panel title="Atividade recente" eyebrow="Auditoria" action={<button onClick={load}><Icon name="refresh" size={15}/> Atualizar</button>}>
        {logs.length?<div className="activity-list">{logs.map(log=><article key={log.id}><span className="activity-node"><Icon name={log.action==='delete'?'trash':log.action==='create'?'plus':log.action==='restore'?'refresh':'edit'} size={14}/></span><div><strong>{actionLabel[log.action]||log.action}</strong><small>{log.entity_type||'sistema'}{log.entity_id?` · ${String(log.entity_id).slice(0,12)}`:''}</small></div><time>{new Date(log.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</time></article>)}</div>:<Empty>Nenhuma atividade recente.</Empty>}
      </Panel>
    </div>
    <section className="platform-strip"><div><span className="runtime-dot"/><strong>API + D1 + R2</strong><small>Infraestrutura de produção conectada</small></div><div><Icon name="check"/><strong>Revisões</strong><small>Conteúdo e eventos versionados</small></div><div><Icon name="system"/><strong>Auditoria</strong><small>Ações administrativas registradas</small></div><button onClick={()=>go('settings')}>Configurações <Icon name="arrow" size={15}/></button></section>
  </div>;
}
