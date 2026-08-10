# MAPPING

| 俗称 | 学名/位置 | CSS / 组件 | 变量/方法 |
| --- | --- | --- | --- |
| 音乐文件转MP3面板 | 页面主工作区 | `.queuePanel.processingPanel` | `tracks`, `addFiles`, `processingTitle` |
| 文件拖入区 | 无文件时的选择/拖放区域 | `.dropzone.heroDropzone` | `fileInputRef`, `isDragging` |
| 标题与拖入区间距 | 空状态标题和虚线拖入区之间 | `.uploadEmpty`, `.queueHeader.uploadHeader` | `gap`, `margin-bottom` |
| 支持格式提示 | 标题下方的格式说明 | `.platformImportNote`, `SupportedFormatNote` | `platformImportNote` |
| 文件列表 | NCM 处理队列 | `.queueTable`, `TrackRow` | `tracks` |
| 继续添加 | 队列顶部追加文件按钮 | `.queueControls .secondaryButton` | `chooseMore`, `fileInputRef` |
| 文件体积 | 文件行中原格式标签位置保留的体积文字 | `.formatCell small` | `formatBytes` |
| 下载文件封面 | MP3 内嵌 ID3 前封面 | 无可视组件 | `attachMp3Tags`, `APIC`, `coverBytes` |
| 打包按钮 | 桌面端 ZIP 主按钮 | `.primaryButton.zipButton` | `downloadZip`, `isZipping`, `zipProgress` |
| 底部 ZIP | 移动端 ZIP 按钮 | `.bottomBar .zipButton` | `downloadZip`, `zipProgress` |
| 按钮进度 | ZIP 按钮内部进度填充 | `.zipButtonFill` | CSS 变量 `--zip-progress` |
| 打包提示 | ZIP 停滞/失败状态条 | `.zipAlert.warning`, `.zipAlert.error` | `zipFeedback` |
| 打包核心 | 大批量 ZIP 构建模块 | `src/lib/zip.js` | `buildTracksZip` |
| 播放器 | 已转换歌曲试听区 | `PreviewPane`, `.previewPane` | `selectedTrack`, `audioRef` |
| CLI 命令 | npm 全局命令 | `bin/ncm-studio.mjs` | `ncm-studio convert`, `convert` |
| AI 输出 | CLI 机器可读结果 | stdout JSON | `--json`, `outputResult` |
| 离线开关 | CLI 禁止缺失封面请求 | CLI 选项 | `--no-network`, `fetchCover` |
| CLI 重名保护 | 输出文件自动加后缀 | 无可视组件 | `destinationFor`, `--overwrite` |
| 安装本地CLI窗口 | 主面板右侧默认折叠的 CLI 说明 | `.cliSection`, `.cliSectionToggle` | `cliSectionExpanded` |
| CLI折叠标题 | 右栏 CLI 板块的左对齐标题 | `.cliSectionTitle` | `localCliTitle` |
| CLI复制按钮 | 框内“安装链接”与 npm 地址 | `.cliPackageLink` | `copyCliPackageLink` |
| 复制成功 | CLI 链接框变绿并显示对钩 | `.cliPackageLink.isCopied` | `cliCopyStatus` |
| 作者主页 | 页脚左侧使用说明旁的站点外链 | `.siteFooter .footerTextLink` | `AUTHOR_HOME_URL`, `authorLinkLabel` |
| 平台格式识别 | NCM/酷狗输入路由 | 无可视组件 | `isSupportedMusicFile`, `convertMusicFile`, `detectAudioCodec` |
| 酷狗解码器 | 网页开放 KGM/KGMA/VPR 解码 | `src/lib/kugou.js` | `convertKugouFile`, `decryptLegacyKgm` |
| MP3转码器 | 解密音频统一输出为 MP3，不在文件行重复显示标签 | `src/lib/audio.js`, `.formatCell` | `transcodeToMp3`, `detectAudioCodec` |
| SEO 标题 | 搜索结果主标题 | `index.html` 的 `<title>` | 待真实查询词确定 |
| SEO 描述 | 搜索结果摘要候选 | `index.html` 的 `meta[name="description"]` | 待真实查询词确定 |
| SEO 内容区 | 工具下方的可索引说明与问答 | 待新增 | 待真实查询词确定 |
| Bing 验证文件 | Bing 站点所有权验证入口 | `public/BingSiteAuth.xml` | `/BingSiteAuth.xml` |
| Bing 搜索表现 | 真实查询词、曝光、点击和排名报告 | Bing Webmaster Tools → Search Performance | 验证后约 48 小时回填 |
| 打赏作者 | 右栏底部可折叠支持模块 | `.donateSection`, `.donateSectionToggle` | `donateSectionExpanded` |
| 右栏折叠联动 | 打赏展开时自动收起 CLI | `.cliSection`, `.donateSection` | `donateSectionExpanded`, `setCliSectionExpanded` |
| 二维码炫彩描边 | 打赏栏目展开后显示的 2px 彩色外圈 | `.donateQrFrame` | `donate-border-spectrum` |
| 复制微信号 | 打赏说明中的微信联系方式复制按钮 | `.wechatCopyButton` | `WECHAT_ID`, `copyWechatId` |
| 复制提示 | 微信号复制成功/失败 Toast | `.copyToast` | `wechatCopyStatus` |
| 网站使用说明 | 页脚左下角入口与说明小窗 | `.usageGuideTrigger`, `.usageGuideDialog` | `usageGuideOpen` |
| 说明语言切换 | 使用说明弹窗底部的原地语言按钮 | `.seoLanguageLinks button` | `LANGUAGE_OPTIONS`, `setLanguage` |
| 英文落地页 | 英文搜索入口 | `public/en/index.html` | `/en/` |
| 日文落地页 | 日文搜索入口 | `public/ja/index.html` | `/ja/` |
| 多语言收录路由 | 英文/日文静态页托管映射 | `vercel.json` 的 `rewrites` | `/en/`, `/ja/` |
| 搜索引擎发现文件 | 爬虫规则与多语言 URL 清单 | `public/robots.txt`, `public/sitemap.xml` | `/robots.txt`, `/sitemap.xml` |
| 打包后提示 | ZIP 成功后自动展开打赏栏目 | 无独立组件 | `downloadZip`, `setDonateSectionExpanded` |
| 支付方式切换 | 支付宝/微信双标签，默认微信 | `.donateTabs` | `donateMethod` |
| 收款二维码 | 展开后的 WebP 方形二维码 | `.donateQrFrame` | `/donate/alipay-qr.webp`, `/donate/wechat-qr.webp` |
