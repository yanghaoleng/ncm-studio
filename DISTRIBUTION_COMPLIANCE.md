# 分发检查清单

本文件记录技术核对范围和待办，不是法律意见、合规保证或新的授权。根 MIT 许可证及各第三方组件原有条款不变。

## 已补的通知与打包路径

- `THIRD_PARTY_NOTICES.md`、`licenses/` 和本文件列入 npm `files` 白名单。
- `predev` / `prebuild` 执行 `scripts/copy-license-notices.mjs`，将通知复制到 `public/`；Vite 会把它们带到网页输出中。
- `licenses/DEPENDENCIES.json` 记录核对时的精确包版本、下载地址及锁文件完整性值。
- LGPL v3 与其引用的 GPL v3 全文保留；lamejs 原包的简短 LICENSE 另行原样保留。GSAP 条款按其独立许可注明，未改成 MIT。

## 发布前仍须逐项完成

1. **LGPL 对应源码**：核对 `@breezystack/lamejs 1.2.7`、`codec-parser 2.5.0` 和实际使用的其他 LGPL 组件，将确切版本的首选修改形式、必要构建脚本及修改记录按适用条款提供给接收者。仓库主页链接或这个通知文件不等于提供了对应源码。lamejs npm 包只含构建后的 `dist`，不能据此认定已经提供了完整对应源码。
2. **替换或重新组合**：CLI 当前通过 npm 依赖引入库；网页通过 Vite 打包。两种分发形式须分别验证 LGPL 第 4 节要求的适当机制，包括允许修改库、为调试修改而逆向工程，以及重新组合/重新链接、所需应用材料或可工作的替换机制；不能只因使用 JavaScript、npm 或动态 import 就推断已经满足。压缩 bundle 本身不是重新链接能力的证明。
3. **WASM 与传递依赖**：`@wasm-audio-decoders/*`、`@xhacker/kgmwasm` 等包中的底层编译组件、嵌入数据及其许可证需依据实际发布构建继续核对。顶层包的 MIT 或 Apache 声明不自动覆盖所有嵌入组件。
4. **GSAP**：核对当前用途及再分发方式是否符合包所引用的 Standard License 及相关条款，保留版权头，不对 GSAP 宣称 MIT。
5. **发布物检查**：对每个待发布版本执行下述命令并检查真实 tarball / `dist/` 内容，不只检查仓库文件；如更新依赖，更新通知与版本记录后重做核对。历史已发布 npm 包和在线站点不会因提交此修复而自动补齐。

```sh
npm ci --ignore-scripts
npm test
npm run lint
npm run build
npm pack --ignore-scripts --json
# 用 tar -tzf <生成的包名>.tgz 检查 notices、licenses、此清单是否实际存在。
# 检查 dist/THIRD_PARTY_NOTICES.md、dist/licenses/ 和 dist/DISTRIBUTION_COMPLIANCE.md。
```

这些步骤不会发布 npm 包，也不会部署站点。未确认源码交付或可替换机制前，不应将通知修复描述为“已完成 LGPL 合规”。任何扩大自有代码授权范围、额外公开源码或作出长期源码提供承诺的决定须另行确认。

## 许可证文本来源

包目录下的许可证从锁定版本的 npm 安装内容原样复制。GPL v3 / LGPL v3 为 GNU 标准全文（https://www.gnu.org/licenses/gpl-3.0.txt、https://www.gnu.org/licenses/lgpl-3.0.txt）。Unlock Music 文本来自原说明引用仓库的 `tmp/lib_um_crypto_rust/LICENSE_MIT` 与 `LICENSE_APACHE`；保留其原始版权行。GSAP 文本快照包含抓取日期、官方来源和被引用的 Terms of Service 链接。
