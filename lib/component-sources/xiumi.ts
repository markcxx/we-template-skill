import { load } from "cheerio";
import type { ComponentResult, NativeComponent } from "../component-sources";
import type { TemplateFilter } from "../template-sources";
import { extractPreview } from "../template-sources/preview";

type Tag = { tag_id: number; tag_name: string; childTags?: Tag[] };
type Entry = {
  template_id: number; accessibility_text: string; display_name?: string;
  renderer_accelerate?: string; tags?: Tag[];
};
const studio = "https://xiumi.us/studio/v5";
const option = (tag: Tag) => ({ id: String(tag.tag_id), label: tag.tag_name });

async function read<T>(path: string, params: URLSearchParams): Promise<T> {
  const response = await fetch(`https://xiumi.us/api/templates${path}?${params}`, {
    redirect: "error", signal: AbortSignal.timeout(20000), cache: "no-store",
  });
  if (!response.ok) throw new Error("秀米组件暂不可用。");
  const body = await response.json();
  if (body?.code !== 0 || !body.data) throw new Error("秀米组件暂不可用。");
  return body.data;
}

function component(entry: Entry, path: string[]): NativeComponent {
  const raw = entry.renderer_accelerate?.trim();
  const $ = load(raw || "", {}, false);
  const title = (entry.display_name && !entry.display_name.startsWith("paper-cp:") && entry.display_name)
    || $.text().replace(/\s+/g, " ").trim().slice(0, 36)
    || entry.display_name?.replace(/^paper-cp:/, "") || `组件 ${entry.template_id}`;
  const base = { id: String(entry.template_id), title, categoryPath: path,
    kind: path.at(-1) || "组件", image: "", url: studio, filters: {} };
  if (raw) {
    $("[src],[href],[xlink\\:href]").each((_, node) => {
      for (const attr of ["src", "href", "xlink:href"]) {
        const value = $(node).attr(attr);
        if (value?.startsWith("//")) $(node).attr(attr, "https:" + value);
      }
    });
    $("[style]").each((_, node) => {
      $(node).attr("style", ($(node).attr("style") || "").replace(/url\(\s*(["']?)\/\//gi, "url($1https://"));
    });
    if ($(".tn-comp,.tn-cell,p,img,svg,table,hr").length)
      return { ...base, preview: extractPreview(`<section class="xiumi-template">${$.html()}</section>`, "xiumi") };
  }
  return { ...base, sourceOnly: true, preview: { html: "", components: [] } };
}

export async function fetchXiumiComponents(params: URLSearchParams): Promise<ComponentResult> {
  const page = Number(params.get("page") || 1), pageSize = 20;
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new Error("页码无效。");
  const tree = await read<Tag[]>("/tags_tree", new URLSearchParams({
    tag_category: "paper-cp", tag_level_from: "2", tag_level_to: "0",
  }));
  const roots = tree[0]?.childTags;
  if (!roots?.length) throw new Error("秀米组件目录暂不可用。");
  const parent = roots.find(t => String(t.tag_id) === params.get("type"));
  const child = parent?.childTags?.find(t => String(t.tag_id) === params.get("subtype"));
  if ((params.get("type") && !parent) || (params.get("subtype") && !child)) throw new Error("组件分类无效。");
  const groups: TemplateFilter[] = [{ id: "type", label: "类型", options: roots.map(option) }];
  if (parent?.childTags?.length) groups.push({ id: "subtype", label: "细分", options: parent.childTags.map(option) });

  const request = new URLSearchParams({ tag_category: "paper-cp", template_category: "paper-cp",
    sort: "DESC", limit: String(pageSize), page: String(page - 1) });
  const selected = child || parent;
  if (selected) request.set("tag_ids", String(selected.tag_id));
  const data = await read<{ count: number; templates: Entry[] }>("", request);
  if (!Array.isArray(data.templates) || !Number.isSafeInteger(data.count) || data.count < 0) throw new Error("秀米组件列表暂不可用。");
  const items = data.templates.filter(e => e.accessibility_text === "Public" && Number.isSafeInteger(e.template_id)).map(entry => {
    const tags = new Set(entry.tags?.map(tag => tag.tag_id));
    const root = parent || roots.find(t => tags.has(t.tag_id) || t.childTags?.some(s => tags.has(s.tag_id)));
    const leaf = child || root?.childTags?.find(t => tags.has(t.tag_id));
    return component(entry, [root, leaf].flatMap(t => t ? [t.tag_name] : []));
  });
  return { groups, items, page, pageSize, total: data.count, hasNext: page * pageSize < data.count,
    loginRequired: false, sourceUrl: studio, fetchedAt: new Date().toISOString() };
}
