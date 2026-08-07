# MAPPING

| 俗称 | 学名/位置 | CSS / 组件 | 变量/方法 |
| --- | --- | --- | --- |
| 音乐文件转MP3面板 | 页面主工作区 | `.queuePanel.processingPanel` | `tracks`, `addFiles`, `processingTitle` |
| 文件拖入区 | 无文件时的选择/拖放区域 | `.dropzone.heroDropzone` | `fileInputRef`, `isDragging` |
| 标题与拖入区间距 | 空状态标题和虚线拖入区之间 | `.uploadEmpty`, `.queueHeader.uploadHeader` | `gap`, `margin-bottom` |
| 支持格式提示 | 标题下方的格式说明 | `.platformImportNote`, `SupportedFormatNote` | `platformImportNote` |
| 文件列表 | NCM 处理队列 | `.queueTable`, `TrackRow` | `tracks` |
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
| 安装本地CLI窗口 | 主面板右侧 npm 复制入口 | `.cliInstallPanel`, `.cliPackageLink` | `NPM_PACKAGE_URL`, `copyCliPackageLink` |
| CLI复制按钮 | 框内“安装链接”与 npm 地址 | `.cliPackageLink` | `copyCliPackageLink` |
| 复制成功 | CLI 链接框变绿并显示对钩 | `.cliPackageLink.isCopied` | `cliCopyStatus` |
| 作者主页 | 页脚作者站点外链 | `.siteFooter .footerTextLink` | `AUTHOR_HOME_URL`, `authorLinkLabel` |
| 平台格式识别 | NCM/酷狗输入路由 | 无可视组件 | `isSupportedMusicFile`, `convertMusicFile`, `detectAudioCodec` |
| 酷狗解码器 | KGG/KGM/KGMA/VPR 解码模块 | `src/lib/kugou.js` | `convertKugouFile`, `decryptLegacyKgm`, `decryptKgg` |
| MP3转码器 | 解密音频统一输出为 MP3 | `src/lib/audio.js` | `transcodeToMp3`, `detectAudioCodec` |
| 酷狗密钥库 | KGG 密钥文件入口和状态 | `.kugouKeySection`, `.kugouKeyButton` | `kugouKeyMap`, `loadKugouKeyFile` |
