import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icons';

export function Panel({title,eyebrow,children,action,description,className=''}:{title:string;eyebrow?:string;description?:string;children:ReactNode;action?:ReactNode;className?:string}){
  return <section className={`panel ${className}`.trim()}>
    <header className="panel-head"><div className="panel-title">{eyebrow&&<small>{eyebrow}</small>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{action&&<div className="panel-actions">{action}</div>}</header>
    {children}
  </section>;
}

export function Empty({children,icon='activity'}:{children:ReactNode;icon?:IconName}){
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={20}/></span><div>{children}</div></div>;
}

export function Metric({label,value,detail,icon='activity',tone='default'}:{label:string;value:string|number;detail?:string;icon?:IconName;tone?:'default'|'red'|'good'|'warn'}){
  return <article className={`metric metric-${tone}`}><div className="metric-top"><span>{label}</span><i><Icon name={icon} size={16}/></i></div><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>;
}

export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'red'|'green'|'yellow'|'blue'}){
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Notice({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'success'|'error'|'warning'}){
  return <div className={`notice notice-${tone}`}>{tone==='success'&&<Icon name="check" size={16}/>}<span>{children}</span></div>;
}
