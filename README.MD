# NCM Studio

NCM Studio 是一个浏览器优先的本地 `.ncm` 文件处理工具。它的目标很朴素：方便把自己已经拥有或有权使用的歌曲原文件整理出来，放到自己的离线设备里，比如游泳用的运动耳机、车载播放器、随身播放器等。

请勿将本项目用于侵犯版权、规避付费、批量搬运、传播未授权音乐或其他违法用途。

## 在线示例

- 在线站点：https://ncm.mikeywa.icu
- GitHub 仓库：https://github.com/yanghaoleng/ncm-studio

![NCM Studio 首页截图](docs/assets/homepage.png)

## 适合的使用场景

- 你已经有一批本地 `.ncm` 文件，希望在浏览器里转成可播放的音频文件。
- 你想把自己有权使用的音乐文件拷贝到离线设备里，例如游泳运动耳机。
- 你希望文件处理尽量在本地浏览器完成，不把本地音乐文件上传到应用服务器。
- 其他音乐平台推荐使用[网易官方歌单导入工具或 CLI](https://music.163.com/st/ncmcli#setup)快速创建歌单。

## 功能

- 拖入或选择本地 `.ncm` 文件。
- 在浏览器本地解析和转换 `.ncm` 文件。
- 尽可能读取元数据和内嵌封面。
- 尽可能写入 MP3 ID3 标题、歌手、专辑和封面信息。
- 单首下载或把已完成的本地转换结果打包成 ZIP。
- 大批量 ZIP 打包使用百分比进度；进度长时间不变或生成失败时，会提示重试或分批处理。
- 响应式界面，适配桌面和移动端。

## 隐私与本地处理

- 本地 `.ncm` 文件只在浏览器里处理，不会上传到应用服务器。
- 应用不需要 AI 密钥，也不会把歌单、元数据或音频发送给应用服务器。

## 大批量 ZIP 打包

- MP3/FLAC 等音频本身已经压缩，ZIP 显式使用 `STORE` 模式，不做无效的二次压缩。
- 每首歌转换完成时同步保存 CRC32；打包时直接组装标准 ZIP 文件头和中央目录，不再重读整批音频。
- 音频 Blob 会被原样引用到 ZIP Blob，避免再复制一份整包二进制数据。
- 按文件数量更新 0%-100% 进度；100 首以上会定期让出渲染帧，保持页面可响应。
- 20 秒没有进度变化时显示卡顿提示；异常会进入可重试的失败状态。
- 单个 ZIP 目前限制在 4 GB 以内。总体积过大时，请减少文件数量后分批处理。

## 合法使用声明

本项目仅用于个人整理、备份和使用自己有权处理的音乐文件。请遵守当地法律法规和音乐平台服务条款。

更详细的使用边界见 [使用与合规说明](docs/usage-and-legal.md)。

不要将本项目用于：

- 下载、传播或分享未经授权的音乐。
- 绕过会员、付费、DRM 或版权限制。
- 批量抓取、搬运或商业化分发音乐资源。
- 任何侵犯版权或违反平台规则的用途。

## 本地开发

```bash
npm install
npm run dev
```

默认开发服务由 Vite 启动。根据终端输出打开对应本地地址。

## 构建

```bash
npm run build
```

## API

当前不包含应用服务端 API。文件解析、转换和打包均在浏览器本地执行。

## 关键技术架构

- React + Vite 负责单页应用和响应式界面。
- `.ncm` 解析、音频转换、ID3 写入和 ZIP 打包均在浏览器本地完成。
- `src/lib/zip.js` 封装 CRC32、ZIP `STORE` 结构、Blob 组合、进度、重名保护和停滞检测。
- FileSaver 触发浏览器下载。

## 部署

项目可以部署到 Vercel。

## 技术栈

- React
- Vite
- FileSaver
- CryptoJS
- browser-id3-writer
- GSAP
- Lucide React

## 相关链接和参考

- 网易云音乐：https://music.163.com/
- 网易官方歌单导入工具与 CLI：https://music.163.com/st/ncmcli#setup
- ncmdump：https://github.com/taurusxin/ncmdump
- browser-id3-writer：https://github.com/egoroof/browser-id3-writer

## 致谢

本项目的 `.ncm` 解析和转换思路参考了社区公开格式知识，尤其是 [taurusxin/ncmdump](https://github.com/taurusxin/ncmdump)。请尊重原项目许可和贡献者。

## 免责声明

本项目不提供、存储或分发任何音乐文件。使用者需要自行确保拥有相关音乐文件或使用行为的合法授权。
