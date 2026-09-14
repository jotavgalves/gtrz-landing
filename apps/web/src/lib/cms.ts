export type Locale = 'pt-BR' | 'es';

export interface CmsSectionRow {
  id: string;
  type: string;
  position: number;
  enabled: number | boolean;
  config_json?: string;
  locale?: string;
  content_json?: string;
}
export interface CmsSection { id:string; type:string; position:number; enabled:boolean; config:Record<string,unknown>; content:Record<string,any>; }
export interface CmsEvent { id:string; slug:string; status:string; city:string; state?:string; starts_at:string; locale?:string; title?:string; summary?:string; }
export interface HomePayload { page:unknown; sections:CmsSectionRow[]; events:CmsEvent[]; }
const API_BASE = import.meta.env.PUBLIC_API_BASE || '';

export async function getHomePage():Promise<HomePayload>{try{const r=await fetch(`${API_BASE}/api/public/site`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`CMS ${r.status}`);return await r.json();}catch{return{page:null,sections:[],events:[]}}}
export function pickLocale<T extends {locale?:string}>(rows:T[],locale:Locale){return rows.filter((row)=>row.locale===locale||!row.locale)}
export function parseJson<T>(value:string|undefined,fallback:T):T{if(!value)return fallback;try{return JSON.parse(value) as T}catch{return fallback}}

const defaultOrder=['hero','about','rhythms','differentials','events','team','freelancers','partnerships','instagram','contact'];
export function localizedSections(rows:CmsSectionRow[],locale:Locale):CmsSection[]{
  if(!rows.length)return defaultOrder.map((type,position)=>({id:`fallback_${type}`,type,position,enabled:true,config:{},content:{}}));
  const grouped=new Map<string,CmsSectionRow[]>();
  for(const row of rows){const list=grouped.get(row.id)||[];list.push(row);grouped.set(row.id,list)}
  return [...grouped.values()].map((group)=>{const base=group[0]!;const localized=group.find((r)=>r.locale===locale)||group.find((r)=>!r.locale)||base;return{id:base.id,type:base.type,position:Number(base.position),enabled:Boolean(base.enabled),config:parseJson(base.config_json,{}),content:parseJson(localized.content_json,{})}}).filter(s=>s.enabled).sort((a,b)=>a.position-b.position);
}
