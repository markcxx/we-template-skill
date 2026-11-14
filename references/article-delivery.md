# 私有仓库交稿

从用户指定的私有仓库根目录组织稿件。每篇使用稳定编号，例如 `2026-11-14-ai-daily`。编号格式为 YYYY-MM-DD 加短横线和小写英文或数字短名，可用短横线分词，总长不超过 80。改同一篇保留编号，同一天的不同文章用不同短名。

```text
articles/<issue_id>/
  article.md       原稿
  metadata.json    标题、作者、摘要及可选预览信息
  article.html     最终正文片段
  preview.html     发给用户的阅读预览
  cover.jpg        本期封面，JPEG
  images/          正文和模板中实际用到的图片，无图可省
  sources.md       采编稿列出信息来源、链接和日期；用户原创稿注明来源
```

metadata.json 示例为 `{"title":"本期标题","author":"署名","digest":"本期摘要"}`。使用真实署名，作者和摘要可省略。标题、作者、摘要分别最多 32、16、120 个字。可选的 account、publishedAt 用于预览；原创标识按主说明处理。引用图片、背景图和装饰图都应下载到本期 images/ 并改为相对路径，使用字母、数字、连字符或下划线命名。封面建议在审稿时单独展示。

在 skill 目录执行，令 ISSUE 是本期完整目录路径。已定版式时，在输出目录参数后追加模板包路径。

```sh
node scripts/we.mjs render "$ISSUE/article.md" "$ISSUE" --meta "$ISSUE/metadata.json"
node scripts/wechat-draft.mjs "$ISSUE/article.html" --meta "$ISSUE/metadata.json" --cover "$ISSUE/cover.jpg" --bundle
```

有手工调整时用 `we.mjs preview` 从最终 article.html 重新生成 preview.html。检查预览和封面，把整包作为普通文件提交到私有仓库，记录已推送的完整 40 位 commit SHA。在 Muse 中给用户展示该版本的预览及封面，可通过附件或截图展示，保留原始稿件包供核对。用户要求修改时重新生成、提交并出示新版预览。

用户确认该版后，从能访问目标私有仓库的环境触发投递。REPO 为用户指定的 owner/repo，ISSUE_ID、APPROVED_SHA 分别为确认的编号和提交。私有仓库需实现下面的工作流接口。只具备浏览器的智能体可在该仓库 Actions 中使用同名工作流的 Run workflow 表单输入相同的值。

```sh
gh workflow run wechat-draft.yml --repo "$REPO" --ref main \
  -f issue_id="$ISSUE_ID" -f content_sha="$APPROVED_SHA"
```

提交稿件不会自动上传。跟踪本次运行结果，拿到该篇微信草稿 media_id 后通知用户到后台预览并发表。收到 pending 或创建超时提示时，先核对草稿箱和服务器回执。服务器按同一篇固定路径更新草稿。微信凭据由服务器管理。Muse 只需私有仓库的交稿与触发权限。
