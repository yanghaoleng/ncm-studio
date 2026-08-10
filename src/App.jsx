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

const LANGUAGE_OPTIONS = [
  { id: 'zh', short: '中', label: '中文', htmlLang: 'zh-CN' },
  { id: 'en', short: 'EN', label: 'English', htmlLang: 'en' },
  { id: 'ja', short: '日', label: '日本語', htmlLang: 'ja' },
]

const I18N = {
  zh: {
    appTitle: 'NCM Studio',
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
    donateDescription: '这个工具会一直免费。\n如果它帮你省了时间，可以请我喝杯咖啡，支持后续维护，我会开心一整天！\u00A0🥰\n也可以给我提要求，我会努力实现！',
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
    seoIntro: 'NCM Studio 在浏览器本地把您有权使用的网易云 NCM 与酷狗音乐文件转换为 MP3，适合游泳骨传导耳机、运动耳机、车载播放器和随身播放器。',
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
    languageToggleLabel: (current, next) => `当前语言：${current}。切换到${next}`,
  },
  en: {
    appTitle: 'NCM Studio',
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
    donateDescription: 'This tool will always be free.\nIf it saved you time, you can buy me a coffee and support future maintenance. It would make my day!\u00A0🥰\nYou can also send me feature requests, and I will do my best to build them!',
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
    seoIntro: 'NCM Studio converts legally obtained NetEase NCM and KuGou music files to MP3 locally in your browser for swimming headphones, bone-conduction sports headphones, car stereos, and portable players.',
    seoConvertTitle: 'NCM and KGM to MP3',
    seoConvertText: 'Convert, preview, and package NCM, KGM, KGMA, and VPR files without uploading your audio.',
    seoHeadphoneTitle: 'Music for swimming headphones',
    seoHeadphoneText: 'Prepare files you have purchased, downloaded with permission, or otherwise have the right to use before copying them to offline headphone storage.',
    seoPrivacyTitle: 'Private local processing',
    seoPrivacyText: 'Audio stays in this device’s memory. NCM Studio does not provide or distribute music.',
    githubLinkLabel: 'GitHub repository',
    authorLinkLabel: 'Author',
    authorLinkAria: 'Open the author homepage',
    themeToggleLabel: (theme) => (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'),
    languageToggleLabel: (current, next) => `Current language: ${current}. Switch to ${next}`,
  },
  ja: {
    appTitle: 'NCM Studio',
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
    donateDescription: 'このツールはずっと無料です。\n時間の節約になったら、コーヒー一杯分で今後のメンテナンスを応援してください。一日中うれしい気持ちになります！\u00A0🥰\n機能のリクエストも歓迎です。できる限り実現します！',
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
    seoIntro: 'NCM Studio は、正当に利用できる NetEase NCM と KuGou の音楽ファイルをブラウザ内で MP3 に変換し、水泳用骨伝導イヤホン、スポーツイヤホン、カーオーディオなどへ整理できます。',
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
    languageToggleLabel: (current, next) => `現在の言語：${current}。${next}に切り替え`,
  },
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
  if (typeof window === 'undefined') return 'zh'
  const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
  return LANGUAGE_OPTIONS.some((option) => option.id === requestedLanguage) ? requestedLanguage : 'zh'
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
  const [donateMethod, setDonateMethod] = useState('wechat')
  const [wechatCopyStatus, setWechatCopyStatus] = useState('')
  const [usageGuideOpen, setUsageGuideOpen] = useState(false)
  const fileInputRef = useRef(null)
  const cliCopyTimerRef = useRef(null)
  const wechatCopyTimerRef = useRef(null)
  const usageGuideTriggerRef = useRef(null)
  const usageGuideCloseRef = useRef(null)
  const tracksRef = useRef([])
  const audioRef = useRef(null)
  const rootRef = useGsapIntro([])
  const messages = I18N[language]
  const currentLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.id === language) || LANGUAGE_OPTIONS[0]
  const nextLanguageOption =
    LANGUAGE_OPTIONS[(LANGUAGE_OPTIONS.indexOf(currentLanguageOption) + 1) % LANGUAGE_OPTIONS.length]

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
      setDonateSectionExpanded(true)
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
          <button
            className="iconButton languageButton"
            type="button"
            onClick={() => setLanguage(nextLanguageOption.id)}
            aria-label={messages.languageToggleLabel(currentLanguageOption.label, nextLanguageOption.label)}
            title={messages.languageToggleLabel(currentLanguageOption.label, nextLanguageOption.label)}
          >
            <Languages size={16} />
            <span>{currentLanguageOption.short}</span>
          </button>
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
              onClick={() => setDonateSectionExpanded((current) => !current)}
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
                <p>{messages.donateDescription}</p>
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
              <nav className="seoLanguageLinks" aria-label="Language versions">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={language === option.id ? 'active' : ''}
                    type="button"
                    lang={option.htmlLang}
                    aria-current={language === option.id ? 'true' : undefined}
                    onClick={() => setLanguage(option.id)}
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
