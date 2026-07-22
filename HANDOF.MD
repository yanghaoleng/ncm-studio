# HANDOF

## 当前目标

将网站已验证的 NCM 转换能力包装为可供人和 AI Agent 本地调用的 CLI，并发布到 npm。

## 进度

- [x] npm 网页授权登录成功，`npm whoami` 为 `yanghaoleng`。
- [x] 确认 `ncm-studio-cli` 在发布前尚未被 npm 占用。
- [x] 新增 `ncm-studio` 命令，支持文件/目录、输出目录、重名保护、离线模式和进度。
- [x] 新增 `--json` 和稳定退出码，方便 AI Agent 调用。
- [x] 添加 npm 包元数据、MIT 许可证、文件白名单和发布前检查。
- [x] CLI 自动测试、原有封面测试、ESLint、Vite 构建与生产依赖安全审计通过。
- [x] npm tarball 仅包含 6 个白名单文件，隔离安装后帮助、可执行位和 JSON 退出码验证通过。
- [x] `ncm-studio-cli@0.1.0` 已公开发布，registry 反向查询和线上隔离安装验证通过。

## 说明

- CLI 与网站共用 `src/lib/ncm.js`，默认不上传文件。
- `--no-network` 仅禁止缺失封面的网络请求，NCM 内嵌封面仍会写入 MP3。
- 使用者必须只处理自己拥有或有权处理的文件。
- npm 账号已开启 2FA，发布时通过 npm 网页完成二次授权。
