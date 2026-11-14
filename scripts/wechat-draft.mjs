import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {minify} from 'html-minifier-terser';
import {draftBody} from '../lib/draft-html.mjs';
import {home} from '../lib/paths.mjs';

const [file,...args]=process.argv.slice(2);
const flags=new Set(['--meta','--cover','--cover-id','--send','--static-images','--out','--check-assets','--bundle']);
function option(key){return args.includes(key)?args[args.indexOf(key)+1]:undefined}
const count=text=>Array.from(text).length;
const hash=value=>createHash('sha256').update(value).digest('hex');
const cssUrl=/url\(\s*(["']?)([^"')]+?)\1\s*\)/gi;
const compact=html=>minify(html,{removeComments:true,removeAttributeQuotes:false,minifyCSS:{level:2},collapseWhitespace:true,conservativeCollapse:true});
function validate(content){
  if(count(content)>=20000 || Buffer.byteLength(content)>=1048576)throw Error('精简后的正文仍超过微信限制，请简化装饰组件。');
}
async function api(endpoint,options,token){
  const url=new URL('/cgi-bin/'+endpoint,'https://api.weixin.qq.com');
  if(token)url.searchParams.set('access_token',token);
  const response=await fetch(url,{method:'POST',...options,redirect:'error',signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  if(!response.ok || data.errcode){const error=Error('微信接口 '+endpoint+' 返回 '+(data.errcode || response.status)+'。');error.wechatRejected=!!data.errcode;throw error}
  return data;
}
const jsonPost=value=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
function upload(name,buffer,format){
  const body=new FormData();body.set('media',new Blob([buffer],{type:'image/'+format}),name+'.'+format);return {body};
}
async function imageBytes(ref,root){
  if(!/^https:/i.test(ref)){
    if(/^[\w+.-]+:|^\/|^\\/.test(ref))throw Error('图像必须是 HTTPS 素材或文章目录中的相对路径。');
    const real=await fs.realpath(path.resolve(root,ref));
    if(!real.startsWith(root+path.sep))throw Error('图像位于文章目录以外。');
    return fs.readFile(real);
  }
  const u=new URL(ref);
  if(u.username||u.password||u.port||!/(^|\.)(xiumi\.us|xiumius\.cn|96weixin\.com|135editor\.com|xmyeditor\.com|xmyeditor\.cn|qpic\.cn|qlogo\.cn)$/i.test(u.hostname))
    throw Error('请把此来源的图片保存到文章目录后再导入：'+u.hostname);
  const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('无法读取正文图片，HTTP '+r.status);
  const chunks=[];let size=0;
  for await(const chunk of r.body){size+=chunk.length;if(size>20_000_000)throw Error('单张源图片超过 20 MB');chunks.push(chunk)}
  return Buffer.concat(chunks);
}
async function convert(buffer,allowStatic){
  const meta=await sharp(buffer).metadata();
  if (meta.pages > 1 && meta.format === 'gif' && buffer.length < 10_000_000 && !allowStatic) return {buffer, format: 'gif'};
  if(meta.pages>1&&!allowStatic)throw Error('正文含动画，请选用静态图，或明确使用 --static-images 转为首帧。');
  if(['jpeg','png'].includes(meta.format)&&buffer.length<1_000_000&&!(meta.pages>1))return {buffer,format:meta.format};
  for(const width of [1800,1280,960,720,480]){
    const img=sharp(buffer,{page:0,pages:1}).rotate().resize({width,withoutEnlargement:true});
    const bytes=meta.hasAlpha?await img.png({palette:true}).toBuffer():await img.jpeg({quality:84}).toBuffer();
    if(bytes.length<1_000_000)return {buffer:bytes,format:meta.hasAlpha?'png':'jpeg'};
  }
  throw Error('图片无法压缩至微信限制以内。');
}
async function run(){
  if(!file)throw Error('需要指定 article.html；未带 --send 时仅做本地预检。');
  for(let i=0;i<args.length;i++){const k=args[i];if(!flags.has(k))throw Error('未知选项 '+k);if(['--meta','--cover','--cover-id','--out'].includes(k)&&(!args[++i]||args[i].startsWith('--')))throw Error(k+' 缺少参数')}
  const source=await fs.readFile(file,'utf8'), draft=draftBody(source), $=draft.$;
  const meta=option('--meta')?JSON.parse(await fs.readFile(option('--meta'),'utf8')):{};
  const title=meta.title || draft.title, author=meta.author||'',digest=meta.digest||'';
  if(!title || [title,author,digest].some((v,i)=>typeof v!=='string'||count(v)>[32,16,120][i]))throw Error('请检查标题（1–32字）、作者（最多16字）和摘要（最多120字）。');
  const refs=new Set(),links=[];
  for(const el of $('img,image,use,[style]')){
    const node=$(el);
    const attrs=el.name==='img'?['src']:['image','use'].includes(el.name)?['href','xlink:href']:[];
    for(const key of attrs){const ref=node.attr(key);if(ref&&!ref.startsWith('#')){refs.add(ref);links.push(map=>node.attr(key,map.get(ref)))}}
    const style=node.attr('style');if(!style)continue;
    for(const [, ,ref] of style.matchAll(cssUrl))if(!ref.startsWith('#'))refs.add(ref);
    links.push(map=>node.attr('style',style.replace(cssUrl,(match,q,ref)=>map.has(ref)?'url("'+map.get(ref)+'")':match)));
  }
  const content=await compact(draft.content());validate(content);
  const summary={title,sourceChars:count(source),draftChars:count(content),images:refs.size,cover:!!(option('--cover')||option('--cover-id')),placeholder:content.includes('二维码待替换') || source.includes('data-template-demo="qr"')};
  if(option('--out')){
    if(path.resolve(option('--out'))===path.resolve(file))throw Error('请为草稿副本选择不同文件名。');
    await fs.writeFile(option('--out'),content);
  }
  if(!args.includes('--send') && !args.includes('--check-assets') && !args.includes('--bundle')){console.log(JSON.stringify(summary,null,2));return}
  if(!summary.cover)throw Error('需要 --cover 本地封面路径，或 --cover-id 永久图片素材 ID。');
  const cover=option('--cover')?await fs.readFile(option('--cover')):null;
  const coverFormat=cover?(await sharp(cover).metadata()).format:null;
  if(cover&&(!['png','jpeg','gif'].includes(coverFormat)||cover.length>10_000_000))throw Error('请选择 10 MB 以内的 JPG、PNG 或 GIF 封面。');
  const root=await fs.realpath(path.dirname(path.resolve(file))), images=new Map();
  if(args.includes('--bundle')){
    if(summary.placeholder)throw Error('请先替换模板二维码占位符。');
    for(const ref of refs){
      if(!/^images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(ref))throw Error('交稿包的图片必须使用 images/ 下的相对路径和英文文件名。');
    }
  }
  for(const ref of refs)images.set(ref,await convert(await imageBytes(ref,root),args.includes('--static-images')));
  if(!args.includes('--send')){console.log(JSON.stringify({...summary,assetsChecked:true},null,2));return}
  // Treat credentials from one source as a pair to avoid mixing accounts.
  if (!['WECHAT_APP_ID','WECHAT_APP_SECRET','WECHAT_ACCESS_TOKEN'].some(name=>process.env[name])) {
    try { process.loadEnvFile(path.join(home,'wechat.env')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const appid=process.env.WECHAT_APP_ID;
  if(!appid || !(process.env.WECHAT_ACCESS_TOKEN||process.env.WECHAT_APP_SECRET))throw Error('本地需配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET 或 WECHAT_ACCESS_TOKEN。');

  const stateDir=path.join(home,'wechat-drafts');await fs.mkdir(stateDir,{recursive:true,mode:0o700});
  const receipt=path.join(stateDir,hash(appid+'\n'+await fs.realpath(file))+'.json'),lock=receipt+'.lock';
  const handle=await fs.open(lock,'wx',0o600).catch(e=>{if(e.code==='EEXIST')throw Error('同一草稿正在同步，或上次同步未正常结束。请先核对微信草稿箱。');throw e});await handle.close();
  const save=async value=>{const tmp=receipt+'.'+randomUUID();await fs.writeFile(tmp,JSON.stringify(value),{mode:0o600});await fs.rename(tmp,receipt)};
  try{
    let previous;try{previous=JSON.parse(await fs.readFile(receipt,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
    if(previous?.pending)throw Error('上次创建结果未确认，请在草稿箱核对后处理回执 '+receipt);
    const signature=hash(JSON.stringify([title,author,digest,content,option('--cover-id'),cover&&hash(cover),[...images.values()].map(v=>hash(v.buffer))]));
    if(previous?.signature===signature){console.log(JSON.stringify(previous));return}
    const token=process.env.WECHAT_ACCESS_TOKEN||(await api('stable_token',jsonPost({grant_type:'client_credential',appid,secret:process.env.WECHAT_APP_SECRET,force_refresh:false}))).access_token;
    if(!token)throw Error('微信未返回有效凭证');
    const mapped=new Map();
    for(const [ref,{buffer,format}] of images){
      const endpoint = format === 'gif' ? 'material/add_material?type=image' : 'media/uploadimg';
      const {url}=await api(endpoint,upload('body',buffer,format),token);
      if(typeof url!=='string'||!/^https?:\/\//i.test(url))throw Error('正文图片上传未返回 URL');
      mapped.set(ref,url);
    }
    links.forEach(rewrite=>rewrite(mapped));const finalContent=await compact(draft.content());validate(finalContent);
    const coverId=option('--cover-id')||(await api('material/add_material?type=image',upload('cover',cover,coverFormat),token)).media_id;
    if(!coverId)throw Error('封面上传未返回永久素材 ID');
    const article={title,author,digest,content:finalContent,thumb_media_id:coverId};
    let media_id=previous?.media_id;
    if(media_id)await api('draft/update',jsonPost({media_id,index:0,articles:article}),token);
    else{
      await save({pending:true,title});
      let response;
      try{response=await api('draft/add',jsonPost({articles:[article]}),token)}
      catch(e){if(e.wechatRejected)await fs.unlink(receipt);throw e}
      media_id=response.media_id;
      if(!media_id)throw Error('未收到草稿 ID，请核对公众号后台。');
    }
    await save({media_id,title,signature});console.log(JSON.stringify({title,media_id,receipt}));
  }finally{await fs.unlink(lock)}
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
