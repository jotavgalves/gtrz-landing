import type { ReactNode } from 'react';
export function Panel({title,eyebrow,children,action}:{title:string;eyebrow?:string;children:ReactNode;action?:ReactNode}){return <section className="panel"><header><div>{eyebrow&&<small>{eyebrow}</small>}<h2>{title}</h2></div>{action}</header>{children}</section>}
export function Empty({children}:{children:ReactNode}){return <div className="empty">{children}</div>}
export function Metric({label,value}:{label:string;value:string|number}){return <article className="metric"><span>{label}</span><strong>{value}</strong></article>}
