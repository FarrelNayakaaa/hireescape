import { NumberBadge } from "@/components/ui";
export function SectionTitle({n,title,id}:{n:number;title:string;id:string}){return <div className="flex items-center gap-3 mb-5"><NumberBadge n={n}/><h2 id={id}>{title}</h2></div>;}
