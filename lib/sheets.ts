import {createHash,randomUUID} from "node:crypto";
import {mkdir,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {home} from "./paths.mjs";
import type {SourceTemplate, TemplateResult} from "./template-sources";
import type {NativeComponent} from "./component-sources";
// A short-lived handoff for the visible page. Permanent user picks are independent.
export async function sheet(result:TemplateResult,source:string,kind:"template"|"component"){
 const dir=path.join(home,"sheets");await mkdir(dir,{recursive:true});
 const items=result.items.map((item:SourceTemplate)=>{
  const comp=item as Partial<NativeComponent>;
  return {id:item.id,title:item.title,html:comp.preview?.html,sourceOnly:comp.sourceOnly};
 });
 const content=JSON.stringify({kind,source,page:result.page,items});
 const key=createHash("sha256").update(content).digest("hex").slice(0,16);
 const temp=path.join(dir,randomUUID()+".tmp");
 await writeFile(temp,content);await rename(temp,path.join(dir,key+".json"));
 return {...result,sheet:key};
}
