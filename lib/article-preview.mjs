import {deviceCss, phoneTop, phoneBottom, previewControls} from './phone-preview.mjs';
import {load} from 'cheerio';

const escapeText = value => String(value).replace(/[&<>"']/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[ch]);

export function articlePreview(html, metadata = {}, fallbackTitle = '未命名文章') {
  const $ = load(html, {}, false);
  const headline = $('h1').first();
  const title = metadata.title?.trim() || headline.text().trim() || fallbackTitle;
  headline.remove();
  const draftTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'short'
  }).format(new Date());
  const byline = [
    metadata.original === true && '<span class="original">原创</span>',
    '<span>'+escapeText(metadata.author?.trim() || '作者待填写')+'</span>',
    '<span class="account">'+escapeText(metadata.account?.trim() || '公众号名称待填写')+'</span>',
    '<time>'+escapeText(metadata.publishedAt?.trim() || draftTime+'（预览）')+'</time>'
  ].filter(Boolean).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeText(title)}</title><style>
*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#222}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
article{max-width:677px;margin:auto;padding:40px 16px 64px;overflow-wrap:anywhere}
header{margin-bottom:28px}h1{font-size:22px;font-weight:500;line-height:1.45;letter-spacing:.4px;margin:0 0 12px}
.byline{display:flex;align-items:baseline;flex-wrap:wrap;gap:3px 9px;font-size:15px;line-height:1.5;color:#888}
.account{color:#576b95}.original{font-size:12px;border-radius:3px;background:#f2f2f2;padding:0 4px}
main *{max-width:100%}main img{height:auto}main p{margin:0}
@media(max-width:700px){article{padding:20px 16px 48px}}
${deviceCss}</style></head><body>${previewControls}${phoneTop}<article><header><h1>${escapeText(title)}</h1><div class="byline">${byline}</div></header><main>${$.html()}</main></article>${phoneBottom}</body></html>`;
}
