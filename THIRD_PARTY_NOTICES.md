# 第三方许可说明

本项目已有的 MIT 许可证保持不变，只适用于其覆盖的项目代码。第三方组件由各自权利人授权，不因根目录的 MIT 许可而变成 MIT；本说明不对任何组件授予新权利。

以下版本来自当前 `package-lock.json`。包下载地址及完整性值见 [licenses/DEPENDENCIES.json](licenses/DEPENDENCIES.json)。这是已核对的重点组件清单，并非全部传递依赖或编译进 WASM 的代码清单。

## 音频与格式处理

- **Project Unlock Music crypto**：KGG v5 密钥派生、QMC2 和酷狗数据库算法参考，`MIT OR Apache-2.0`，Copyright 2024 Project Unlock Music。保留原有双许可，不改变其选择方式。上游：[lib_um_crypto_rust](https://github.com/showhwa/UnlockMusicProject_Archive/tree/main/tmp/lib_um_crypto_rust)。全文：[MIT](licenses/unlock-music/LICENSE_MIT)、[Apache-2.0](licenses/unlock-music/LICENSE_APACHE)。这是现有代码中的参考来源说明，未确认参考时的精确上游提交。
- **@xhacker/kgmwasm 1.0.0**：KGM/KGMA/VPR WASM 解码器，`Apache-2.0`。上游：[KgmWasm](https://github.com/xhacker-zzz/KgmWasm)。[包内许可全文](licenses/kgmwasm/LICENSE.txt)。
- **@breezystack/lamejs 1.2.7**：MP3 编码器，包声明 `LGPL-3.0`，作者 Alex Zhukov，使用 LAME。上游：[shijinyu/lamejs](https://github.com/shijinyu/lamejs)，[LAME](https://lame.sourceforge.net/)。[原包 LICENSE 说明](licenses/breezystack-lamejs/LICENSE)、[LGPL v3 全文](licenses/LGPL-3.0.txt)、[其引用的 GPL v3 全文](licenses/GPL-3.0.txt)。原包 LICENSE 只有简短说明，不能代替 LGPL/GPL 全文。
- **codec-parser 2.5.0**：音频解码链中的传递依赖，`LGPL-3.0-or-later`。Copyright 2020-2023 Ethan Halsall（源码头）。上游：[eshaz/codec-parser](https://github.com/eshaz/codec-parser)。[包内 LGPL 全文](licenses/codec-parser/LICENSE)、[GPL v3](licenses/GPL-3.0.txt)。
- **@audio/decode-flac 1.3.3 / @audio/decode-vorbis 1.3.2 / @audio/decode-wav 1.5.0**：JS/WASM 音频解码接口，`MIT`，Copyright 2025 audiojs。上游：[audiojs/decode](https://github.com/audiojs/decode)。包内全文：[FLAC](licenses/audio-decode-flac/LICENSE)、[Vorbis](licenses/audio-decode-vorbis/LICENSE)、[WAV](licenses/audio-decode-wav/LICENSE)。这些接口的 MIT 声明不覆盖所有下层库；例如上述 codec-parser 有独立 LGPL 条款。
- **sql.js 1.14.1**：SQLite 接口，`MIT`。上游：[sql-js/sql.js](https://github.com/sql-js/sql.js)。[包内许可全文](licenses/sql.js/LICENSE)。

## 网页与其他组件

- **GSAP 3.15.0**：采用 GSAP Standard “No Charge” License，**不是 MIT**。源码头：Copyright 2008-2026, GreenSock. All rights reserved. 作者 Jack Doyle。原始条款：[https://gsap.com/standard-license/](https://gsap.com/standard-license/)，[2026-11-07 获取的条款快照](licenses/gsap/standard-license.txt)。条款包含 Prohibited Uses 及其他限制，并引用 Webflow Terms of Service。免费使用不代表可以按 MIT 再授权。此处保留通知，不代表接受新增协议。
- CryptoJS、browser-id3-writer、React、React DOM、FileSaver、Lucide React 的当前包内许可证及版权通知保存在 `licenses/` 对应目录；确切版本见依赖清单。保留这些通知不改变各自原许可。

## 分发

npm 包的 `files` 清单包含本文件、`licenses/` 和 [DISTRIBUTION_COMPLIANCE.md](DISTRIBUTION_COMPLIANCE.md)。`npm run build` / `npm run dev` 前复制相同通知到 `public/`，Vite 构建后保留在站点根目录。

**通知补齐不等于全部分发义务已经完成。** LGPL 库的对应源码、修改记录，以及允许用户替换库、重新组合或重新链接的方式须按实际 npm 包和网页 bundle 分别验证，详见分发检查清单。
