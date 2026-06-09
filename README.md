# NCM Studio

NCM Studio 是一个浏览器优先的网易云音乐歌单整理和本地 `.ncm` 文件处理工具。它的目标很朴素：方便把自己已经拥有或有权使用的歌曲原文件整理出来，放到自己的离线设备里，比如游泳用的运动耳机、车载播放器、随身播放器等。

请勿将本项目用于侵犯版权、规避付费、批量搬运、传播未授权音乐或其他违法用途。

## 在线示例

- 在线站点：https://ncm.mikeywa.icu
- GitHub 仓库：https://github.com/yanghaoleng/ncm-studio

![NCM Studio 首页截图](docs/assets/homepage.png)

## 适合的使用场景

- 你已经有一批本地 `.ncm` 文件，希望在浏览器里转成可播放的音频文件。
- 你想把自己的歌单整理成“歌曲信息 / 网易云详情页 / 网易云外链入口”三段文本，方便后续核对或在自己的网络环境里打开。
- 你想把自己有权使用的音乐文件拷贝到离线设备里，例如游泳运动耳机。
- 你希望文件处理尽量在本地浏览器完成，不把本地音乐文件上传到应用服务器。

## 功能

- 粘贴纯文本歌单，一行一首歌。
- 默认内置示例歌单，方便打开即用。
- 本地解析歌名和歌手。
- 可选 DeepSeek 增强解析，用于补全歌手、专辑等信息。
- 根据歌名、歌手、专辑在网易云索引歌曲，获取歌曲详情页链接。
- 复制三段式清单：
  - 歌曲信息：歌名 - 歌手 - 专辑。
  - 歌曲详情页：歌曲信息 + 网易云详情页链接。
  - 外链下载链接：网易云官方媒体外链入口。
- 搜索结果点击后，左侧图标会变成绿色对勾。
- 支持全部打开，并带二次确认弹窗。
- 支持键盘操作：Enter、Esc、Tab、方向键、Home、End。
- 拖入或选择本地 `.ncm` 文件。
- 在浏览器本地解析和转换 `.ncm` 文件。
- 尽可能读取元数据和内嵌封面。
- 尽可能写入 MP3 ID3 标题、歌手、专辑和封面信息。
- 单首下载或把已完成的本地转换结果打包成 ZIP。
- 响应式界面，适配桌面和移动端。

## 复制清单格式

点击“复制”后，剪贴板内容会被整理成三块：

```text
【歌曲信息】
示例歌曲 A - 示例歌手 A
示例歌曲 B - 示例歌手 B

【歌曲详情页】
示例歌曲 A - 示例歌手 A
https://music.163.com/#/song?id=00000000
示例歌曲 B - 示例歌手 B
https://music.163.com/#/song?id=00000001

【外链下载链接】
https://music.163.com/song/media/outer/url?id=00000000.mp3
https://music.163.com/song/media/outer/url?id=00000001.mp3
```

说明：`song/media/outer/url` 是网易云自己的媒体外链入口，不是本项目破解出的真实 CDN 文件地址，也不是 `.ncm` 加密文件地址。打开时能否播放或下载，取决于网易云的版权、地区、账号状态和你的实际网络环境。

## 隐私与本地处理

- 本地 `.ncm` 文件只在浏览器里处理，不会上传到应用服务器。
- 歌单增强解析会调用配置的 DeepSeek API；如果不配置 API Key，就只使用本地解析。
- 网易云歌曲索引通过服务端 API 做关键词查询，但不会上传本地音频文件。

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

## 环境变量

如果要启用 AI 增强解析，需要配置 DeepSeek API Key：

```bash
VITE_DEEPSEEK_API_KEY=your_api_key
```

可选配置：

```bash
VITE_DEEPSEEK_MODEL=deepseek-v4-flash
VITE_DEEPSEEK_CHAT_URL=https://api.deepseek.com/chat/completions
```

## 部署

项目可以部署到 Vercel。当前包含两个 Serverless API：

- `api/deepseek.js`：DeepSeek 增强解析代理。
- `api/netease-first-results.js`：根据歌曲信息索引网易云首条结果，并生成详情页和官方外链入口。

注意：Vercel 机房网络不等同于中国大陆用户网络。网易云媒体链接是否可用，应以实际使用网络打开结果为准。

## 技术栈

- React
- Vite
- JSZip
- FileSaver
- CryptoJS
- browser-id3-writer
- GSAP
- Lucide React

## 相关链接和参考

- 网易云音乐：https://music.163.com/
- DeepSeek：https://www.deepseek.com/
- Vercel Functions Region：https://vercel.com/docs/functions/configuring-functions/region
- ncmdump：https://github.com/taurusxin/ncmdump
- browser-id3-writer：https://github.com/egoroof/browser-id3-writer
- JSZip：https://stuk.github.io/jszip/

## 致谢

本项目的 `.ncm` 解析和转换思路参考了社区公开格式知识，尤其是 [taurusxin/ncmdump](https://github.com/taurusxin/ncmdump)。请尊重原项目许可和贡献者。

## 免责声明

本项目不提供、存储或分发任何音乐文件。本项目生成的网易云外链入口来自歌曲 ID 的公开 URL 规则，是否可访问由网易云平台决定。使用者需要自行确保拥有相关音乐文件或使用行为的合法授权。
