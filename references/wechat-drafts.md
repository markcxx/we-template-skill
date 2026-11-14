# 从本机成稿交给公众号管理员

macOS 用户可运行 `zsh scripts/setup-wechat.command`，交互输入公众号 AppID 和 AppSecret。上传命令自动从本机 ~/.we-template/wechat.env（权限 600）读取，已有环境凭据优先。

在 skill 目录执行以下命令。文章正文使用 article.html。服务端环境配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET，也支持已取得的 WECHAT_ACCESS_TOKEN 配合同账号的 WECHAT_APP_ID。凭据从本地环境读取，避免写到文章文件或发送给聊天助手。

```sh
node scripts/wechat-draft.mjs ./article.html --meta ./metadata.json --out ./draft-body.html
node scripts/wechat-draft.mjs ./article.html --meta ./metadata.json --cover ./cover.png --send
```

首条命令离线统计正文和图片，并可选地保存精简正文供预览。第二条命令准备正文图片并上传至微信，封面也可以用 --cover-id 指定本账号已有素材。--meta 可省略，此时标题取正文首个 H1。元数据支持 title、author、digest。10 MB 以内的 GIF 动图默认按永久图片素材上传，保留动画。若需转为首帧，加 --static-images。重复同步同账号同文件时从 WE_TEMPLATE_HOME/wechat-drafts 读取回执：内容相同复用草稿，变更则更新已有草稿。创建请求中断而未取得明确结果时，先核对后台，避免重复。

1. 确定目标公众号，在该账号后台核对草稿和素材接口权限、AppID、AppSecret 及调用 IP 白名单设置。由受信任的本机进程或服务端取得并缓存 access_token。给其他人使用此 skill 时，各自使用其公众号凭据。另一个可选方案是开放平台第三方应用，由公众号管理员授权，服务端使用 authorizer_access_token。微信的新增草稿文档列出可代调用的权限集。参考[稳定版调用凭证](https://developers.weixin.qq.com/doc/subscription/api/base/api_getstableaccesstoken.html)和[新增草稿](https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html)。
2. 用最终的 article.html 组装正文。标题、作者、摘要作为独立字段，从正文中移除作为页首使用的一级标题；时间由微信发布时生成。扫描 img、SVG image 和样式里的背景图，按资源去重。正文图片通过 multipart 上传，用返回的微信 URL 替换外链。该接口仅支持小于 1 MB 的 JPG/PNG；GIF 动图走永久素材接口。上传装饰组件时保留 section 容器，并把固定尺寸直接写到图片上。回读时核对图片宽度，视觉效果以微信编辑页或手机预览为准。参考[上传图文内图片](https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html)。
3. 上传本期封面为永久图片素材，或复用同一公众号已有的永久图片 media_id，将它放入 thumb_media_id。封面是普通图文 news 的必填项。参考[新增永久素材](https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_addmaterial.html)。
4. 预检标题不超过 32 个字、作者不超过 16 个字、摘要不超过 120 个字、正文少于 2 万字符且小于 1 MB。对源码冗长的排版优先去掉编辑器标记、压缩重复样式，并对照预览检查。调用 POST /cgi-bin/draft/add 后保存返回的草稿 media_id。再次同步同篇可更新已有草稿；网络超时时先核对后台，避免新建重复草稿。参考[新增草稿](https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html)。
5. 向用户交付草稿标题、目标账号和成功回执。管理员登录[微信公众平台](https://mp.weixin.qq.com/)，进入草稿箱，核对手机预览、封面、排版、动图和二维码，最后由本人选择发表或群发。
