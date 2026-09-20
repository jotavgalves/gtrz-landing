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
export interface CmsEvent {
  id:string;
  slug:string;
  status:string;
  city:string;
  state?:string;
  starts_at:string;
  ends_at?:string;
  venue_name?:string|null;
  hero_media_id?:string|null;
  logo_media_id?:string|null;
  theme_json?:string|null;
  min_price_cents?:number|null;
  locale?:string;
  title?:string;
  summary?:string;
}
export interface CmsTeamMember { id:string; name:string; media_id?:string|null; instagram_url?:string|null; position:number; locale?:string; role_label?:string|null; bio?:string|null; }
export interface EventPopupSettings {
  enabled?: boolean;
  frequency?: 'always'|'session'|'day';
  delayMs?: number;
  selectedEventId?: string|null;
  maxEvents?: number;
  visual?: Record<string,any>;
}
export interface ChromeSettings {
  metaTitlePt?: string;
  metaTitleEs?: string;
  metaDescriptionPt?: string;
  metaDescriptionEs?: string;
  footerPt?: string;
  footerEs?: string;
  eventsLabelPt?: string;
  eventsLabelEs?: string;
  langShortPt?: string;
  langShortEs?: string;
  gateEyebrow?: string;
  gateEyebrowPt?: string;
  gateEyebrowEs?: string;
  gateTitlePrefix?: string;
  gateTitlePrefixPt?: string;
  gateTitlePrefixEs?: string;
  gateTitleHighlight?: string;
  gateTitleHighlightPt?: string;
  gateTitleHighlightEs?: string;
  gateBodyPt?: string;
  gateBodyEs?: string;
  gateHintPt?: string;
  gateHintEs?: string;
  gateOptionPt?: string;
  gateOptionEs?: string;
  navPt?: Array<[string,string]>;
  navEs?: Array<[string,string]>;
}
export interface GeneralSettings {
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  defaultLocale?: Locale;
  homepageMode?: 'hub'|'full';
}
export interface SiteSettings {
  event_popup?: EventPopupSettings;
  social?: Record<string,unknown>;
  general?: GeneralSettings;
  chrome?: ChromeSettings;
  copy?: Record<string,Record<string,Record<string,string>>>;
}
export interface HomePayload { page:unknown; sections:CmsSectionRow[]; events:CmsEvent[]; team:CmsTeamMember[]; settings:SiteSettings; }
const API_BASE = import.meta.env.PUBLIC_API_BASE || '';

export async function getHomePage():Promise<HomePayload>{try{const r=await fetch(`${API_BASE}/api/public/site`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`CMS ${r.status}`);return await r.json();}catch{return{page:null,sections:[],events:[],team:[],settings:{}}}}
export function pickLocale<T extends {locale?:string}>(rows:T[],locale:Locale){return rows.filter((row)=>row.locale===locale||!row.locale)}
export function parseJson<T>(value:string|undefined,fallback:T):T{if(!value)return fallback;try{return JSON.parse(value) as T}catch{return fallback}}

const defaultOrder=['hero','about','rhythms','differentials','events','team','freelancers','partnerships','instagram','contact'];
export function localizedSections(rows:CmsSectionRow[],locale:Locale):CmsSection[]{
  if(!rows.length)return defaultOrder.map((type,position)=>({id:`fallback_${type}`,type,position,enabled:true,config:{},content:{}}));
  const grouped=new Map<string,CmsSectionRow[]>();
  for(const row of rows){const list=grouped.get(row.id)||[];list.push(row);grouped.set(row.id,list)}
  return [...grouped.values()].map((group)=>{const base=group[0]!;const localized=group.find((r)=>r.locale===locale)||group.find((r)=>!r.locale)||base;return{id:base.id,type:base.type,position:Number(base.position),enabled:Boolean(base.enabled),config:parseJson(base.config_json,{}),content:parseJson(localized.content_json,{})}}).filter(s=>s.enabled).sort((a,b)=>a.position-b.position);
}
