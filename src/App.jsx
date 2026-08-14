import { useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import gsap from 'gsap'
import {
  Archive,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  FileMusic,
  Languages,
  MessageCircle,
  Moon,
  Music2,
  RefreshCw,
  Sun,
  Terminal,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react'
import { convertMusicFile, isSupportedMusicFile } from './lib/convert.js'
import { formatBytes, safeFilename } from './lib/format.js'
import { buildTracksZip, calculateCrc32 } from './lib/zip.js'

const AUTHOR_HOME_URL = 'https://mikeywa.icu'
const NPM_PACKAGE_URL = 'https://www.npmjs.com/package/ncm-studio-cli'
const WECHAT_ID = 'yanghaoleng'
const LANGUAGE_STORAGE_KEY = 'ncm-studio-language'
const DEFAULT_LANGUAGE_ENDPOINT = '/api/default-language'

const LANGUAGE_OPTIONS = [
  { id: 'zh', short: '简', label: '简体中文', htmlLang: 'zh-CN' },
  { id: 'zh-Hant', short: '繁', label: '繁體中文', htmlLang: 'zh-Hant' },
  { id: 'en', short: 'EN', label: 'English', htmlLang: 'en' },
  { id: 'ja', short: '日', label: '日本語', htmlLang: 'ja' },
]

const SPRING_SCALE_IN = {
  duration: 259,
  stagger: 68,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  initialDelayMax: 400,
}

const I18N = {
  zh: {
    appTitle: '水下听歌大救星',
    convertError: '转换失败',
    processingTitle: '音乐文件转MP3',
    chooseDropTitle: '选择或拖入音乐文件',
    chooseDropSubtitle: '支持 NCM、KGM、KGMA、VPR，文件只在本地处理',
    dropOverlayTitle: '松手继续导入',
    dropOverlaySubtitle: '新文件会自动加入处理队列',
    queueSummary: ({ total, ready, converting }) =>
      `${total} 个文件 · ${ready} 个完成 · ${converting} 个转换中`,
    chooseMore: '继续添加',
    downloadZip: '打包下载',
    zipping: '打包中',
    zipStalled: '打包进度暂时没有变化。请再等一会；若持续卡住，请刷新后重试，或减少文件数量后分批打包。',
    zipFailed: '打包失败，请重试。若文件较多，建议减少数量后分批打包。',
    readyDownloadSuffix: '个 MP3 可下载',
    zipShort: 'ZIP',
    clearFinished: '清空完成',
    metadataWaiting: '等待解析元数据',
    previewLabel: '试听预览',
    previewEmptyTitle: '选择一首已完成的歌曲',
    previewEmptySubtitle: '完成转换后可在线播放',
    audioLabel: '歌曲试听播放器，按空格播放或暂停',
    platformImportNote: '支持网易云 NCM 与酷狗 KGM / KGMA / VPR',
    localCliTitle: '安装CLI让AI帮你处理',
    localCliSummary: '让能访问本地目录的 AI 助手直接批量处理 NCM 文件。',
    localCliScenarioTitle: '适用场景',
    localCliScenarioText: '适合一次转换大批量文件，或需要频繁转换指定目录的用户。',
    localCliUsageTitle: '使用方法',
    localCliUsageText: '把安装链接交给有本地文件和命令权限的豆包、MiniMax、WorkBuddy 等电脑端 AI，先让它安装 CLI，再告诉它需要转换的目录。',
    localCliPrompt: '示例：请安装 ncm-studio-cli，然后把“音乐目录”中的 NCM 文件转换到“输出目录”。',
    localCliExpand: '展开 CLI 使用说明',
    localCliCollapse: '收起 CLI 使用说明',
    localCliLinkLabel: '安装链接',
    localCliLinkAria: '复制 ncm-studio-cli 的 npm 安装链接',
    cliLinkCopied: '复制成功',
    cliLinkCopyFailed: '复制失败',
    donateTitle: '打赏作者',
    donateIntro: '这个工具会一直免费，如果它帮你省了时间，可以随意打赏。',
    donatePraises: [
      '愿意支持免费工具的人，眼光和心意都很棒。祝你今天诸事顺利！',
      '愿你每次下水都有好歌陪伴，上岸以后也一直有好运。',
      '祝你工作不加班、游泳不呛水、耳机永远有电，好运一直在线！',
      '谢谢你愿意为这个小工具续航。祝你每天都有值得开心的小惊喜！',
      '你的支持会变成下一次更新的动力，也愿你的每份努力都有漂亮回报。',
      '会为好用的免费工具鼓掌的人，品味和人品都很在线。祝你天天开心！',
      '祝你钱包不瘦、头发不掉、周末不加班，喜欢的歌一首不漏！',
      '祝你灵感爆棚、运气在线，连随机播放都只放你爱听的歌！',
      '愿你跑步有风、游泳有歌、摸鱼没人发现，快乐全天在线！',
    ],
    donateRequest: '你也可以给我提要求，我会努力实现！',
    donateSectionExpand: '展开打赏作者',
    donateSectionCollapse: '收起打赏作者',
    donateAlipay: '支付宝',
    donateWechat: '微信',
    donateQrAlt: (method) => `${method}收款二维码`,
    copyWechat: '复制微信号',
    wechatCopied: '已复制微信号',
    wechatCopyFailed: '复制失败，请重试',
    usageGuideLabel: '网站使用说明',
    usageGuideClose: '关闭网站使用说明',
    seoHeading: '把已有音乐整理到离线设备',
    seoIntro: '水下听歌大救星在浏览器本地把您有权使用的网易云 NCM 与酷狗音乐文件转换为 MP3，适合游泳骨传导耳机、运动耳机、车载播放器和随身播放器。',
    seoConvertTitle: 'NCM / KGM 转 MP3',
    seoConvertText: '支持 NCM、KGM、KGMA、VPR，转换、试听与 ZIP 打包均在浏览器内完成。',
    seoHeadphoneTitle: '游泳骨传导耳机音乐',
    seoHeadphoneText: '可将已购买、已获授权或您有合法使用权的本地音乐整理为 MP3，再导入耳机的离线存储。',
    seoPrivacyTitle: '文件不上传服务器',
    seoPrivacyText: '音频只在当前设备内存中处理，不作为在线音乐资源提供或分发。',
    githubLinkLabel: 'GitHub 仓库',
    authorLinkLabel: '作者主页',
    authorLinkAria: '打开作者主页',
    themeToggleLabel: (theme) => (theme === 'light' ? '切换到深色模式' : '切换到浅色模式'),
    languageMenuLabel: (current) => `当前语言：${current}。打开语言菜单`,
    languageListLabel: '语言版本',
  },
  'zh-Hant': {
    appTitle: '水下听歌大救星',
    convertError: '轉換失敗',
    processingTitle: '音樂檔案轉 MP3',
    chooseDropTitle: '選擇或拖入音樂檔案',
    chooseDropSubtitle: '支援 NCM、KGM、KGMA、VPR，檔案只會在本機處理',
    dropOverlayTitle: '放開即可匯入',
    dropOverlaySubtitle: '新檔案會自動加入處理佇列',
    queueSummary: ({ total, ready, converting }) =>
      `${total} 個檔案 · ${ready} 個完成 · ${converting} 個轉換中`,
    chooseMore: '繼續新增',
    downloadZip: '打包下載',
    zipping: '正在打包',
    zipStalled: 'ZIP 進度暫時沒有變化。請再等一下；若仍然卡住，請重新整理後再試，或減少檔案數量後分批打包。',
    zipFailed: '打包失敗，請再試一次。若檔案較多，建議減少數量後分批打包。',
    readyDownloadSuffix: '個 MP3 可下載',
    zipShort: 'ZIP',
    clearFinished: '清除完成項目',
    metadataWaiting: '等待解析音樂資訊',
    previewLabel: '試聽預覽',
    previewEmptyTitle: '選擇一首已完成的歌曲',
    previewEmptySubtitle: '完成轉換後可在這裡播放',
    audioLabel: '歌曲試聽播放器，按空白鍵播放或暫停',
    platformImportNote: '支援網易雲 NCM 與酷狗 KGM / KGMA / VPR',
    localCliTitle: '安裝 CLI，讓 AI 幫你處理',
    localCliSummary: '讓可存取本機資料夾的 AI 助手批次處理 NCM 檔案。',
    localCliScenarioTitle: '適用情境',
    localCliScenarioText: '適合一次轉換大量檔案，或需要經常轉換指定資料夾的用戶。',
    localCliUsageTitle: '使用方法',
    localCliUsageText: '把安裝連結交給有本機檔案與指令權限的豆包、MiniMax、WorkBuddy 等桌面端 AI，先讓它安裝 CLI，再告訴它要轉換的資料夾。',
    localCliPrompt: '範例：請安裝 ncm-studio-cli，然後把「音樂資料夾」中的 NCM 檔案轉換到「輸出資料夾」。',
    localCliExpand: '展開 CLI 使用說明',
    localCliCollapse: '收起 CLI 使用說明',
    localCliLinkLabel: '安裝連結',
    localCliLinkAria: '複製 ncm-studio-cli 的 npm 安裝連結',
    cliLinkCopied: '複製成功',
    cliLinkCopyFailed: '複製失敗',
    donateTitle: '支持作者',
    donateIntro: '這個工具會一直免費，如果它幫你省下時間，可以隨意打賞。',
    donatePraises: [
      '願意支持免費工具的人，眼光和心意都很棒。祝你今天諸事順利！',
      '願你每次下水都有好歌陪伴，上岸以後也一直有好運。',
      '祝你工作不加班、游泳不嗆水、耳機永遠有電，好運一直在線！',
      '謝謝你願意為這個小工具續航。祝你每天都有值得開心的小驚喜！',
      '你的支持會變成下一次更新的動力，也願你的每份努力都有漂亮回報。',
      '會為好用的免費工具鼓掌的人，品味和人品都很在線。祝你天天開心！',
      '祝你錢包不瘦、頭髮不掉、週末不加班，喜歡的歌一首不漏！',
      '祝你靈感爆棚、運氣在線，連隨機播放都只放你愛聽的歌！',
      '願你跑步有風、游泳有歌、摸魚沒人發現，快樂全天在線！',
    ],
    donateRequest: '你也可以向我提出要求，我會努力實現！',
    donateSectionExpand: '展開支持作者',
    donateSectionCollapse: '收起支持作者',
    donateAlipay: '支付寶',
    donateWechat: '微信支付',
    donateQrAlt: (method) => `${method}收款 QR Code`,
    copyWechat: '複製微信號',
    wechatCopied: '已複製微信號',
    wechatCopyFailed: '複製失敗，請再試一次',
    usageGuideLabel: '網站使用說明',
    usageGuideClose: '關閉網站使用說明',
    seoHeading: '把已有音樂整理到離線裝置',
    seoIntro: '水下听歌大救星會在瀏覽器本機，把你有權使用的網易雲 NCM 與酷狗音樂檔案轉換為 MP3，適合游泳骨傳導耳機、運動耳機、車用播放器和隨身播放器。',
    seoConvertTitle: 'NCM / KGM 轉 MP3',
    seoConvertText: '支援 NCM、KGM、KGMA、VPR，轉換、試聽與 ZIP 打包都在瀏覽器內完成。',
    seoHeadphoneTitle: '游泳骨傳導耳機音樂',
    seoHeadphoneText: '可將已購買、已獲授權，或你有合法使用權的本機音樂整理為 MP3，再匯入耳機的離線儲存空間。',
    seoPrivacyTitle: '檔案不會上傳伺服器',
    seoPrivacyText: '音訊只會在目前裝置的記憶體中處理，不作為線上音樂資源提供或分發。',
    githubLinkLabel: 'GitHub 倉庫',
    authorLinkLabel: '作者首頁',
    authorLinkAria: '開啟作者首頁',
    themeToggleLabel: (theme) => (theme === 'light' ? '切換到深色模式' : '切換到淺色模式'),
    languageMenuLabel: (current) => `目前語言：${current}。開啟語言選單`,
    languageListLabel: '語言版本',
  },
  en: {
    appTitle: '水下听歌大救星',
    convertError: 'Conversion failed',
    processingTitle: 'Music files to MP3',
    chooseDropTitle: 'Choose or drop music files',
    chooseDropSubtitle: 'Supports NCM, KGM, KGMA and VPR. Files stay on this device.',
    dropOverlayTitle: 'Release to import',
    dropOverlaySubtitle: 'New files will join the queue',
    queueSummary: ({ total, ready, converting }) =>
      `${total} files · ${ready} done · ${converting} converting`,
    chooseMore: 'Add more',
    downloadZip: 'Download ZIP',
    zipping: 'Zipping',
    zipStalled: 'ZIP progress has paused. Please wait a little longer; if it remains stuck, refresh and retry or package fewer files at a time.',
    zipFailed: 'ZIP creation failed. Please retry, or package fewer files at a time when the list is large.',
    readyDownloadSuffix: 'MP3 ready',
    zipShort: 'ZIP',
    clearFinished: 'Clear done',
    metadataWaiting: 'Waiting for metadata',
    previewLabel: 'Preview',
    previewEmptyTitle: 'Select a converted song',
    previewEmptySubtitle: 'Converted tracks can play here',
    audioLabel: 'Track preview player, press Space to play or pause',
    platformImportNote: 'Supports NetEase NCM and KuGou KGM / KGMA / VPR',
    localCliTitle: 'Install CLI for an AI agent',
    localCliSummary: 'Let an AI assistant with local-folder access process NCM files in batches.',
    localCliScenarioTitle: 'Best for',
    localCliScenarioText: 'Useful for large batches or recurring conversions of a chosen folder.',
    localCliUsageTitle: 'How to use it',
    localCliUsageText: 'Give the install link to a desktop AI with file and command access, such as Doubao, MiniMax, or WorkBuddy. Ask it to install the CLI, then provide the folder to convert.',
    localCliPrompt: 'Example: Install ncm-studio-cli, then convert the NCM files in “Music Folder” into “Output Folder”.',
    localCliExpand: 'Expand CLI instructions',
    localCliCollapse: 'Collapse CLI instructions',
    localCliLinkLabel: 'Install link',
    localCliLinkAria: 'Copy the ncm-studio-cli npm package link',
    cliLinkCopied: 'Copied',
    cliLinkCopyFailed: 'Copy failed',
    donateTitle: 'Support the author',
    donateIntro: 'This tool will always be free. If it saved you time, you can leave any amount as a tip.',
    donatePraises: [
      'People who support free tools have great taste and generous hearts. Wishing you a wonderfully smooth day!',
      'May every swim come with great music, and every return to shore bring even more good luck.',
      'May work end on time, every swim stay smooth, your headphones stay charged, and good luck stay online!',
      'Thank you for helping this little tool keep going. May every day bring you a happy surprise!',
      'Your support powers the next update. May every effort you make bring a beautiful result.',
      'Anyone who cheers for useful free tools has excellent taste and a lovely heart. Wishing you joy every day!',
      'May your wallet stay full, your hair stay put, your weekends stay work-free, and every favorite song make the playlist!',
      'May inspiration overflow, luck stay online, and shuffle play serve only songs you love!',
      'May the wind join your runs, music join your swims, and no one catch your well-earned breaks—joy online all day!',
    ],
    donateRequest: 'You can also send me requests, and I’ll do my best to make them happen!',
    donateSectionExpand: 'Expand author support',
    donateSectionCollapse: 'Collapse author support',
    donateAlipay: 'Alipay',
    donateWechat: 'WeChat Pay',
    donateQrAlt: (method) => `${method} payment QR code`,
    copyWechat: 'Copy WeChat ID',
    wechatCopied: 'WeChat ID copied',
    wechatCopyFailed: 'Copy failed. Please try again.',
    usageGuideLabel: 'Website guide',
    usageGuideClose: 'Close website guide',
    seoHeading: 'Prepare your own music for offline devices',
    seoIntro: '水下听歌大救星 converts legally obtained NetEase NCM and KuGou music files to MP3 locally in your browser for swimming headphones, bone-conduction sports headphones, car stereos, and portable players.',
    seoConvertTitle: 'NCM and KGM to MP3',
    seoConvertText: 'Convert, preview, and package NCM, KGM, KGMA, and VPR files without uploading your audio.',
    seoHeadphoneTitle: 'Music for swimming headphones',
    seoHeadphoneText: 'Prepare files you have purchased, downloaded with permission, or otherwise have the right to use before copying them to offline headphone storage.',
    seoPrivacyTitle: 'Private local processing',
    seoPrivacyText: 'Audio stays in this device’s memory. 水下听歌大救星 does not provide or distribute music.',
    githubLinkLabel: 'GitHub repository',
    authorLinkLabel: 'Author',
    authorLinkAria: 'Open the author homepage',
    themeToggleLabel: (theme) => (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'),
    languageMenuLabel: (current) => `Current language: ${current}. Open language menu`,
    languageListLabel: 'Language versions',
  },
  ja: {
    appTitle: '水下听歌大救星',
    convertError: '変換に失敗しました',
    processingTitle: '音楽ファイルを MP3 へ',
    chooseDropTitle: '音楽ファイルを選択またはドロップ',
    chooseDropSubtitle: 'NCM、KGM、KGMA、VPR に対応。ファイルは端末内で処理されます',
    dropOverlayTitle: '離してインポート',
    dropOverlaySubtitle: '新しいファイルはキューに追加されます',
    queueSummary: ({ total, ready, converting }) =>
      `${total} ファイル · ${ready} 件完了 · ${converting} 件変換中`,
    chooseMore: 'さらに追加',
    downloadZip: 'ZIP ダウンロード',
    zipping: '圧縮中',
    zipStalled: 'ZIP の進捗が一時停止しています。しばらく待ち、改善しない場合は再読み込み後に再試行するか、ファイル数を減らして分割してください。',
    zipFailed: 'ZIP の作成に失敗しました。再試行するか、ファイル数を減らして分割してください。',
    readyDownloadSuffix: '個の MP3 がダウンロード可能',
    zipShort: 'ZIP',
    clearFinished: '完了をクリア',
    metadataWaiting: 'メタデータ解析待ち',
    previewLabel: '試聴プレビュー',
    previewEmptyTitle: '変換済みの曲を選択',
    previewEmptySubtitle: '変換後ここで再生できます',
    audioLabel: '楽曲プレビュープレイヤー。スペースで再生/一時停止',
    platformImportNote: 'NetEase NCM と KuGou KGM / KGMA / VPR に対応',
    localCliTitle: 'CLI を入れて AI で処理',
    localCliSummary: 'ローカルフォルダへアクセスできる AI で NCM ファイルを一括処理できます。',
    localCliScenarioTitle: '適した場面',
    localCliScenarioText: '大量のファイルを一度に変換する場合や、指定フォルダを繰り返し変換する場合に適しています。',
    localCliUsageTitle: '使い方',
    localCliUsageText: 'ファイルとコマンドへアクセスできる Doubao、MiniMax、WorkBuddy などのデスクトップ AI にインストールリンクを渡し、CLI のインストール後に変換するフォルダを指定します。',
    localCliPrompt: '例：ncm-studio-cli をインストールし、「音楽フォルダ」の NCM を「出力フォルダ」へ変換してください。',
    localCliExpand: 'CLI の使い方を開く',
    localCliCollapse: 'CLI の使い方を閉じる',
    localCliLinkLabel: 'インストールリンク',
    localCliLinkAria: 'ncm-studio-cli の npm インストールリンクをコピー',
    cliLinkCopied: 'コピー完了',
    cliLinkCopyFailed: 'コピー失敗',
    donateTitle: '作者を応援',
    donateIntro: 'このツールはずっと無料です。時間の節約になったら、お好きな金額で応援していただけます。',
    donatePraises: [
      '無料ツールを応援してくれる方は、センスも心遣いもすてきです。今日が順調な一日になりますように！',
      '泳ぐたびに好きな音楽が寄り添い、水から上がったあとも幸運が続きますように。',
      '残業なし、泳ぎは快適、イヤホンはいつも充電満タン、幸運は常にオンラインでありますように！',
      'この小さなツールを支えてくださってありがとうございます。毎日うれしい驚きがありますように！',
      'あなたの応援が次のアップデートの力になります。努力がすてきな実を結びますように。',
      '便利な無料ツールを応援する方は、センスも人柄もすてきです。毎日が楽しくなりますように！',
      'お財布は痩せず、髪は減らず、週末は残業なし。好きな曲も一曲残らず楽しめますように！',
      'ひらめき全開、運気オンライン。シャッフル再生まで好きな曲だけ選んでくれますように！',
      '走るときは追い風、泳ぐときは音楽、ひと息つくときは誰にも見つからず、一日中楽しく過ごせますように！',
    ],
    donateRequest: 'ご要望もぜひ教えてください。できる限り実現します！',
    donateSectionExpand: '作者の応援を開く',
    donateSectionCollapse: '作者の応援を閉じる',
    donateAlipay: 'Alipay',
    donateWechat: 'WeChat Pay',
    donateQrAlt: (method) => `${method} 支払い QR コード`,
    copyWechat: 'WeChat ID をコピー',
    wechatCopied: 'WeChat ID をコピーしました',
    wechatCopyFailed: 'コピーに失敗しました。もう一度お試しください。',
    usageGuideLabel: 'サイトの使い方',
    usageGuideClose: 'サイトの使い方を閉じる',
    seoHeading: '手持ちの音楽をオフライン機器へ',
    seoIntro: '水下听歌大救星は、正当に利用できる NetEase NCM と KuGou の音楽ファイルをブラウザ内で MP3 に変換し、水泳用骨伝導イヤホン、スポーツイヤホン、カーオーディオなどへ整理できます。',
    seoConvertTitle: 'NCM・KGM を MP3 に変換',
    seoConvertText: 'NCM、KGM、KGMA、VPR の変換、試聴、ZIP 保存をブラウザ内で完結できます。',
    seoHeadphoneTitle: '水泳用骨伝導イヤホンの音楽',
    seoHeadphoneText: '購入済み、許可を得てダウンロード済み、または正当な利用権を持つ音楽を MP3 にしてオフラインストレージへコピーできます。',
    seoPrivacyTitle: 'ファイルをアップロードしない',
    seoPrivacyText: '音声は端末のメモリ内だけで処理され、音楽の提供や配布は行いません。',
    githubLinkLabel: 'GitHub リポジトリ',
    authorLinkLabel: '作者ページ',
    authorLinkAria: '作者ホームページを開く',
    themeToggleLabel: (theme) => (theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'),
    languageMenuLabel: (current) => `現在の言語：${current}。言語メニューを開く`,
    languageListLabel: '言語バージョン',
  },
}

const SUPPORTED_LANGUAGE_IDS = new Set(LANGUAGE_OPTIONS.map((option) => option.id))

function normalizeLanguageId(value) {
  if (!value) return ''

  const language = String(value).trim()
  const lowerLanguage = language.toLowerCase()

  if (SUPPORTED_LANGUAGE_IDS.has(language)) return language
  if (lowerLanguage === 'zh-hant' || lowerLanguage.startsWith('zh-hant-') || lowerLanguage === 'zh-tw' || lowerLanguage === 'zh-hk' || lowerLanguage === 'zh-mo') return 'zh-Hant'
  if (lowerLanguage === 'zh-hans' || lowerLanguage.startsWith('zh-hans-') || lowerLanguage === 'zh-cn' || lowerLanguage === 'zh-sg') return 'zh'
  if (lowerLanguage === 'ja' || lowerLanguage.startsWith('ja-')) return 'ja'
  if (lowerLanguage === 'en' || lowerLanguage.startsWith('en-')) return 'en'

  return ''
}

function getStoredLanguage() {
  if (typeof window === 'undefined') return ''

  try {
    return normalizeLanguageId(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return ''
  }
}

function persistLanguage(language) {
  if (typeof window === 'undefined') return
  if (!SUPPORTED_LANGUAGE_IDS.has(language)) return

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Ignore private browsing and storage permission failures.
  }
}

function getRequestedLanguage() {
  if (typeof window === 'undefined') return ''

  try {
    const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
    return normalizeLanguageId(requestedLanguage)
  } catch {
    return ''
  }
}

function getBrowserLanguagePreference() {
  if (typeof navigator === 'undefined') return { language: '', isAmbiguousChinese: false }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  let isAmbiguousChinese = false

  for (const language of languages) {
    const normalizedBrowserLanguage = String(language || '').trim().toLowerCase()

    if (normalizedBrowserLanguage === 'zh') {
      isAmbiguousChinese = true
      continue
    }

    const normalizedLanguage = normalizeLanguageId(language)
    if (normalizedLanguage) return { language: normalizedLanguage, isAmbiguousChinese: false }
  }

  return { language: '', isAmbiguousChinese }
}

function shouldResolveGeoLanguage() {
  if (typeof window === 'undefined') return false
  if (getStoredLanguage() || getRequestedLanguage()) return false

  const browserLanguage = getBrowserLanguagePreference()
  return !browserLanguage.language || browserLanguage.isAmbiguousChinese
}

function splitAnimatedWords(text, locale) {
  if (typeof Intl?.Segmenter === 'function') {
    const segments = Array.from(
      new Intl.Segmenter(locale, { granularity: 'word' }).segment(text),
      ({ segment, isWordLike }) => ({ text: segment, animate: Boolean(isWordLike) }),
    )

    return segments.reduce((parts, part) => {
      if (part.animate || /^\s+$/u.test(part.text) || parts.length === 0) {
        parts.push(part)
      } else {
        parts[parts.length - 1].text += part.text
      }
      return parts
    }, [])
  }

  return (text.match(/(\S+|\s+)/g) || [text]).map((part) => ({
    text: part,
    animate: !/^\s+$/u.test(part),
  }))
}

function SpringScaleText({ text, locale }) {
  const hostRef = useRef(null)
  const parts = useMemo(() => splitAnimatedWords(text, locale), [locale, text])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const units = Array.from(host.querySelectorAll('.springScaleWord'))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      units.forEach((unit) => {
        unit.style.opacity = '1'
        unit.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotate(0deg) scale(1)'
      })
      return undefined
    }

    const initialDelay = Math.round(Math.random() * SPRING_SCALE_IN.initialDelayMax)
    const animations = units.map((unit, index) =>
      unit.animate(
        [
          {
            opacity: 0,
            transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotate(0deg) scale(0.7)',
          },
          {
            opacity: 1,
            transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotate(0deg) scale(1)',
          },
        ],
        {
          delay: initialDelay + index * SPRING_SCALE_IN.stagger,
          duration: SPRING_SCALE_IN.duration,
          easing: SPRING_SCALE_IN.easing,
          fill: 'forwards',
        },
      ),
    )

    return () => animations.forEach((animation) => animation.cancel())
  }, [parts])

  return (
    <span className="springScaleText" ref={hostRef}>
      {parts.map((part, index) =>
        part.animate ? (
          <span className="springScaleWord" key={`${part.text}-${index}`}>
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}-${index}`}>
            {part.text}
          </span>
        ),
      )}
    </span>
  )
}

function nextRandomIndex(length, currentIndex) {
  if (length <= 1) return 0
  return (currentIndex + 1 + Math.floor(Math.random() * (length - 1))) % length
}

function useGsapIntro(deps = []) {
  const scope = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const context = gsap.context(() => {
      gsap.from('[data-enter]', {
        opacity: 0,
        y: 18,
        scale: 0.985,
        duration: 0.58,
        stagger: 0.045,
        ease: 'back.out(1.35)',
      })
    }, scope)

    return () => context.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scope
}

function getInitialLanguage() {
  const storedLanguage = getStoredLanguage()
  if (storedLanguage) return storedLanguage

  const requestedLanguage = getRequestedLanguage()
  if (requestedLanguage) return requestedLanguage

  const browserLanguage = getBrowserLanguagePreference()
  if (browserLanguage.language) return browserLanguage.language
  if (browserLanguage.isAmbiguousChinese) return 'zh'

  return 'en'
}

function App() {
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState(getInitialLanguage)
  const [tracks, setTracks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const [zipFeedback, setZipFeedback] = useState(null)
  const [cliCopyStatus, setCliCopyStatus] = useState('')
  const [cliSectionExpanded, setCliSectionExpanded] = useState(false)
  const [donateSectionExpanded, setDonateSectionExpanded] = useState(false)
  const [donatePraiseIndex, setDonatePraiseIndex] = useState(-1)
  const [donateMethod, setDonateMethod] = useState('wechat')
  const [wechatCopyStatus, setWechatCopyStatus] = useState('')
  const [usageGuideOpen, setUsageGuideOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const fileInputRef = useRef(null)
  const cliCopyTimerRef = useRef(null)
  const wechatCopyTimerRef = useRef(null)
  const usageGuideTriggerRef = useRef(null)
  const usageGuideCloseRef = useRef(null)
  const languageMenuRef = useRef(null)
  const tracksRef = useRef([])
  const audioRef = useRef(null)
  const shouldResolveGeoLanguageRef = useRef(shouldResolveGeoLanguage())
  const rootRef = useGsapIntro([])
  const messages = I18N[language]
  const currentLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.id === language) || LANGUAGE_OPTIONS[0]
  const donatePraise =
    messages.donatePraises[Math.max(0, donatePraiseIndex) % messages.donatePraises.length]

  function chooseNextDonatePraise() {
    setDonatePraiseIndex((current) => nextRandomIndex(messages.donatePraises.length, current))
  }

  function toggleDonateSection() {
    if (!donateSectionExpanded) chooseNextDonatePraise()
    setDonateSectionExpanded((current) => !current)
  }

  function revealDonateSection() {
    chooseNextDonatePraise()
    setDonateSectionExpanded(true)
  }

  const selectedTrack = useMemo(
    () =>
      tracks.find((track) => track.id === selectedId) ||
      tracks.find((track) => track.status === 'ready') ||
      tracks[0],
    [selectedId, tracks],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = currentLanguageOption.htmlLang
  }, [currentLanguageOption.htmlLang])

  useEffect(() => {
    if (!shouldResolveGeoLanguageRef.current) return undefined

    const browserLanguage = getBrowserLanguagePreference()
    const controller = new AbortController()

    async function resolveGeoLanguage() {
      try {
        const response = await fetch(DEFAULT_LANGUAGE_ENDPOINT, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        if (!response.ok) return

        const data = await response.json()
        const geoLanguage = normalizeLanguageId(data?.language)
        if (!geoLanguage || getStoredLanguage() || getRequestedLanguage()) return

        if (browserLanguage.isAmbiguousChinese) {
          if (geoLanguage === 'zh' || geoLanguage === 'zh-Hant') setLanguage(geoLanguage)
          return
        }

        setLanguage(geoLanguage)
      } catch {
        // Keep the browser-derived or English fallback when geo lookup is unavailable.
      }
    }

    resolveGeoLanguage()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!languageMenuOpen) return undefined

    function closeLanguageMenu(event) {
      if (languageMenuRef.current?.contains(event.target)) return
      setLanguageMenuOpen(false)
    }

    function closeLanguageMenuOnEscape(event) {
      if (event.key !== 'Escape') return
      setLanguageMenuOpen(false)
    }

    document.addEventListener('mousedown', closeLanguageMenu)
    document.addEventListener('focusin', closeLanguageMenu)
    window.addEventListener('keydown', closeLanguageMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeLanguageMenu)
      document.removeEventListener('focusin', closeLanguageMenu)
      window.removeEventListener('keydown', closeLanguageMenuOnEscape)
    }
  }, [languageMenuOpen])

  useEffect(() => {
    if (donateSectionExpanded) setCliSectionExpanded(false)
  }, [donateSectionExpanded])

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    if (!usageGuideOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => usageGuideCloseRef.current?.focus())

    function closeOnEscape(event) {
      if (event.key !== 'Escape') return
      setUsageGuideOpen(false)
      window.requestAnimationFrame(() => usageGuideTriggerRef.current?.focus())
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [usageGuideOpen])

  useEffect(() => {
    function handlePlayerShortcut(event) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code !== 'Space' && event.key !== ' ') return

      const target = event.target
      if (target instanceof HTMLElement) {
        const interactiveTarget = target.closest(
          'input, textarea, select, button, a, audio, [contenteditable="true"]',
        )
        if (target.isContentEditable || interactiveTarget) return
      }

      const audio = audioRef.current
      const hasAudioSource = audio?.currentSrc || audio?.getAttribute('src')
      if (!audio || !hasAudioSource) return

      event.preventDefault()
      event.stopPropagation()

      if (audio.paused) {
        const playPromise = audio.play()
        if (playPromise) playPromise.catch(() => {})
        return
      }

      audio.pause()
    }

    window.addEventListener('keydown', handlePlayerShortcut, true)
    return () => window.removeEventListener('keydown', handlePlayerShortcut, true)
  }, [])

  useEffect(() => {
    return () => {
      if (cliCopyTimerRef.current) window.clearTimeout(cliCopyTimerRef.current)
      if (wechatCopyTimerRef.current) window.clearTimeout(wechatCopyTimerRef.current)
      tracksRef.current.forEach((track) => {
        if (track.audioUrl) URL.revokeObjectURL(track.audioUrl)
        if (track.coverUrl) URL.revokeObjectURL(track.coverUrl)
      })
    }
  }, [])

  async function copyCliPackageLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(NPM_PACKAGE_URL)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = NPM_PACKAGE_URL
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        const copied = document.execCommand('copy')
        textArea.remove()
        if (!copied) throw new Error('Clipboard unavailable')
      }
      setCliCopyStatus('success')
    } catch {
      setCliCopyStatus('error')
    }

    if (cliCopyTimerRef.current) window.clearTimeout(cliCopyTimerRef.current)
    cliCopyTimerRef.current = window.setTimeout(() => setCliCopyStatus(''), 2200)
  }

  async function copyWechatId() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(WECHAT_ID)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = WECHAT_ID
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        const copied = document.execCommand('copy')
        textArea.remove()
        if (!copied) throw new Error('Clipboard unavailable')
      }
      setWechatCopyStatus('success')
    } catch {
      setWechatCopyStatus('error')
    }

    if (wechatCopyTimerRef.current) window.clearTimeout(wechatCopyTimerRef.current)
    wechatCopyTimerRef.current = window.setTimeout(() => setWechatCopyStatus(''), 2400)
  }

  async function convertTrack(track, options = {}) {
    setTracks((current) =>
      current.map((item) =>
        item.id === track.id
          ? { ...item, status: 'converting', progress: 18, error: '' }
          : item,
      ),
    )

    const pulse = setInterval(() => {
      setTracks((current) =>
        current.map((item) =>
          item.id === track.id && item.status === 'converting'
            ? { ...item, progress: Math.min(86, item.progress + 9) }
            : item,
        ),
      )
    }, 160)

    try {
      const result = await convertMusicFile(track.file, {
        onProgress: (progress) => {
          setTracks((current) => current.map((item) =>
            item.id === track.id && item.status === 'converting'
              ? { ...item, progress: Math.max(18, Math.min(99, progress)) }
              : item,
          ))
        },
      })
      clearInterval(pulse)
      const archiveCrc32 = calculateCrc32(result.audioBytes)
      const audioBlob = new Blob([result.audioBytes], { type: result.mime })
      const audioUrl = URL.createObjectURL(audioBlob)
      const coverUrl = result.coverBytes
        ? URL.createObjectURL(new Blob([result.coverBytes], { type: 'image/jpeg' }))
        : ''

      setTracks((current) =>
        current.map((item) =>
          item.id === track.id
            ? {
                ...item,
                ...result,
                audioBlob,
                archiveCrc32,
                audioUrl,
                coverUrl,
                status: 'ready',
                progress: 100,
                size: audioBlob.size,
              }
            : item,
        ),
      )

      if (options.select !== false) setSelectedId(track.id)
    } catch (error) {
      clearInterval(pulse)
      setTracks((current) =>
        current.map((item) =>
          item.id === track.id
            ? { ...item, status: 'error', progress: 0, error: error.message || messages.convertError }
            : item,
        ),
      )
    }
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => isSupportedMusicFile(file.name))
    if (!files.length) return

    const nextTracks = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      title: file.name.replace(/\.(?:ncm|kgm|kgma|vpr)$/i, ''),
      artist: '',
      album: '',
      status: 'queued',
      progress: 0,
      sourceSize: file.size,
    }))

    setTracks((current) => [...nextTracks, ...current])
    setSelectedId(nextTracks[0]?.id)

    nextTracks.forEach((track, index) => {
      setTimeout(() => convertTrack(track, { select: index === 0 }), index * 220)
    })
  }

  function removeTrack(trackId) {
    setTracks((current) => {
      const target = current.find((track) => track.id === trackId)
      if (target?.audioUrl) URL.revokeObjectURL(target.audioUrl)
      if (target?.coverUrl) URL.revokeObjectURL(target.coverUrl)
      return current.filter((track) => track.id !== trackId)
    })
  }

  function clearFinished() {
    setTracks((current) => {
      current.forEach((track) => {
        if (track.status === 'ready') {
          if (track.audioUrl) URL.revokeObjectURL(track.audioUrl)
          if (track.coverUrl) URL.revokeObjectURL(track.coverUrl)
        }
      })
      return current.filter((track) => track.status !== 'ready')
    })
  }

  function downloadTrack(track) {
    if (!track?.audioBlob) return
    saveAs(track.audioBlob, track.filename || `${safeFilename(track.title)}.mp3`)
  }

  async function downloadZip() {
    const readyTracks = tracks.filter((track) => track.status === 'ready' && track.audioBlob)
    if (!readyTracks.length) return

    setIsZipping(true)
    setZipProgress(0)
    setZipFeedback(null)

    try {
      const blob = await buildTracksZip(readyTracks, {
        onProgress: (percent) => {
          setZipProgress(percent)
          setZipFeedback((current) => (current?.type === 'warning' ? null : current))
        },
        onStall: () => {
          setZipFeedback({ type: 'warning', message: messages.zipStalled })
        },
      })
      saveAs(blob, `ncm-studio-${readyTracks.length}-tracks.zip`)
      revealDonateSection()
    } catch (error) {
      console.error('Failed to build ZIP archive', error)
      setZipFeedback({ type: 'error', message: messages.zipFailed })
    } finally {
      setIsZipping(false)
    }
  }

  const readyCount = tracks.filter((track) => track.status === 'ready').length
  const convertingCount = tracks.filter((track) => track.status === 'converting').length

  return (
    <div className={`app ${tracks.length ? 'hasTracks' : ''}`} ref={rootRef}>
      <header className="topbar" data-enter>
          <div className="brand">
            <div className="brandMark">
              <Music2 size={22} />
            </div>
            <div>
              <h1>{messages.appTitle}</h1>
            </div>
          </div>

        <div className="topbarActions">
          <div className="languageMenuWrap" ref={languageMenuRef}>
            <button
              className="iconButton languageButton"
              type="button"
              onClick={() => setLanguageMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
              aria-label={messages.languageMenuLabel(currentLanguageOption.label)}
              title={messages.languageMenuLabel(currentLanguageOption.label)}
            >
              <Languages size={16} />
              <span>{currentLanguageOption.short}</span>
            </button>
            {languageMenuOpen && (
              <div className="languageMenu" role="menu" aria-label={messages.languageListLabel}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={language === option.id ? 'active' : ''}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === option.id}
                    lang={option.htmlLang}
                    onClick={() => {
                      setLanguage(option.id)
                      persistLanguage(option.id)
                      setLanguageMenuOpen(false)
                    }}
                  >
                    <span>{option.label}</span>
                    {language === option.id && <Check size={14} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="iconButton"
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={messages.themeToggleLabel(theme)}
            title={messages.themeToggleLabel(theme)}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section
          className={`queuePanel processingPanel ${tracks.length ? 'hasTracks' : 'emptyProcessing'} ${isDragging ? 'isDragging' : ''}`}
          data-enter
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            addFiles(event.dataTransfer.files)
          }}
        >
          <input
            ref={fileInputRef}
            className="filePickerInput"
            type="file"
            multiple
            accept=".ncm,.kgm,.kgma,.vpr"
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = ''
            }}
          />

          {!tracks.length ? (
            <div className="uploadEmpty">
              <div className="queueHeader uploadHeader">
                <div>
                  <h2>{messages.processingTitle}</h2>
                  <SupportedFormatNote messages={messages} />
                </div>
              </div>

              <button
                className={`dropzone heroDropzone ${isDragging ? 'isDragging' : ''}`}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={34} />
                <strong>{messages.chooseDropTitle}</strong>
                <span>{messages.chooseDropSubtitle}</span>
              </button>
            </div>
          ) : (
            <>
              {isDragging && (
                <div className="dropOverlay">
                  <UploadCloud size={34} />
                  <strong>{messages.dropOverlayTitle}</strong>
                  <span>{messages.dropOverlaySubtitle}</span>
                </div>
              )}

              <div className="queueHeader">
                <div>
                  <h2>{messages.processingTitle}</h2>
                  <SupportedFormatNote messages={messages} />
                  <p>
                    {messages.queueSummary({
                      total: tracks.length,
                      ready: readyCount,
                      converting: convertingCount,
                    })}
                  </p>
                </div>
                <div className="queueControls">
                  <button className="secondaryButton" type="button" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud size={17} />
                    {messages.chooseMore}
                  </button>
                  <button
                    className={`primaryButton zipButton ${isZipping ? 'isZipping' : ''}`}
                    type="button"
                    onClick={downloadZip}
                    disabled={!readyCount || isZipping}
                    aria-busy={isZipping}
                    style={{ '--zip-progress': `${zipProgress}%` }}
                  >
                    {isZipping && <span className="zipButtonFill" aria-hidden="true" />}
                    <Archive size={17} />
                    <span>{isZipping ? `${messages.zipping} ${zipProgress}%` : messages.downloadZip}</span>
                  </button>
                </div>
              </div>

              {zipFeedback && (
                <div className={`zipAlert ${zipFeedback.type}`} role={zipFeedback.type === 'error' ? 'alert' : 'status'}>
                  <TriangleAlert size={17} />
                  <span>{zipFeedback.message}</span>
                </div>
              )}

              <div className="queueTable">
                {tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    selected={selectedTrack?.id === track.id}
                    onSelect={() => setSelectedId(track.id)}
                    onConvert={() => convertTrack(track)}
                    onDownload={() => downloadTrack(track)}
                    onRemove={() => removeTrack(track.id)}
                    messages={messages}
                  />
                ))}
              </div>

              <PreviewPane
                track={selectedTrack}
                messages={messages}
                audioRef={audioRef}
              />
            </>
          )}
        </section>

        <aside className="cliInstallPanel" data-enter>
          <section className="cliSection">
            <button
              className="cliSectionToggle"
              type="button"
              aria-expanded={cliSectionExpanded}
              aria-controls="cli-section-body"
              aria-label={cliSectionExpanded ? messages.localCliCollapse : messages.localCliExpand}
              onClick={() => setCliSectionExpanded((current) => !current)}
            >
              <span className="cliInstallHeading">
                <span className="cliInstallIcon" aria-hidden="true">
                  <Terminal size={18} />
                </span>
                <span className="cliSectionTitle">{messages.localCliTitle}</span>
              </span>
              <ChevronDown className="cliChevron" size={17} aria-hidden="true" />
            </button>

            {cliSectionExpanded && (
              <div className="cliSectionBody" id="cli-section-body">
                <p>{messages.localCliSummary}</p>
                <div className="cliUsageDetail">
                  <strong>{messages.localCliScenarioTitle}</strong>
                  <p>{messages.localCliScenarioText}</p>
                </div>
                <div className="cliUsageDetail">
                  <strong>{messages.localCliUsageTitle}</strong>
                  <p>{messages.localCliUsageText}</p>
                  <code>{messages.localCliPrompt}</code>
                </div>
                <button
                  className={`cliPackageLink ${cliCopyStatus === 'success' ? 'isCopied' : ''} ${cliCopyStatus === 'error' ? 'isError' : ''}`}
                  type="button"
                  onClick={copyCliPackageLink}
                  aria-label={messages.localCliLinkAria}
                >
                  <span className="cliPackagePrefix">{messages.localCliLinkLabel}</span>
                  <span className="cliPackageValue">npmjs.com/package/ncm-studio-cli</span>
                  {cliCopyStatus === 'success' ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <span className="visuallyHidden" role="status" aria-live="polite">
                  {cliCopyStatus === 'success'
                    ? messages.cliLinkCopied
                    : cliCopyStatus === 'error'
                      ? messages.cliLinkCopyFailed
                      : ''}
                </span>
              </div>
            )}
          </section>

          <div className="sidePanelDivider" />
          <section className="donateSection">
            <button
              className="donateSectionToggle"
              type="button"
              aria-expanded={donateSectionExpanded}
              aria-controls="donate-section-body"
              aria-label={
                donateSectionExpanded ? messages.donateSectionCollapse : messages.donateSectionExpand
              }
              onClick={toggleDonateSection}
            >
              <span className="cliInstallHeading">
                <span className="cliInstallIcon donateIcon" aria-hidden="true">
                  <ThumbsUp size={18} />
                </span>
                <span className="donateSectionTitle">{messages.donateTitle}</span>
              </span>
              <ChevronDown className="donateChevron" size={17} aria-hidden="true" />
            </button>

            {donateSectionExpanded && (
              <div className="donateSectionBody" id="donate-section-body">
                <p className="donateCopy">
                  <span className="donateCopyLine">{messages.donateIntro}</span>
                  <span className="donateCopyLine donatePraiseLine">
                    <SpringScaleText text={donatePraise} locale={currentLanguageOption.htmlLang} />
                  </span>
                  <span className="donateCopyLine">{messages.donateRequest}</span>
                </p>
                <button className="wechatCopyButton" type="button" onClick={copyWechatId}>
                  <span>{messages.copyWechat}</span>
                </button>
                <div className="donatePaymentPanel" id="donate-payment-panel">
                  <div className="donateTabs" role="tablist" aria-label={messages.donateTitle}>
                    <button
                      className={donateMethod === 'alipay' ? 'active alipay' : 'alipay'}
                      type="button"
                      role="tab"
                      aria-selected={donateMethod === 'alipay'}
                      onClick={() => setDonateMethod('alipay')}
                    >
                      <WalletCards size={14} />
                      <span>{messages.donateAlipay}</span>
                    </button>
                    <button
                      className={donateMethod === 'wechat' ? 'active wechat' : 'wechat'}
                      type="button"
                      role="tab"
                      aria-selected={donateMethod === 'wechat'}
                      onClick={() => setDonateMethod('wechat')}
                    >
                      <MessageCircle size={14} />
                      <span>{messages.donateWechat}</span>
                    </button>
                  </div>
                  <div className="donateQrFrame" role="tabpanel">
                    <img
                      src={donateMethod === 'alipay' ? '/donate/alipay-qr.webp' : '/donate/wechat-qr.webp'}
                      alt={messages.donateQrAlt(
                        donateMethod === 'alipay' ? messages.donateAlipay : messages.donateWechat,
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </aside>

      </main>

      <footer className="siteFooter" data-enter>
        <button
          ref={usageGuideTriggerRef}
          className="usageGuideTrigger"
          type="button"
          onClick={() => setUsageGuideOpen(true)}
        >
          <span>{messages.usageGuideLabel}</span>
          <CircleAlert size={14} aria-hidden="true" />
        </button>
        <a
          className="footerTextLink"
          href={AUTHOR_HOME_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={messages.authorLinkAria}
        >
          <span>{messages.authorLinkLabel}</span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </footer>

      {usageGuideOpen && (
        <div
          className="usageGuideOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return
            setUsageGuideOpen(false)
            window.requestAnimationFrame(() => usageGuideTriggerRef.current?.focus())
          }}
        >
          <section
            className="usageGuideDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-guide-title"
          >
            <header className="usageGuideDialogHeader">
              <h2 id="usage-guide-title">{messages.usageGuideLabel}</h2>
              <button
                ref={usageGuideCloseRef}
                className="usageGuideClose"
                type="button"
                aria-label={messages.usageGuideClose}
                onClick={() => {
                  setUsageGuideOpen(false)
                  window.requestAnimationFrame(() => usageGuideTriggerRef.current?.focus())
                }}
              >
                <X size={18} />
              </button>
            </header>
            <div className="usageGuideContent">
              <div className="seoInfoHeader">
                <h3>{messages.seoHeading}</h3>
                <p>{messages.seoIntro}</p>
              </div>
              <div className="seoInfoGrid">
                <article>
                  <h4>{messages.seoConvertTitle}</h4>
                  <p>{messages.seoConvertText}</p>
                </article>
                <article>
                  <h4>{messages.seoHeadphoneTitle}</h4>
                  <p>{messages.seoHeadphoneText}</p>
                </article>
                <article>
                  <h4>{messages.seoPrivacyTitle}</h4>
                  <p>{messages.seoPrivacyText}</p>
                </article>
              </div>
              <nav className="seoLanguageLinks" aria-label={messages.languageListLabel}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={language === option.id ? 'active' : ''}
                    type="button"
                    lang={option.htmlLang}
                    aria-current={language === option.id ? 'true' : undefined}
                    onClick={() => {
                      setLanguage(option.id)
                      persistLanguage(option.id)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </nav>
            </div>
          </section>
        </div>
      )}

      {!!tracks.length && (
        <div className="bottomBar" data-enter>
          <div>
            <strong>{readyCount}</strong>
            <span>{messages.readyDownloadSuffix}</span>
          </div>
          <button
            className={`zipButton ${isZipping ? 'isZipping' : ''}`}
            type="button"
            onClick={downloadZip}
            disabled={!readyCount || isZipping}
            aria-busy={isZipping}
            style={{ '--zip-progress': `${zipProgress}%` }}
          >
            {isZipping && <span className="zipButtonFill" aria-hidden="true" />}
            <Archive size={17} />
            <span>{isZipping ? `${messages.zipShort} ${zipProgress}%` : messages.zipShort}</span>
          </button>
          <button type="button" onClick={clearFinished} disabled={!readyCount}>
            <Trash2 size={17} />
            {messages.clearFinished}
          </button>
        </div>
      )}

      {wechatCopyStatus && (
        <div
          className={`copyToast ${wechatCopyStatus}`}
          role={wechatCopyStatus === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {wechatCopyStatus === 'success' ? <Check size={16} /> : <TriangleAlert size={16} />}
          <span>
            {wechatCopyStatus === 'success' ? messages.wechatCopied : messages.wechatCopyFailed}
          </span>
        </div>
      )}

    </div>
  )
}

function SupportedFormatNote({ messages }) {
  return (
    <p className="platformImportNote">
      <span>{messages.platformImportNote}</span>
    </p>
  )
}

function TrackRow({ track, index, selected, onSelect, onConvert, onDownload, onRemove, messages }) {
  const canDownload = track.status === 'ready' && track.audioBlob

  return (
    <div
      className={`trackRow ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{ '--delay': `${Math.min(index * 35, 280)}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
    >
      <div className="trackIndex">
        {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <FileMusic size={20} />}
      </div>
      <div className="trackMeta">
        <strong>{track.title}</strong>
        <span>{track.artist || track.album || track.file?.name || messages.metadataWaiting}</span>
        {track.status === 'error' && <em>{track.error}</em>}
      </div>
      <div className="formatCell">
        <small>{formatBytes(track.size || track.sourceSize)}</small>
      </div>
      <div className="progressCell">
        <div>
          <span style={{ width: `${track.progress || 0}%` }} />
        </div>
        <small>{track.progress || 0}%</small>
      </div>
      <div className="rowActions">
        {track.status !== 'ready' && (
          <button type="button" onClick={(event) => { event.stopPropagation(); onConvert() }}>
            <RefreshCw size={16} />
          </button>
        )}
        <button type="button" disabled={!canDownload} onClick={(event) => { event.stopPropagation(); onDownload() }}>
          <Download size={16} />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onRemove() }}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

function PreviewPane({ track, messages, audioRef }) {
  return (
    <aside className="previewPane">
      <div className="cover">
        {track?.coverUrl ? <img src={track.coverUrl} alt="" /> : <Music2 size={42} />}
      </div>
      <div className="previewMeta">
        <span>{messages.previewLabel}</span>
        <strong>{track?.title || messages.previewEmptyTitle}</strong>
        <p>{track?.artist || track?.album || messages.previewEmptySubtitle}</p>
      </div>
      <div className="playerControls">
        {track?.audioUrl ? (
          <audio ref={audioRef} src={track.audioUrl} controls aria-label={messages.audioLabel} />
        ) : (
          <audio ref={audioRef} controls aria-label={messages.audioLabel} />
        )}
      </div>
    </aside>
  )
}

export default App
