# HANDOF

## 当前目标

在网页右侧增加紧凑的本地 CLI 安装窗口，让用户可将 npm 链接复制给本地 AI。

## 进度

- [x] 新增“安装CLI让AI帮你处理”右侧窗口，摘要说明可让本地 AI 直接处理本地 NCM 文件。
- [x] 新增复制按钮，复制内容为 `https://www.npmjs.com/package/ncm-studio-cli`。
- [x] 去掉下方独立复制行，“安装链接”放入地址框且不参与复制。
- [x] 地址框取消外链跳转，点击只复制 npm 地址，成功后复制图标短暂变为对钩。
- [x] 补齐中、英、日三语文案。
- [x] 桌面端两列、移动端单列；390px 宽度无横向溢出。
- [x] ESLint、自动测试、Vite 生产构建和浏览器控制台检查通过。
- [x] 本地预览已启动：`http://127.0.0.1:5193/`。
- [x] 提交 `e9732da` 已推送到 GitHub `main`。
- [x] Vercel 生产部署已就绪并绑定 `https://ncm.mikeywa.icu`。
- [x] 正式域名返回 200，线上文案、无跳转复制交互和控制台已验证。

## 说明

- 生产部署：`ncm-studio-lt391tlde-yanghaoleng-icloudcoms-projects.vercel.app`。
- npm 链接指向已公开发布的 `ncm-studio-cli@0.1.0`。
