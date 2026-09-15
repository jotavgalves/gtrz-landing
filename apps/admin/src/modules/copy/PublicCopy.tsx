import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Icon,type IconName } from '../../components/Icons';
import { Badge,Notice } from '../../components/StateViews';

type Locale='pt-BR'|'es';
type CopyTab='interface'|'freelancerPage'|'partnershipPage'|'eventPage'|'popup';
type PairField={key:string;label:string;help?:string;multiline?:boolean};
type PairGroup={title:string;description:string;fields:PairField[]};
type InterfaceField={ptKey:string;esKey:string;label:string;help?:string;multiline?:boolean};
type InterfaceGroup={title:string;description:string;fields:InterfaceField[]};

const chromeDefaults:any={
  metaTitlePt:'GTRZ Eventos',metaTitleEs:'GTRZ Eventos',
  metaDescriptionPt:'GTRZ Eventos — experiências culturais entre Venezuela e Brasil.',metaDescriptionEs:'GTRZ Eventos — experiencias culturales entre Venezuela y Brasil.',
  footerPt:'GTRZ Eventos · Venezuela → Brasil',footerEs:'GTRZ Eventos · Venezuela → Brasil',eventsLabelPt:'Eventos',eventsLabelEs:'Eventos',langShortPt:'PT',langShortEs:'ES',
  gateEyebrowPt:'Venezuela → Brasil',gateEyebrowEs:'Venezuela → Brasil',gateTitlePrefixPt:'COMO VOCÊ QUER',gateTitlePrefixEs:'¿CÓMO QUIERES',gateTitleHighlightPt:'ENTRAR?',gateTitleHighlightEs:'ENTRAR?',
  gateBodyPt:'Escolha o idioma da experiência.',gateBodyEs:'Elige el idioma de la experiencia.',gateHintPt:'Você pode mudar o idioma novamente no menu do site.',gateHintEs:'Puedes cambiar el idioma nuevamente en el menú.',gateOptionPt:'Português',gateOptionEs:'Español',
  navPt:[['Sobre','#sobre'],['Ritmos','#ritmos'],['Diferenciais','#diferenciais'],['Quem faz','#quem'],['Trabalhe conosco','#trabalhe'],['Parcerias','#parcerias'],['Instagram','#instagram']],
  navEs:[['Sobre','#sobre'],['Ritmos','#ritmos'],['Diferenciales','#diferenciais'],['Quiénes somos','#quem'],['Trabaja con nosotros','#trabalhe'],['Alianzas','#parcerias'],['Instagram','#instagram']]
};

