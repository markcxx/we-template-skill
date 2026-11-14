"use client";
import {useState} from "react";
import {Check, Copy} from "lucide-react";

export function sourceRef(source:string,id:string,kind:string,sheet?:string) {
  return sheet ? `we:${sheet}:${id}` : `${kind} · 来源 ${source} · ID ${id}`;
}
export async function snapshotKey(source:string,id:string,title:string,role:string,html:string):Promise<string>{
  const r=await fetch("/api/picks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source,id,title,role,html})});
  if(!r.ok)throw Error("快照保存失败");
  return (await r.json()).key;
}
export default function CopyId({value,disabled=false,variant="inline"}:{value:string|(()=>Promise<string>);disabled?:boolean;variant?:"inline"|"overlay"|"icon"}){
  const [status,setStatus]=useState(""),[manual,setManual]=useState("");
  async function copy(){
    setManual("");let text="";
    try {
      text=typeof value==="string"?value:await value();
      await navigator.clipboard.writeText(text);setStatus("已复制");
    } catch {setManual(text);setStatus(text?"请手动复制":"未能取得 ID，请重试");}
  }
  const Icon = status === "已复制" ? Check : Copy;
  return <span className={`copy-ref copy-ref-${variant}`}>
    <button type="button" disabled={disabled} aria-label="复制 ID" title={status || "复制 ID"} onClick={copy}>
      <Icon size={variant === "icon" ? 19 : 16} strokeWidth={1.65}/>
      {variant !== "icon" && (status || "复制 ID")}
    </button>
    <span className="copy-feedback" role="status">{status}</span>
    {manual && <input aria-label="手动复制 ID" readOnly value={manual} autoFocus onFocus={e=>e.target.select()}/>}
  </span>;
}
