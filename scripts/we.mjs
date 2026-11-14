import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import MarkdownIt from 'markdown-it';
import sanitize from 'sanitize-html';
import {load} from 'cheerio';
import {articlePreview} from '../lib/article-preview.mjs';
import {home} from '../lib/paths.mjs';

const [cmd,...args]=process.argv.slice(2);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const picks=path.join(home,'picks');
const json=v=>JSON.stringify(v,null,2);
const print=v=>console.log(json(v));
const getPick=k=>{if(!/^[a-f0-9]{20}$/.test(k))throw Error('无效的选样编号');return read(path.join(picks,k+'.json'))};
const one=($,s)=>{const nodes=$(s);if(nodes.length!==1)throw Error('填充位置必须唯一：'+s+'（命中 '+nodes.length+'）');return nodes};
const md=new MarkdownIt({html:false,breaks:true});
function bare(html){return load(html,{},false)}
function fill(part,html) {
 const $=bare(part.html);
 if(part.target)one($,part.target).html(html);
 return $.html();
}
async function bundle(plan){
 const parts={};
 for(const [role,spec] of Object.entries(plan.parts||{})){
  if(!['layout','heading','divider','ending','note'].includes(role))throw Error('未知组件用途：'+role);
  const p=await getPick(spec.key),$=bare(p.html);
  for(const sel of spec.remove||[])one($,sel).remove();
  if(['layout','heading','note'].includes(role)&&!spec.target)throw Error(role+' 需要填写 target');
  if(spec.target)one($,spec.target).empty();
  parts[role]={...p,role,html:$.html(),target:spec.target};
 }
 return {format:1,name:plan.name,parts};
}
function render(pack,source){
 if(pack.format!==1)throw Error('不支持的模板包版本');
 const parts=pack.parts;
 const $=bare(md.render(source));
 // Apply inline marks only to text nodes; code spans and attributes stay literal.
 $('p,li,strong,em,blockquote,h1,h2,h3').contents().each((_,n)=>{
  if(n.type!=='text'||!n.data.includes('=='))return;
  const esc=md.utils.escapeHtml;
  $(n).replaceWith(esc(n.data).replace(/==([^=\n]+)==/g,'<mark style="background:#fff1a8;color:inherit">$1</mark>'));
 });
 $('h1').attr('style','font-size:24px;line-height:1.45;margin:24px 0 14px');
 $('h2,h3').attr('style','font-size:19px;line-height:1.55;color:#253a35;margin:28px 0 12px');
 $('p').attr('style','margin:0 0 16px');$('ul,ol').attr('style','padding-left:1.5em;margin:0 0 16px');
 $('img').attr('style','max-width:100%;height:auto');
 $('blockquote').each((_,el)=>{
  const q=$(el),p=q.children('p').first(),note=/^\[!NOTE\](?:\s|$)/.test(p.text());
  if(note)p.html((p.html()||'').replace(/^\[!NOTE\](?:\s|<br\s*\/?>)*/,''));
  if(note&&parts.note)q.replaceWith(fill(parts.note,q.html()||''));
  else q.attr('style','margin:18px 0;padding:14px 18px;border-left:3px solid #96ada3;background:#f4f7f5;color:#486057');
 });
 $('hr').each((_,e)=>{if(parts.divider)$(e).replaceWith(parts.divider.html);else $(e).attr('style','border:0;border-top:1px solid #dfe6e2;margin:26px 0')});
 if(parts.heading)$('h2').each((_,el)=>$(el).replaceWith(fill(parts.heading,$(el).html()||'')));
 let body=$.html()+(parts.ending?.html||'');
 if(parts.layout)body=fill(parts.layout,body);
 const doc=bare(body);
 doc('[data-component],[data-selected]').each((_,el)=>{for(const k of ['data-component','data-selected','tabindex','aria-label','role'])doc(el).removeAttr(k)});
 // Snapshots were sanitized at ingestion; enforce a final boundary for imported packs.
 const html=sanitize(doc.html(),{parser:{lowerCaseTags:false,lowerCaseAttributeNames:false},allowedTags:[...sanitize.defaults.allowedTags,'img','mark','svg','g','path','rect','circle','image','foreignObject','defs','linearGradient','radialGradient','stop','use','clipPath','polygon','polyline','line','ellipse','text','tspan'],allowedAttributes:{'*':['class','style','id','width','height','fill','stroke','viewBox','transform','opacity','d','x','y','x1','x2','y1','y2','rx','ry','cx','cy','r','offset','points','stroke-width','clip-path','preserveAspectRatio','xmlns','xmlns:xlink','stop-color','stop-opacity'],'a':['href'],'img':['src','alt'],'image':['href','xlink:href'],'use':['href','xlink:href']},allowedSchemes:['https','mailto'],allowProtocolRelative:false});
 return '<section style="font:16px/1.8 -apple-system,BlinkMacSystemFont,sans-serif;color:#303832;overflow-wrap:break-word">'+html+'</section>';
}
async function run(){
 if(cmd==='sheets'){
  const dir=path.join(home,'sheets');const files=await fs.readdir(dir).catch(()=>[]);
  const recent=await Promise.all(files.filter(f=>f.endsWith('.json')).map(async f=>({f,time:(await fs.stat(path.join(dir,f))).mtimeMs})));
  const rows=[];for(const {f,time} of recent.sort((a,b)=>b.time-a.time).slice(0,8)){const s=await read(path.join(dir,f));rows.push({sheet:f.slice(0,-5),source:s.source,kind:s.kind,page:s.page,count:s.items.length,time})}print(rows);return;
 }
 if(cmd==='sheet'||cmd==='choose'){
  const reference = cmd === 'choose' && /^we:([a-f0-9]{16}):(\d+)$/.exec(args[0]);
  if (reference) args.splice(0, 1, reference[1], reference[2]);
  if(!/^[a-f0-9]{16}$/.test(args[0]))throw Error('无效选样单');
  const s=await read(path.join(home,'sheets',args[0]+'.json'));
  if(cmd==='sheet'){print(s.items.map(({id,title})=>({id,title})));return}
  const item=s.items.find(v=>v.id===args[1]),role=args[2];
  if(!item||item.sourceOnly||!['layout','heading','divider','ending','note'].includes(role))throw Error('请检查编号、用途及可用性');
  let html=item.html;
  if(!html){
   // Prefer the actual preview already viewed; only fetch an unseen template by stable ID.
   const keys=await fs.readdir(picks).catch(()=>[]);
   let recent,stamp=0;
   for(const f of keys.filter(f=>f.endsWith('.json'))){const file=path.join(picks,f),p=await read(file);
    if(p.source===s.source&&p.id===item.id&&p.role==='view'){const t=(await fs.stat(file)).mtimeMs;if(t>stamp){stamp=t;recent=p}}}
   if(recent)html=recent.html;
   else {const port=process.env.WE_TEMPLATE_PORT||'3011';if(!/^\d{1,5}$/.test(port))throw Error('无效端口');
    const r=await fetch('http://127.0.0.1:'+port+'/api/templates/preview?'+new URLSearchParams({source:s.source,id:item.id}));if(!r.ok)throw Error('模板正文不可用');html=(await r.json()).html;}
  }
  if(!html)throw Error('缺少可用 HTML');
  const key=createHash('sha256').update(JSON.stringify([s.source,item.id,role,html])).digest('hex').slice(0,20);
  await fs.mkdir(picks,{recursive:true});await fs.writeFile(path.join(picks,key+'.json'),json({key,source:s.source,id:item.id,title:item.title,role,html}));print({key});return;
 }
 if(cmd==='picks'){
  await fs.mkdir(picks,{recursive:true});const rows=[];
  for(const f of await fs.readdir(picks)){if(!f.endsWith('.json'))continue;const {html,...v}=await read(path.join(picks,f));rows.push({...v,modified:(await fs.stat(path.join(picks,f))).mtimeMs})}
  print(rows.sort((a,b)=>b.modified-a.modified));return;
 }
 if(cmd==='inspect'){const p=await getPick(args[0]);console.log(p.html);return}
 if(cmd==='pack'){
  const pack=await bundle(await read(args[0]));await fs.writeFile(args[1],json(pack),{flag:'wx'});console.log(path.resolve(args[1]));return;
 }
 if(cmd==='render' || cmd==='preview'){
  const metaIndex = args.indexOf('--meta');
  let metadata = {};
  if (metaIndex >= 0) {
    const [, file] = args.splice(metaIndex, 2);
    if (!file) throw Error('--meta 需要文章信息 JSON 文件');
    metadata = await read(file);
  }
  const [article,out,packFile]=args;
  const source = await fs.readFile(article,'utf8');
  const html = cmd === 'preview' ? source : render(packFile?await read(packFile):{format:1,parts:{}},source);
  const preview = articlePreview(html, metadata, path.parse(article).name);
  await fs.mkdir(out,{recursive:true});
  if(cmd==='render') await fs.writeFile(path.join(out,'article.html'),html);
  await fs.writeFile(path.join(out,'preview.html'),preview);
  await fs.mkdir(home,{recursive:true});const temp=path.join(home,randomUUID()+'.tmp');await fs.writeFile(temp,preview);await fs.rename(temp,path.join(home,'latest.html'));
  print({article:path.resolve(out,'article.html'),preview:path.resolve(out,'preview.html')});return;
 }
 throw Error('用法：picks | inspect KEY | pack PLAN.json NEW-PACK.json | render ARTICLE.md OUTDIR [PACK.json]');
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