const copyDefaults:Record<Locale,Record<string,Record<string,string>>>={
  'pt-BR':{
    freelancerPage:{seoTitle:'Trabalhe conosco — GTRZ',eyebrow:'GTRZ · FREELANCERS',title:'TRABALHE COM A GENTE.',intro:'Cadastre-se no nosso banco de profissionais para futuras produções. O cadastro não representa promessa de contratação.',nameLabel:'Nome completo',whatsappLabel:'WhatsApp',emailLabel:'E-mail',cityLabel:'Cidade',stateLabel:'Estado',instagramLabel:'Instagram',rolesLabel:'Áreas de atuação',rolesPlaceholder:'Produção, foto, bar, design...',portfolioLabel:'Portfólio',portfolioPlaceholder:'https://',availabilityLabel:'Disponibilidade / observações',submitLabel:'Enviar cadastro',successMessage:'Cadastro recebido. A GTRZ entrará em contato quando houver uma oportunidade compatível.',errorMessage:'Não foi possível enviar. Tente novamente.'},
    partnershipPage:{seoTitle:'Parcerias — GTRZ',eyebrow:'GTRZ · PARCERIAS',title:'VAMOS CONSTRUIR JUNTOS.',intro:'Casas, marcas, artistas, fornecedores e projetos que queiram construir uma experiência com a GTRZ.',contactNameLabel:'Seu nome',companyNameLabel:'Empresa / projeto',typeLabel:'Tipo de parceria',typePlaceholder:'—',venueOption:'Casa / espaço',brandOption:'Marca / patrocínio',artistOption:'Artista / projeto cultural',supplierOption:'Fornecedor',otherOption:'Outro',cityLabel:'Cidade',emailLabel:'E-mail',whatsappLabel:'WhatsApp',messageLabel:'Conte a ideia',submitLabel:'Enviar proposta',successMessage:'Proposta recebida. Nossa equipe vai analisar.',errorMessage:'Não foi possível enviar. Tente novamente.'},
    eventPage:{backLabel:'← GTRZ',dateLabel:'DATA',venueLabel:'LOCAL',aboutLabel:'Sobre o evento',lineupEyebrow:'GTRZ',lineupTitle:'LINE-UP.',ticketsEyebrow:'Ingressos',ticketsTitle:'ESCOLHA SEU INGRESSO.',availableLabel:'DISPONÍVEL',draftLabel:'EM BREVE',soldOutLabel:'ESGOTADO',closedLabel:'ENCERRADO',buyLabel:'Comprar',noTickets:'Os ingressos ainda não estão disponíveis.',notFoundTitle:'EVENTO NÃO ENCONTRADO.',notFoundCta:'GTRZ'},
    popup:{multiHeader:'Eventos GTRZ disponíveis',singleHeader:'Tem evento ativo na GTRZ',closeLabel:'Fechar',eyebrow:'Agenda aberta',multiTitleLine1:'TEM GTRZ',multiTitleLine2:'EM MAIS DE UMA',multiTitleAccent:'CIDADE.',singleTitleLine1:'TEM GTRZ',singleTitleLine2:'NA SUA',singleTitleAccent:'CIDADE.',multiBody:'Escolha a cidade e entre direto na página do evento.',singleFallbackBody:'Confira data, local e ingressos disponíveis.',soldOutLabel:'Esgotado',eventCta:'Ver evento e ingressos',continueLabel:'Continuar no institucional'}
  },
  es:{
    freelancerPage:{seoTitle:'Freelancers — GTRZ',eyebrow:'GTRZ · FREELANCERS',title:'TRABAJA CON NOSOTROS.',intro:'Regístrate en nuestra base de profesionales para futuras producciones. El registro no representa una promesa de contratación.',nameLabel:'Nombre completo',whatsappLabel:'WhatsApp',emailLabel:'E-mail',cityLabel:'Ciudad',stateLabel:'Estado',instagramLabel:'Instagram',rolesLabel:'Áreas de trabajo',rolesPlaceholder:'Producción, foto, bar, diseño...',portfolioLabel:'Portafolio',portfolioPlaceholder:'https://',availabilityLabel:'Disponibilidad / observaciones',submitLabel:'Enviar registro',successMessage:'Registro recibido. GTRZ se pondrá en contacto cuando exista una oportunidad compatible.',errorMessage:'No fue posible enviar. Inténtalo nuevamente.'},
    partnershipPage:{seoTitle:'Alianzas — GTRZ',eyebrow:'GTRZ · ALIANZAS',title:'CONSTRUYAMOS ALGO JUNTOS.',intro:'Espacios, marcas, artistas, proveedores y proyectos que quieran crear una experiencia con GTRZ.',contactNameLabel:'Tu nombre',companyNameLabel:'Empresa / proyecto',typeLabel:'Tipo de alianza',typePlaceholder:'—',venueOption:'Espacio / casa',brandOption:'Marca / patrocinio',artistOption:'Artista / proyecto cultural',supplierOption:'Proveedor',otherOption:'Otro',cityLabel:'Ciudad',emailLabel:'E-mail',whatsappLabel:'WhatsApp',messageLabel:'Cuéntanos la idea',submitLabel:'Enviar propuesta',successMessage:'Propuesta recibida. Nuestro equipo la revisará.',errorMessage:'No fue posible enviar. Inténtalo nuevamente.'},
    eventPage:{backLabel:'← GTRZ',dateLabel:'FECHA',venueLabel:'LUGAR',aboutLabel:'Sobre el evento',lineupEyebrow:'GTRZ',lineupTitle:'LINE-UP.',ticketsEyebrow:'Entradas',ticketsTitle:'ELIGE TU ENTRADA.',availableLabel:'DISPONIBLE',draftLabel:'PRÓXIMAMENTE',soldOutLabel:'AGOTADO',closedLabel:'CERRADO',buyLabel:'Comprar',noTickets:'Las entradas todavía no están disponibles.',notFoundTitle:'EVENTO NO ENCONTRADO.',notFoundCta:'GTRZ'},
    popup:{multiHeader:'Eventos GTRZ disponibles',singleHeader:'Hay un evento activo en GTRZ',closeLabel:'Cerrar',eyebrow:'Agenda abierta',multiTitleLine1:'HAY GTRZ',multiTitleLine2:'EN MÁS DE UNA',multiTitleAccent:'CIUDAD.',singleTitleLine1:'HAY GTRZ',singleTitleLine2:'EN TU',singleTitleAccent:'CIUDAD.',multiBody:'Elige la ciudad y entra directamente a la página del evento.',singleFallbackBody:'Consulta fecha, lugar y entradas disponibles.',soldOutLabel:'Agotado',eventCta:'Ver evento y entradas',continueLabel:'Continuar en el sitio institucional'}
  }
};

