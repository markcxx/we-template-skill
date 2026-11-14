import {readFile} from "node:fs/promises";
import path from "node:path";
import {home} from "@/lib/paths.mjs";

export const dynamic = "force-dynamic";
export async function GET() {
  let page: string;
  try {
    page = await readFile(path.join(home, "latest.html"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    page = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>公众号预览</title><p>生成文章后即可在这里预览。</p></html>';
  }
  return new Response(page, {headers: {
    "Content-Type":"text/html; charset=utf-8", "Cache-Control":"no-store",
    "Content-Security-Policy":"sandbox; default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
  }});
}
