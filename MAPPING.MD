# MAPPING

| 俗称 | 学名/位置 | CSS / 组件 | 变量/方法 |
| --- | --- | --- | --- |
| 网站名字/标题 | 顶栏品牌、浏览器标题与结构化数据名称，随当前语言翻译 | `.brand h1`, `<title>`, `WebApplication.name` | `I18N.*.appTitle`, `brandTitleStrongStart` |
| 浏览器标签图标 | 固定红白游泳圈音符 favicon | `public/favicon.png`, `public/favicon.ico` | 132×132 PNG、64×64 ICO、查询参数版本号 |
| 亮色标题图标 | 浅色主题页面标题图标 | `public/favicon-light.webp` | Figma `170:984`，132×132 透明 WebP |
| 暗色标题图标 | 深色主题页面标题图标 | `public/favicon-dark.webp` | Figma `170:987`，132×132 透明 WebP |
| 首帧暗色背景 | React 加载前防止白闪的默认页面底色 | `index.html`, `:root` | `data-theme="dark"`, `#1f1f22`, `theme-color` |
| 图标入场与弹跳动画 | 标题图标首次从顶部画面外落入，随后播放 bounce；点击只重播 bounce | `.brandMarkIcon--enter`, `.brandMarkIcon--bounce`, `@keyframes brand-mark-drop-in`, `@keyframes brand-float-settle` | `brandIconMotionMode`, `brandMotionKey` |
| 标题柔化入场 | 当前语言标题逐字符出现并与图标联动重播，后半重点词加粗 | `.brandTitleMotion`, `.brandTitleUnit`, `.brandTitleUnitStrong`, `@keyframes brand-title-soft-blur-in` | `messages.appTitle`, `brandTitleParts`, `brandTitleStrongStart`, `brandMotionKey` |
| 品牌副标题 | 大标题下方的小字产品名，`NCM` 与 `Studio` 分别入场 | `.brandSubtitle`, `.brandSubtitleUnit`, `@keyframes brand-subtitle-soft-in` | `BRAND_SUBTITLE_PARTS`, `NCM Studio` |
| 音乐文件转MP3面板 | 页面主工作区 | `.queuePanel.processingPanel` | `tracks`, `addFiles`, `processingTitle` |
| 文件拖入区 | 无文件时的选择/拖放区域，使用无云朵的本地导入图标 | `.dropzone.heroDropzone`, `Upload` | `fileInputRef`, `isDragging`, `strokeWidth=2.8` |
| 标题与拖入区间距 | 空状态标题和虚线拖入区之间 | `.uploadEmpty`, `.queueHeader.uploadHeader` | `gap`, `margin-bottom` |
| 支持格式提示 | 标题下方的格式说明 | `.platformImportNote`, `SupportedFormatNote` | `platformImportNote` |
| 文件列表 | 音乐文件处理队列 | `.queueTable`, `TrackRow` | `tracks` |
| 列表内滚动 | 处理面板随文件增高，到视窗上限后队列内滚动 | `.processingPanel.hasTracks`, `.queueTable` | `queueTableRef`, `max-height`, `flex-shrink`, `overflow-y` |
| 文件分割线 | 连续文件清单的行间分隔 | `.trackRow + .trackRow` | `border-top` |
| 文件进度 | 桌面端同排显示进度条与百分比；移动端整体隐藏 | `.progressCell` | `track.progress` |
| 移动端文件统计 | 移动端隐藏文件大小、百分比和进度条 | `.formatCell`, `.progressCell` | `display: none` |
| 移动端吸顶操作区 | 滚动时保持可见的转换状态、继续添加与打包下载 | `.queueHeader` | `position: sticky` |
| 转换自动跟随 | 新转换任务保持在列表可见区 | `TrackRow` | `trackRowRefs`, `previousConvertingIdsRef` |
| 转换并发 | 根据设备、卡顿和文件体积在 1–3 档内调整的加权任务队列 | `src/lib/concurrency.js` | `AdaptiveTaskQueue`, `getConversionTaskWeight` |
| 转换中图标 | 队列处理时的循环 bounce | `.brandMarkIcon--processing` | `hasPendingConversions` |
| 转换耗时 | 队列左上角汇总的 `🎉 仅耗时` 不渐隐、加粗逐字入场文案 | `.queueElapsedMotion`, `.queueElapsedUnit`, `.queueElapsedUnitNumber`, `.queueElapsedUnitEmoji` | `SoftBlurInText`, `conversionStartedAtRef`, `conversionElapsedMs` |
| 继续添加 | 队列顶部追加文件按钮 | `.queueControls .secondaryButton` | `chooseMore`, `fileInputRef` |
| 文件体积 | 文件行中原格式标签位置保留的体积文字 | `.formatCell small` | `formatBytes` |
| 下载文件封面 | MP3 内嵌 ID3 前封面 | 无可视组件 | `attachMp3Tags`, `APIC`, `coverBytes` |
| 打包按钮 | 全部转换结束后出现、带弹簧入场的 ZIP 主按钮 | `.queueControls .zipButton` | `hasPendingConversions`, `readyCount`, `downloadZip`, `package-button-spring-in` |
| 下载完成反馈 | 绿色对勾与“已下载”保持 6 秒，再切换为普通“再次下载”按钮 | `.zipButton.isDownloaded`, `.zipButton.isDownloadAgain` | `zipDownloadState`, `zipDownloadResetTimerRef` |
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
| 页脚入口规格 | 网站说明与作者主页的统一文字、图标和间距 | `.usageGuideTrigger`, `.footerTextLink` | `13px`, `14px`, `6px` |
| 平台格式识别 | NCM/酷狗输入路由 | 无可视组件 | `isSupportedMusicFile`, `convertMusicFile`, `detectAudioCodec` |
| 酷狗解码器 | 网页开放 KGM/KGMA/VPR 解码 | `src/lib/kugou.js` | `convertKugouFile`, `decryptLegacyKgm` |
| MP3转码器 | 解密音频统一输出为 MP3，不在文件行重复显示标签 | `src/lib/audio.js`, `.formatCell` | `transcodeToMp3`, `detectAudioCodec` |
| SEO 标题 | 搜索结果主标题 | `index.html` 的 `<title>` | 待真实查询词确定 |
| SEO 描述 | 搜索结果摘要候选 | `index.html` 的 `meta[name="description"]` | 待真实查询词确定 |
| SEO 内容区 | 工具下方的可索引说明与问答 | 待新增 | 待真实查询词确定 |
| Bing 验证文件 | Bing 站点所有权验证入口 | `public/BingSiteAuth.xml` | `/BingSiteAuth.xml` |
| Bing 搜索表现 | 真实查询词、曝光、点击和排名报告 | Bing Webmaster Tools → Search Performance | 验证后约 48 小时回填 |
| 打赏作者 | 右栏底部可折叠支持模块 | `.donateSection`, `.donateSectionToggle` | `donateSectionExpanded` |
| 打赏展开动效 | 网格高度展开、内容淡入下落与箭头旋转 | `.donateSectionBody`, `.donateSectionBodyInner`, `.donateChevron` | `800ms`, `0fr → 1fr`, `donate-reveal` |
| 打赏文案 | 展开后的免费说明、随意打赏与需求建议文字 | `.donateSectionBodyInner > p` | `donateDescription` |
| 随机夸赞祝福 | 打赏固定开头与结尾之间的轻松祝福池，当前共 9 条 | `.donatePraiseLine`, `.springScaleWord` | `donatePraises`, `donatePraiseIndex`, `SpringScaleText` |
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
| 打包后提示 | ZIP 成功后展开打赏栏目，移动端自动滚动曝光 | `.donateSection` | `downloadZip`, `revealDonateSection`, `donateSectionRef` |
| 支付方式切换 | 支付宝/微信双标签，默认微信 | `.donateTabs` | `donateMethod` |
| 收款二维码 | 展开后的 WebP 方形二维码 | `.donateQrFrame` | `/donate/alipay-qr.webp`, `/donate/wechat-qr.webp` |