const tabMeta:Record<CopyTab,{label:string;title:string;description:string;icon:IconName}>={
  interface:{label:'Interface global',title:'Interface global',description:'SEO, menu principal, seletor inicial de idioma e rodapé do institucional.',icon:'globe'},
  freelancerPage:{label:'Trabalhe conosco',title:'Trabalhe conosco',description:'Textos da página e do formulário de cadastro de freelancers.',icon:'people'},
  partnershipPage:{label:'Parcerias',title:'Parcerias',description:'Textos da página, formulário e opções de proposta comercial.',icon:'commercial'},
  eventPage:{label:'Página de evento',title:'Página de evento',description:'Rótulos, estados, ingressos, line-up e mensagens das páginas de eventos.',icon:'events'},
  popup:{label:'Popup de eventos',title:'Popup de eventos',description:'Cabeçalhos, chamadas e botões do popup automático de agenda.',icon:'marketing'}
};

const interfaceGroups:InterfaceGroup[]=[
  {title:'SEO e ações globais',description:'Metadados principais e CTA fixo do site.',fields:[
    {ptKey:'metaTitlePt',esKey:'metaTitleEs',label:'Título SEO',help:'Título exibido na aba do navegador e mecanismos de busca.'},
    {ptKey:'metaDescriptionPt',esKey:'metaDescriptionEs',label:'Descrição SEO',help:'Resumo institucional para busca e compartilhamento.',multiline:true},
    {ptKey:'eventsLabelPt',esKey:'eventsLabelEs',label:'Botão Eventos',help:'Texto do botão de acesso à agenda.'}
  ]},
  {title:'Seletor inicial de idioma',description:'Toda a comunicação mostrada antes da entrada no site.',fields:[
    {ptKey:'langShortPt',esKey:'langShortEs',label:'Abreviação do idioma',help:'Texto curto usado no seletor PT / ES.'},
    {ptKey:'gateEyebrowPt',esKey:'gateEyebrowEs',label:'Linha de apoio'},
    {ptKey:'gateTitlePrefixPt',esKey:'gateTitlePrefixEs',label:'Título principal'},
    {ptKey:'gateTitleHighlightPt',esKey:'gateTitleHighlightEs',label:'Trecho em destaque'},
    {ptKey:'gateBodyPt',esKey:'gateBodyEs',label:'Texto explicativo',multiline:true},
    {ptKey:'gateHintPt',esKey:'gateHintEs',label:'Dica inferior',multiline:true},
    {ptKey:'gateOptionPt',esKey:'gateOptionEs',label:'Nome da opção de idioma'}
  ]},
  {title:'Rodapé',description:'Assinatura textual no fim do institucional.',fields:[
    {ptKey:'footerPt',esKey:'footerEs',label:'Texto do rodapé'}
  ]}
];

