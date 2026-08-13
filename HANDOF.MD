# HANDOF

## 当前目标

依据 Bing Webmaster Tools 的真实搜索词完成第一轮 SEO 优化，再设计打包成功后的微信/支付宝咖啡打赏提示。

## 进度

- [x] 简中、英文、日文打赏说明改为可随意打赏并支持后续维护，不再限定咖啡金额；繁中等未发布语言功能继续保留在本地改动中。
- [x] 支持 KGM、KGMA、VPR 纯本地解码。
- [x] 支持 KGG/KGM v5 导入 `KGMusicV3.db` 或 `kgg.key` 后解码。
- [x] 解密结果统一转为真实 MP3，非 MP3 音频使用 320 kbps 编码。
- [x] 加入真实 ekey、四种格式、响应式界面和浏览器端到端测试。
- [x] 依赖安全审计为 0 个已知漏洞。
- [x] Vercel 生产部署完成，正式域名返回 200，线上 KGG 转 MP3 端到端验证通过。
- [x] GitHub PR #1 已合并到 `main`，合并提交 `be5810c`。
- [x] 完成现有 SEO 基线检查：当前仅有通用标题与 description。
- [x] 公开搜索检查：`site:ncm.mikeywa.icu` 搭配 NCM、网易云、酷狗三组查询均未返回结果。
- [ ] 获取 Bing Webmaster Tools 真实查询词、曝光、点击、CTR、平均排名及落地页；2026-08-10 已验证并登录，后台提示约 48 小时后完成数据准备。
- [x] 加入并生产部署 Bing 验证文件；`https://ncm.mikeywa.icu/BingSiteAuth.xml` 返回 200，线上内容校验一致。部署：`dpl_6CA61MX4XYS19H6iJuiHsoRCFvoa`。
- [ ] 基于真实数据划分主词、机会词、误匹配词，并落地 title、description、canonical、robots.txt、sitemap.xml、结构化数据和正文问答。
- [ ] 部署并向 Bing、百度、Google 提交站点地图，记录优化前基线。
- [ ] 设计 ZIP 打包成功后的微信/支付宝咖啡打赏提示。
- [x] 已创建 2026-08-12 的 Bing 关键词复查与多平台 SEO 后续任务。
- [x] 右栏“打赏作者”完成：默认折叠、默认微信、微信/支付宝标签切换、二维码保真裁切并通过解码一致性验证。
- [x] 按杨总确认补充开心文案、移除页脚 GitHub，并进入生产发布。
- [x] 上一版已部署：`dpl_9oqJruhoVoieuMqhdafrFVLRtwrq`；该部署发生在收到“暂不发布”新要求之前。
- [x] 本地新增两级折叠、ZIP 成功自动展开栏目和浅色炫彩轮换按钮。
- [x] 杨总确认发布后，新增按钮点击消失及二维码炫彩描边细节，准备重新发布最终版本。
- [x] 最终版本已生产部署并验证：`dpl_Yr7SFU8BB5cvytnZPsYKghwtjjf1`；正式域名、默认微信、炫彩描边和线上二维码均正常。
- [x] 本地新增微信号 `yanghaoleng` 复制按钮、成功/失败 Toast 和需求征集文案。
- [x] 本地完成百度/Google 基础收录优化：中文元数据、英文/日文静态入口、canonical、hreflang、robots、sitemap、结构化数据与游泳骨传导耳机合规场景正文。
- [x] 本地补充 `/en/`、`/ja/` 显式托管映射与中文无脚本摘要，避免多语言页被单页应用回退覆盖。
- [x] 本地将 SEO 说明收进页脚“网站使用说明”小窗，作者主页并排左对齐，说明入口带信息图标。
- [x] 打赏改为一次展开直接显示二维码，说明增大 2px，微信号复制改为纯下划线文字。
- [x] CLI 板块改为默认折叠，并补充批量转换场景、AI 操作方法和示例提示词。
- [x] 移除网页端 KGG 密钥库入口与 KGG 文件接收，继续支持 NCM、KGM、KGMA、VPR。
- [x] 本轮已生产部署并完成线上交互、格式范围和多语言路由验收：`dpl_G2XvrhXbwcYYc8oKiWm7TU6hRd66`。
- [x] 英文 CLI 标题 “Install CLI for an AI agent” 左对齐版本已发布并线上验证：`dpl_CjDAvmsNoMMkMxscNTTPhcfWrNBp`。
- [x] 支付宝/微信二维码 WebP 质量 90 版本已发布并线上验证：`dpl_2dZoe4woDxCpbNcN5iAh8doZKgKc`；两张均返回 `image/webp` 并正常加载。
- [x] “网站使用说明”入口去掉下划线，弹窗内中英日语言切换改为原地更新、不跳转页面。
- [x] 打赏栏目展开时自动收起 CLI，CLI 详情正文字号统一为 15px。
- [x] 本轮交互细节已生产部署并线上验收：`dpl_9Nd64Wx7h4BsbBLdH5pxhzTKBGBF`；正式域名返回 200，弹窗原地切换和右栏折叠联动正常。
- [x] 队列移除“全部转换”按钮，“继续选择”改为“继续添加”，文件行移除 MP3 格式标签并保留体积。
- [x] 最新队列精简版本已生产部署并线上验收：`dpl_7hU1UQhrX35Cj12JEXMSjMhNrJ8F`。
- [x] 页脚“网站使用说明”和“作者主页”统一为 13px 文字、14px 图标和 6px 间距。
- [x] 页脚入口统一版本已生产部署并线上验收：`dpl_7RiSLg2TBFBUvAp21fetoDgMPBjT`。

## 说明

- 现有 NCM 网页与 CLI 行为保持不变；酷狗格式暂不加入 CLI。
- 网页不再开放依赖本机密钥库的 KGG 转换。
- QQ 音乐与汽水音乐仍处于调研阶段，不在本次发布范围。
- 最新生产部署：`dpl_7RiSLg2TBFBUvAp21fetoDgMPBjT`，正式域名：`https://ncm.mikeywa.icu`。
