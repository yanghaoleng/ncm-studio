# HANDOF

## 当前目标

修复列表可显示封面、但单曲和 ZIP 下载后的 MP3 没有内嵌封面的问题。

## 进度

- [x] 确认根因：`browser-id3-writer 6.3.1` 仅提供命名导出，旧代码读取 `.default` 后静默回退到原始音频。
- [x] 兼容命名/默认导出，并将音频和封面传为边界精确的 `ArrayBuffer`。
- [x] 标签写入失败时输出控制台警告，避免再次静默失效。
- [x] 新增自动测试，验证 MP3 `APIC` 帧、封面字节和 ZIP 内音频数据。
- [x] `npm test`、ESLint、Vite 生产构建和本地浏览器验证全部通过，页面无控制台警告或错误。
- [x] 修复提交 `0761a07` 已推送到 GitHub `main`。
- [x] Vercel 生产部署 `dpl_4WaJ4jXNYp7iThjcTGTsW6FF4Crd` 已就绪并绑定正式域名。
- [x] 线上首页返回 200，并确认新主脚本包含新版 ID3 写入逻辑。

## 说明

- 当前修复已发布至 `https://ncm.mikeywa.icu`。
- 缺少用户的真实 `.ncm` 样本，自动测试使用最小 MPEG 头与 JPEG 字节验证完整写入链路。