const copyGroups:Record<Exclude<CopyTab,'interface'>,PairGroup[]>={
  freelancerPage:[
    {title:'Página e SEO',description:'Apresentação da página antes do formulário.',fields:[
      {key:'seoTitle',label:'Título SEO'},{key:'eyebrow',label:'Linha de apoio'},{key:'title',label:'Título principal'},{key:'intro',label:'Texto de abertura',multiline:true}
    ]},
    {title:'Campos do formulário',description:'Rótulos e placeholders vistos pelo candidato.',fields:[
      {key:'nameLabel',label:'Nome completo'},{key:'whatsappLabel',label:'WhatsApp'},{key:'emailLabel',label:'E-mail'},{key:'cityLabel',label:'Cidade'},{key:'stateLabel',label:'Estado'},{key:'instagramLabel',label:'Instagram'},{key:'rolesLabel',label:'Áreas de atuação'},{key:'rolesPlaceholder',label:'Placeholder · áreas'},{key:'portfolioLabel',label:'Portfólio'},{key:'portfolioPlaceholder',label:'Placeholder · portfólio'},{key:'availabilityLabel',label:'Disponibilidade / observações'}
    ]},
    {title:'Ação e feedback',description:'Botão de envio e mensagens apresentadas após a tentativa.',fields:[
      {key:'submitLabel',label:'Botão de envio'},{key:'successMessage',label:'Mensagem de sucesso',multiline:true},{key:'errorMessage',label:'Mensagem de erro',multiline:true}
    ]}
  ],
  partnershipPage:[
    {title:'Página e SEO',description:'Apresentação da área comercial antes do formulário.',fields:[
      {key:'seoTitle',label:'Título SEO'},{key:'eyebrow',label:'Linha de apoio'},{key:'title',label:'Título principal'},{key:'intro',label:'Texto de abertura',multiline:true}
    ]},
    {title:'Campos do formulário',description:'Rótulos preenchidos por marcas, casas, artistas e fornecedores.',fields:[
      {key:'contactNameLabel',label:'Nome do contato'},{key:'companyNameLabel',label:'Empresa / projeto'},{key:'typeLabel',label:'Tipo de parceria'},{key:'cityLabel',label:'Cidade'},{key:'emailLabel',label:'E-mail'},{key:'whatsappLabel',label:'WhatsApp'},{key:'messageLabel',label:'Mensagem / ideia'}
    ]},
    {title:'Opções de parceria',description:'Itens disponíveis no seletor de tipo de proposta.',fields:[
      {key:'typePlaceholder',label:'Opção vazia'},{key:'venueOption',label:'Casa / espaço'},{key:'brandOption',label:'Marca / patrocínio'},{key:'artistOption',label:'Artista / projeto cultural'},{key:'supplierOption',label:'Fornecedor'},{key:'otherOption',label:'Outro'}
    ]},
    {title:'Ação e feedback',description:'Botão de envio e mensagens de retorno.',fields:[
      {key:'submitLabel',label:'Botão de envio'},{key:'successMessage',label:'Mensagem de sucesso',multiline:true},{key:'errorMessage',label:'Mensagem de erro',multiline:true}
    ]}
  ],
  eventPage:[
    {title:'Estrutura da página',description:'Rótulos gerais usados em qualquer edição publicada.',fields:[
      {key:'backLabel',label:'Voltar'},{key:'dateLabel',label:'Data'},{key:'venueLabel',label:'Local'},{key:'aboutLabel',label:'Sobre o evento'}
    ]},
    {title:'Line-up e ingressos',description:'Títulos das áreas de artistas e venda.',fields:[
      {key:'lineupEyebrow',label:'Linha de apoio · line-up'},{key:'lineupTitle',label:'Título · line-up'},{key:'ticketsEyebrow',label:'Linha de apoio · ingressos'},{key:'ticketsTitle',label:'Título · ingressos'},{key:'buyLabel',label:'Botão comprar'}
    ]},
    {title:'Estados de venda',description:'Textos associados ao status dos ingressos e do evento.',fields:[
      {key:'availableLabel',label:'Disponível'},{key:'draftLabel',label:'Em breve / rascunho'},{key:'soldOutLabel',label:'Esgotado'},{key:'closedLabel',label:'Encerrado'}
    ]},
    {title:'Estados vazios e erro',description:'Mensagens usadas quando não há venda ou a rota não existe.',fields:[
      {key:'noTickets',label:'Sem ingressos',multiline:true},{key:'notFoundTitle',label:'Evento não encontrado'},{key:'notFoundCta',label:'Botão do 404'}
    ]}
  ],
  popup:[
    {title:'Estrutura do popup',description:'Cabeçalhos e elementos comuns a qualquer configuração.',fields:[
      {key:'multiHeader',label:'Cabeçalho · vários eventos'},{key:'singleHeader',label:'Cabeçalho · um evento'},{key:'closeLabel',label:'Acessibilidade · fechar'},{key:'eyebrow',label:'Linha de apoio'}
    ]},
    {title:'Quando há vários eventos',description:'Chamada usada quando mais de uma cidade está ativa.',fields:[
      {key:'multiTitleLine1',label:'Título · linha 1'},{key:'multiTitleLine2',label:'Título · linha 2'},{key:'multiTitleAccent',label:'Título · destaque'},{key:'multiBody',label:'Texto explicativo',multiline:true}
    ]},
    {title:'Quando há um evento',description:'Chamada usada quando existe uma única edição ativa.',fields:[
      {key:'singleTitleLine1',label:'Título · linha 1'},{key:'singleTitleLine2',label:'Título · linha 2'},{key:'singleTitleAccent',label:'Título · destaque'},{key:'singleFallbackBody',label:'Texto padrão',multiline:true}
    ]},
    {title:'Estados e ações',description:'Status e botões de navegação do popup.',fields:[
      {key:'soldOutLabel',label:'Esgotado'},{key:'eventCta',label:'CTA do evento'},{key:'continueLabel',label:'Continuar no institucional'}
    ]}
  ]
};

