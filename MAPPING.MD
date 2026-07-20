# MAPPING

| 俗称 | 学名/位置 | CSS / 组件 | 变量/方法 |
| --- | --- | --- | --- |
| NCM文件转MP3面板 | 页面主工作区 | `.queuePanel.processingPanel` | `tracks`, `addFiles`, `processingTitle` |
| 文件拖入区 | 无文件时的选择/拖放区域 | `.dropzone.heroDropzone` | `fileInputRef`, `isDragging` |
| 标题与拖入区间距 | 空状态标题和虚线拖入区之间 | `.uploadEmpty`, `.queueHeader.uploadHeader` | `gap`, `margin-bottom` |
| 其他平台提示 | NCM文件转MP3标题下方的官方工具说明 | `.platformImportNote`, `PlatformImportNote` | `platformImportNote`, `NETEASE_PLAYLIST_IMPORT_URL` |
| 文件列表 | NCM 处理队列 | `.queueTable`, `TrackRow` | `tracks` |
| 打包按钮 | 桌面端 ZIP 主按钮 | `.primaryButton.zipButton` | `downloadZip`, `isZipping`, `zipProgress` |
| 底部 ZIP | 移动端 ZIP 按钮 | `.bottomBar .zipButton` | `downloadZip`, `zipProgress` |
| 按钮进度 | ZIP 按钮内部进度填充 | `.zipButtonFill` | CSS 变量 `--zip-progress` |
| 打包提示 | ZIP 停滞/失败状态条 | `.zipAlert.warning`, `.zipAlert.error` | `zipFeedback` |
| 打包核心 | 大批量 ZIP 构建模块 | `src/lib/zip.js` | `buildTracksZip` |
| 播放器 | 已转换歌曲试听区 | `PreviewPane`, `.previewPane` | `selectedTrack`, `audioRef` |
