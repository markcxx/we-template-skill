import {load} from 'cheerio';

export function draftBody(html) {
  const $ = load(html, {}, false);
  const title = $('h1').first().text().trim();
  $('h1').first().remove();
  $('script,iframe,style,link,form').remove();
  for (const el of $('*')) {
    const node = $(el);
    for (const name of Object.keys(el.attribs)) {
      if (/^(class$|data-|aria-|tn-|on|tabindex$|role$)/i.test(name)) node.removeAttr(name);
    }
    const inline = node.attr('style');
    if (!inline) continue;
    const style = inline.split(/;(?![^()]*\))/).map(x=>x.trim()).filter(Boolean)
      .filter(x=>!['position:static','width:auto','height:auto','flex-flow:row','background-attachment:scroll'].includes(x))
      .map(x=>x.replace(/(?<![\w.#-])0px\b/g,'0').replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g,(_,r,g,b)=>'#'+[r,g,b].map(v=>Number(v).toString(16).padStart(2,'0')).join('')))
      .join(';');
    if (style) node.attr('style',style); else node.removeAttr('style');
  }
  for(const el of $('[style]')){
    const node=$(el), parentStyle=node.parent().attr('style') || '';
    const inFlex=/(?:^|;)display:(?:inline-)?flex(?:;|$)/.test(parentStyle);
    const parts=node.attr('style').split(/;(?![^()]*\))/);
    const style=parts.filter(x=>{
      if(inFlex && (x==='display:inline-block' || x.startsWith('vertical-align:'))) return false;
      if(x.startsWith('justify-content:') && !parts.some(v=>/^display:(inline-)?(flex|grid)$/.test(v)))return false;
      return true;
    }).map(x=>x==='flex:0 0 auto'?'flex:none':x).join(';');
    if(style)node.attr('style',style);else node.removeAttr('style');
  }
  // In this standalone inline-only body, nested neutral blocks with a single
  // block child may be collapsed, except where they are themselves flex/grid items.
  for(const el of $('div,section').toArray().reverse()){
    const node=$(el),child=node.children();
    if(Object.keys(el.attribs).length || child.length!==1 || !child.is('div,section') || /display:\s*(?:inline-)?(?:flex|grid)/.test(node.parent().attr('style')||''))continue;
    if(node.contents().toArray().some(n=>n.type==='text'&&n.data.trim()))continue;
    node.replaceWith(child);
  }
  // The editor may unwrap a layout block. Keep a fixed ornament's width on
  // the image itself while still allowing it to shrink on narrow screens.
  for (const el of $('img')) {
    const image = $(el);
    const width = image.parent().css('width');
    if (image.css('width') !== '100%' || !/^\d+(?:\.\d+)?px$/.test(width || '')) continue;
    image.css('width', width);
    image.attr('width', String(parseFloat(width)));
  }

  for (const el of $('img[width]')) {
    const image = $(el);
    const wrapper = image.parent();
    const style = wrapper.attr('style') || '';
    if (wrapper.children().length !== 1 || wrapper.text().trim() ||
        !wrapper.is('section,div') || wrapper.css('display') !== 'inline-block' ||
        wrapper.css('width') !== image.css('width') ||
        style.split(';').filter(Boolean).some(prop => !/^(?:width|max-width|line-height|vertical-align|display):/.test(prop)) ||
        Object.keys(wrapper[0].attribs).some(key => key !== 'style')) continue;
    image.attr('style', style + ';' + image.attr('style'));
    wrapper.replaceWith(image);
  }

  // Unwrap a single normal-flow block when the wrapper only supplies
  // inherited typography or zero margin. Transfer the inherited properties.
  for (const el of $('section,div').toArray().reverse()) {
    const node = $(el);
    const child = node.children();
    if (child.length !== 1 || !child.is('section,div') ||
        node.contents().toArray().some(n => n.type === 'text' && n.data.trim()) ||
        Object.keys(el.attribs).some(name => name !== 'style')) continue;
    if (/flex|grid/.test(node.parent().css('display') || '') ||
        /^(?:inline|contents)/.test(child.css('display') || '') ||
        /^(?:absolute|fixed|sticky)$/.test(child.css('position') || '')) continue;
    const styles = (node.attr('style') || '').split(';').filter(Boolean);
    if (!styles.every(prop => prop === 'margin:0' || /^(?:text-align|line-height|color):/.test(prop))) continue;
    const typography = styles.filter(prop => prop !== 'margin:0');
    if (typography.length) child.attr('style', [...typography, child.attr('style') || ''].join(';'));
    node.replaceWith(child);
  }
  for (const el of $('div')) el.tagName = 'section';
  // Repeated template groups often restate the same inherited alignment.
  for (const el of $('section[style]').toArray().reverse()) {
    const node = $(el);
    const align = node.css('text-align');
    if (!align) continue;
    let parent = node.parent();
    while (parent.is('section') && !parent.css('text-align')) parent = parent.parent();
    if (parent.is('section') && parent.css('text-align') === align) node.css('text-align', '');
    if (!node.attr('style')?.trim()) node.removeAttr('style');
  }
  return {title, $, content:()=>$.html()};
}
