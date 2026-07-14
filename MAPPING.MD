# MAPPING

| 俗称 | 学名/位置 | CSS / 组件 | 变量/方法 |
| --- | --- | --- | --- |
| 粘贴歌单 | 左侧歌单输入面板 | `.panel.accent-blue`, `.playlistInput` | `playlistText`, `handlePlaylistTextChange` |
| 解析按钮 | 歌单解析主按钮 | `.primaryButton.solidCycle` | `handleParseClick`, `isAiEnhancing` |
| 搜索结果 | 歌单索引结果列表 | `.searchResults`, `.searchResultRow` | `searchRows`, `openedSearchIds` |
| 文件列表 | NCM 处理队列 | `.queueTable`, `TrackRow` | `tracks`, `displayTracks` |
| 打包按钮 | 桌面端 ZIP 主按钮 | `.primaryButton.zipButton` | `downloadZip`, `isZipping`, `zipProgress` |
| 底部 ZIP | 移动端 ZIP 按钮 | `.bottomBar .zipButton` | `downloadZip`, `zipProgress` |
| 按钮进度 | ZIP 按钮内部进度填充 | `.zipButtonFill` | CSS 变量 `--zip-progress` |
| 打包提示 | ZIP 停滞/失败状态条 | `.zipAlert.warning`, `.zipAlert.error` | `zipFeedback` |
| 打包核心 | 大批量 ZIP 构建模块 | `src/lib/zip.js` | `buildTracksZip` |
| 播放器 | 已转换歌曲试听区 | `PreviewPane`, `.previewPane` | `selectedTrack`, `audioRef` |
| 全部打开弹窗 | 搜索页批量打开确认对话框 | `.confirmDialog` | `isOpenAllConfirmOpen`, `openAllSearchResults` |
