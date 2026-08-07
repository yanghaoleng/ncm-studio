# HANDOF

## 当前目标

发布酷狗 `.kgg/.kgm/.kgma/.vpr` 转 MP3 测试版。

## 进度

- [x] 支持 KGM、KGMA、VPR 纯本地解码。
- [x] 支持 KGG/KGM v5 导入 `KGMusicV3.db` 或 `kgg.key` 后解码。
- [x] 解密结果统一转为真实 MP3，非 MP3 音频使用 320 kbps 编码。
- [x] 加入真实 ekey、四种格式、响应式界面和浏览器端到端测试。
- [x] 依赖安全审计为 0 个已知漏洞。
- [x] Vercel 生产部署完成，正式域名返回 200，线上 KGG 转 MP3 端到端验证通过。
- [ ] 提交、推送并合并到 GitHub。

## 说明

- 现有 NCM 网页与 CLI 行为保持不变；酷狗格式暂不加入 CLI。
- KGG 必须命中用户本机密钥库中的歌曲哈希；提示用户先在酷狗客户端播放一次后重试。
- QQ 音乐与汽水音乐仍处于调研阶段，不在本次发布范围。
- 生产部署：`dpl_HS7CS9gYMZyPLmjoWZHyGZKWfA23`，正式域名：`https://ncm.mikeywa.icu`。