function safeParse(raw:string|undefined,fallback:any){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function navText(value:any){return (Array.isArray(value)?value:[]).map((item:any)=>Array.isArray(item)?`${item[0]||''}|${item[1]||''}`:'').filter(Boolean).join('\n')}
function parseNav(value:string){return value.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const [label,...rest]=line.split('|');return [label?.trim()||'',rest.join('|').trim()||'#']}).filter(([label])=>label)}

function CopyInput({value,onChange,multiline=false}:{value:string;onChange:(value:string)=>void;multiline?:boolean}){
  if(multiline)return <textarea value={value} onChange={e=>onChange(e.target.value)}/>;
  return <input value={value} onChange={e=>onChange(e.target.value)}/>;
}

export function PublicCopy(){
  const [tab,setTab]=useState<CopyTab>('interface');
  const [chrome,setChromeState]=useState<any>(chromeDefaults);
  const [copy,setCopyState]=useState<any>(copyDefaults);
  const [navPt,setNavPtState]=useState(navText(chromeDefaults.navPt));
  const [navEs,setNavEsState]=useState(navText(chromeDefaults.navEs));
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [dirty,setDirty]=useState(false);

  const load=async()=>{
    const r=await api<any>('/api/admin/settings');
    const rows=r.results||[];
    const ch=rows.find((x:any)=>x.key==='chrome');
    const cp=rows.find((x:any)=>x.key==='copy');
    const nextChrome={...chromeDefaults,...safeParse(ch?.value_json,{})};
    const stored=safeParse(cp?.value_json,{});
    const nextCopy:any={'pt-BR':{},es:{}};
    (['pt-BR','es'] as Locale[]).forEach(locale=>Object.keys(copyDefaults[locale]).forEach(group=>{
      nextCopy[locale][group]={...copyDefaults[locale][group],...(stored?.[locale]?.[group]||{})};
    }));
    setChromeState(nextChrome);setCopyState(nextCopy);
    setNavPtState(navText(nextChrome.navPt));setNavEsState(navText(nextChrome.navEs));
    setDirty(false);
  };

  useEffect(()=>{load().catch(e=>setMessage(e.message));},[]);

  const setChrome=(key:string,value:string)=>{setChromeState((prev:any)=>({...prev,[key]:value}));setDirty(true)};
  const setNavPt=(value:string)=>{setNavPtState(value);setDirty(true)};
  const setNavEs=(value:string)=>{setNavEsState(value);setDirty(true)};
  const updateCopy=(locale:Locale,group:string,key:string,value:string)=>{
    setCopyState((prev:any)=>({...prev,[locale]:{...prev[locale],[group]:{...prev[locale][group],[key]:value}}}));
    setDirty(true);
  };

  const save=async()=>{
    setBusy(true);setMessage('');
    try{
      await Promise.all([
        api('/api/admin/settings/chrome',{method:'PUT',body:JSON.stringify({...chrome,navPt:parseNav(navPt),navEs:parseNav(navEs)})}),
        api('/api/admin/settings/copy',{method:'PUT',body:JSON.stringify(copy)})
      ]);
      setMessage('Alterações publicadas com sucesso.');
      await load();
    }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
  };

  const discard=async()=>{
    if(dirty&&!confirm('Descartar as alterações ainda não salvas?'))return;
    setMessage('');
    await load().catch(e=>setMessage(e.message));
  };

  const active=tabMeta[tab];
  const activeGroups=tab==='interface'?[]:copyGroups[tab];
  const totalFields=tab==='interface'?interfaceGroups.reduce((n,g)=>n+g.fields.length,0)+1:activeGroups.reduce((n,g)=>n+g.fields.length,0);

  return <div className="copy-workspace-v2">
    <div className="copy-controlbar-v2">
      <nav className="copy-tabs-v2" aria-label="Áreas de texto">
        {(Object.keys(tabMeta) as CopyTab[]).map(id=>{
          const item=tabMeta[id];
          return <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon name={item.icon} size={16}/><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="copy-control-actions-v2">
        {dirty&&<span className="copy-unsaved-v2"><i/>Alterações não salvas</span>}
        <button onClick={discard} disabled={busy||!dirty}>Descartar</button>
        <button className="primary" onClick={save} disabled={busy||!dirty}><Icon name="save" size={16}/>{busy?'Salvando…':'Salvar alterações'}</button>
      </div>
    </div>

    {message&&<Notice>{message}</Notice>}

    <section className="copy-overview-v2">
      <div><small>EDIÇÃO BILÍNGUE</small><h2>{active.title}</h2><p>{active.description}</p></div>
      <div className="copy-overview-meta-v2"><span><strong>{totalFields}</strong> campos</span><Badge tone="green">PT + ES</Badge></div>
    </section>

    <div className="copy-home-note-v2"><Icon name="content" size={18}/><div><strong>Textos da Home</strong><span>Hero, Sobre, Ritmos, Diferenciais, agenda, equipe, freelancers, parcerias, manifesto, Instagram e contato são editados em <b>Conteúdo → Home</b>. Esta área controla interface global e páginas auxiliares.</span></div></div>

    <div className="copy-language-header-v2" aria-hidden="true"><span>Campo</span><div><Badge tone="red">PT</Badge><strong>Português</strong></div><div><Badge tone="red">ES</Badge><strong>Español</strong></div></div>

    {tab==='interface'&&<div className="copy-groups-v2">
      {interfaceGroups.slice(0,1).map(group=><section className="copy-group-v2" key={group.title}><header><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{group.fields.length} campos</span></header><div className="copy-rows-v2">{group.fields.map(field=><div className={`copy-row-v2 ${field.multiline?'multiline':''}`} key={field.ptKey}><div className="copy-field-meta-v2"><strong>{field.label}</strong>{field.help&&<small>{field.help}</small>}</div><div className="copy-locale-field-v2" data-locale="PT"><CopyInput value={String(chrome[field.ptKey]??'')} onChange={value=>setChrome(field.ptKey,value)} multiline={field.multiline}/></div><div className="copy-locale-field-v2" data-locale="ES"><CopyInput value={String(chrome[field.esKey]??'')} onChange={value=>setChrome(field.esKey,value)} multiline={field.multiline}/></div></div>)}</div></section>)}

      <section className="copy-group-v2"><header><div><h3>Navegação principal</h3><p>Um item por linha no formato <code>Rótulo|#âncora</code>. A ordem das linhas define a ordem no menu.</p></div><span>menu</span></header><div className="copy-rows-v2"><div className="copy-row-v2 multiline"><div className="copy-field-meta-v2"><strong>Links do menu</strong><small>Edite nomes e destinos sem alterar o código.</small></div><div className="copy-locale-field-v2" data-locale="PT"><textarea className="copy-nav-textarea-v2" value={navPt} onChange={e=>setNavPt(e.target.value)}/></div><div className="copy-locale-field-v2" data-locale="ES"><textarea className="copy-nav-textarea-v2" value={navEs} onChange={e=>setNavEs(e.target.value)}/></div></div></div></section>

      {interfaceGroups.slice(1).map(group=><section className="copy-group-v2" key={group.title}><header><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{group.fields.length} campos</span></header><div className="copy-rows-v2">{group.fields.map(field=><div className={`copy-row-v2 ${field.multiline?'multiline':''}`} key={field.ptKey}><div className="copy-field-meta-v2"><strong>{field.label}</strong>{field.help&&<small>{field.help}</small>}</div><div className="copy-locale-field-v2" data-locale="PT"><CopyInput value={String(chrome[field.ptKey]??'')} onChange={value=>setChrome(field.ptKey,value)} multiline={field.multiline}/></div><div className="copy-locale-field-v2" data-locale="ES"><CopyInput value={String(chrome[field.esKey]??'')} onChange={value=>setChrome(field.esKey,value)} multiline={field.multiline}/></div></div>)}</div></section>)}
    </div>}

    {tab!=='interface'&&<div className="copy-groups-v2">{activeGroups.map(group=><section className="copy-group-v2" key={group.title}><header><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{group.fields.length} campos</span></header><div className="copy-rows-v2">{group.fields.map(field=><div className={`copy-row-v2 ${field.multiline?'multiline':''}`} key={field.key}><div className="copy-field-meta-v2"><strong>{field.label}</strong>{field.help&&<small>{field.help}</small>}</div><div className="copy-locale-field-v2" data-locale="PT"><CopyInput value={String(copy?.['pt-BR']?.[tab]?.[field.key]??'')} onChange={value=>updateCopy('pt-BR',tab,field.key,value)} multiline={field.multiline}/></div><div className="copy-locale-field-v2" data-locale="ES"><CopyInput value={String(copy?.es?.[tab]?.[field.key]??'')} onChange={value=>updateCopy('es',tab,field.key,value)} multiline={field.multiline}/></div></div>)}</div></section>)}</div>}
  </div>;
}
