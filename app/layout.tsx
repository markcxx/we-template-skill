import "./globals.css";
export const metadata = {title:"公众号排版 · 模板工作室"};
export default function Layout({children}: {children:React.ReactNode}) {
 return <html lang="zh-CN"><body><header className="studio-nav"><strong>公众号排版</strong><a href="/">选模板与组件</a><a href="/proof">成稿预览</a></header>{children}</body></html>;
}
