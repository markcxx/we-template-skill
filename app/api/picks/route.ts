import {createHash} from "node:crypto";
import {mkdir,writeFile,utimes} from "node:fs/promises";
import path from "node:path";
import {home} from "@/lib/paths.mjs";
export async function POST(req:Request){
 const origin=req.headers.get("origin");
 if(!origin || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) || new URL(origin).host!==req.headers.get("host"))return new Response(null,{status:403});
 if(!req.headers.get("content-type")?.startsWith("application/json"))return new Response(null,{status:415});
 const {source,id,title,role,html}=await req.json();
 if(typeof html!=="string"||!html.trim()||html.length>12_000_000||![source,id,title].every(x=>typeof x==="string"&&x.length<400)||!["view", "layout","heading","divider","ending","note"].includes(role))return new Response(null,{status:400});
 const key=createHash("sha256").update(JSON.stringify([source,id,role,html])).digest("hex").slice(0,20);
 const dir=path.join(home,"picks");await mkdir(dir,{recursive:true});
 try{await writeFile(path.join(dir,key+".json"),JSON.stringify({key,source,id,title,role,html}),{flag:"wx"});}
 catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;const now=new Date();await utimes(path.join(dir,key+".json"),now,now);}
 return Response.json({key});
}
