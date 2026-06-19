import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import gsap from 'gsap'
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileMusic,
  FolderInput,
  Hourglass,
  Languages,
  Moon,
  Music2,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react'
import { enhancePlaylistWithDeepSeek } from './lib/deepseek.js'
import { convertNcmFile } from './lib/ncm.js'
import {
  formatBytes,
  matchPlaylistToTracks,
  neteaseSearchUrl,
  parsePlaylistText,
  playlistSearchQuery,
  safeFilename,
} from './lib/format.js'

const seedPlaylist = `LAST SUMMER WHISPER - Tanaka Yuri
喜欢 - 张悬
Come Back To Me - Utada
I Will Follow You - Ricky Nelson
Last Summer Whisper - 杏里
Bubble Gum - Clairo
飘雪 - 陈慧娴
Automatic (Remastered 2014) - Utada`

const CONFIRM_MODAL_EXIT_MS = 220
const GITHUB_REPOSITORY_URL = 'https://github.com/yanghaoleng/ncm-studio'

const LANGUAGE_OPTIONS = [
  { id: 'zh', short: '中', label: '中文', htmlLang: 'zh-CN' },
  { id: 'en', short: 'EN', label: 'English', htmlLang: 'en' },
  { id: 'ja', short: '日', label: '日本語', htmlLang: 'ja' },
]

const I18N = {
  zh: {
    appTitle: 'NCM Studio',
    neteaseSearchFallback: '网易云音乐搜索',
    parseBusy: 'AI增强中',
    parseEnhance: 'AI增强解析',
    parseDone: '已完成增强',
    parseDefault: '解析',
    aiEnhanceError: 'AI 增强解析失败',
    downloadUnavailable: '暂无公开直链',
    downloadOfficial: '官方外链',
    downloadPreview: '试听/临时',
    downloadTemp: '临时',
    copyPreparing: '整理中',
    copyDone: '已复制',
    copyButtonDefault: '复制',
    copySongInfo: '【歌曲信息】',
    copySongPages: '【歌曲详情页】',
    copyDownloadLinks: '【外链下载链接】',
    convertError: '转换失败',
    playlistPanelTitle: '粘贴歌单',
    playlistPanelSubtitle: '快速从网易云索引歌曲',
    playlistPlaceholder: '一行一首',
    playlistStatsLabel: '歌单统计',
    tracksUnit: '曲目',
    artistsUnit: '歌手',
    openAll: '全部打开',
    openSearchAria: (query) => `打开网易云搜索：${query}`,
    processingTitle: 'NCM 文件处理',
    chooseDropTitle: '选择或拖入 NCM 文件',
    chooseDropSubtitle: '文件只会在本地处理',
    dropOverlayTitle: '松手继续导入',
    dropOverlaySubtitle: '新文件会自动加入处理队列',
    queueSummary: ({ total, matched, ready, converting }) =>
      `${total} 个文件 · ${matched} 个歌单匹配 · ${ready} 个完成 · ${converting} 个转换中`,
    chooseMore: '继续选择',
    convertAll: '全部转换',
    downloadZip: '打包下载',
    zipping: '打包中',
    readyDownloadSuffix: '个 MP3 可下载',
    zipShort: 'ZIP',
    clearFinished: '清空完成',
    modalTitle: '确定要打开这些页面吗？',
    modalBody: (total) => `将打开 ${total} 个网易云搜索页面。`,
    cancel: '取消',
    modalConfirm: (total) => `打开 ${total} 个页面`,
    matchedPlaylist: (track) =>
      `匹配歌单：${track.playlistTitle}${track.playlistArtist ? ` - ${track.playlistArtist}` : ''}`,
    metadataWaiting: '等待解析元数据',
    previewLabel: '试听预览',
    previewEmptyTitle: '选择一首已完成的歌曲',
    previewEmptySubtitle: '完成转换后可在线播放',
    audioLabel: '歌曲试听播放器，按空格播放或暂停',
    themeToggleLabel: (theme) => (theme === 'light' ? '切换到深色模式' : '切换到浅色模式'),
    languageToggleLabel: (current, next) => `当前语言：${current}。切换到${next}`,
  },
  en: {
    appTitle: 'NCM Studio',
    neteaseSearchFallback: 'NetEase Cloud Music search',
    parseBusy: 'Enhancing',
    parseEnhance: 'AI enhance',
    parseDone: 'Enhanced',
    parseDefault: 'Parse',
    aiEnhanceError: 'AI enhancement failed',
    downloadUnavailable: 'No public direct link',
    downloadOfficial: 'Official external link',
    downloadPreview: 'Preview/temporary',
    downloadTemp: 'Temporary',
    copyPreparing: 'Preparing',
    copyDone: 'Copied',
    copyButtonDefault: 'Copy',
    copySongInfo: '[Track info]',
    copySongPages: '[Song pages]',
    copyDownloadLinks: '[External download links]',
    convertError: 'Conversion failed',
    playlistPanelTitle: 'Paste playlist',
    playlistPanelSubtitle: 'Find tracks on NetEase quickly',
    playlistPlaceholder: 'One song per line',
    playlistStatsLabel: 'Playlist stats',
    tracksUnit: 'tracks',
    artistsUnit: 'artists',
    openAll: 'Open all',
    openSearchAria: (query) => `Open NetEase search: ${query}`,
    processingTitle: 'NCM file processing',
    chooseDropTitle: 'Choose or drop NCM files',
    chooseDropSubtitle: 'Files are processed locally only',
    dropOverlayTitle: 'Release to import',
    dropOverlaySubtitle: 'New files will join the queue',
    queueSummary: ({ total, matched, ready, converting }) =>
      `${total} files · ${matched} playlist matches · ${ready} done · ${converting} converting`,
    chooseMore: 'Choose more',
    convertAll: 'Convert all',
    downloadZip: 'Download ZIP',
    zipping: 'Zipping',
    readyDownloadSuffix: 'MP3 ready',
    zipShort: 'ZIP',
    clearFinished: 'Clear done',
    modalTitle: 'Open these pages?',
    modalBody: (total) => `${total} NetEase search pages will be opened.`,
    cancel: 'Cancel',
    modalConfirm: (total) => `Open ${total} pages`,
    matchedPlaylist: (track) =>
      `Playlist match: ${track.playlistTitle}${track.playlistArtist ? ` - ${track.playlistArtist}` : ''}`,
    metadataWaiting: 'Waiting for metadata',
    previewLabel: 'Preview',
    previewEmptyTitle: 'Select a converted song',
    previewEmptySubtitle: 'Converted tracks can play here',
    audioLabel: 'Track preview player, press Space to play or pause',
    themeToggleLabel: (theme) => (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'),
    languageToggleLabel: (current, next) => `Current language: ${current}. Switch to ${next}`,
  },
  ja: {
    appTitle: 'NCM Studio',
    neteaseSearchFallback: 'NetEase Cloud Music 検索',
    parseBusy: 'AI強化中',
    parseEnhance: 'AI強化解析',
    parseDone: '強化済み',
    parseDefault: '解析',
    aiEnhanceError: 'AI 強化解析に失敗しました',
    downloadUnavailable: '公開直リンクなし',
    downloadOfficial: '公式外部リンク',
    downloadPreview: '試聴/一時',
    downloadTemp: '一時リンク',
    copyPreparing: '整理中',
    copyDone: 'コピー済み',
    copyButtonDefault: 'コピー',
    copySongInfo: '【楽曲情報】',
    copySongPages: '【楽曲ページ】',
    copyDownloadLinks: '【外部ダウンロードリンク】',
    convertError: '変換に失敗しました',
    playlistPanelTitle: 'プレイリスト貼り付け',
    playlistPanelSubtitle: 'NetEase で楽曲をすばやく検索',
    playlistPlaceholder: '1行に1曲',
    playlistStatsLabel: 'プレイリスト統計',
    tracksUnit: '曲',
    artistsUnit: 'アーティスト',
    openAll: 'すべて開く',
    openSearchAria: (query) => `NetEase 検索を開く：${query}`,
    processingTitle: 'NCM ファイル処理',
    chooseDropTitle: 'NCM ファイルを選択またはドロップ',
    chooseDropSubtitle: 'ファイルはローカルでのみ処理されます',
    dropOverlayTitle: '離してインポート',
    dropOverlaySubtitle: '新しいファイルはキューに追加されます',
    queueSummary: ({ total, matched, ready, converting }) =>
      `${total} ファイル · ${matched} 件一致 · ${ready} 件完了 · ${converting} 件変換中`,
    chooseMore: '追加選択',
    convertAll: 'すべて変換',
    downloadZip: 'ZIP ダウンロード',
    zipping: '圧縮中',
    readyDownloadSuffix: '個の MP3 がダウンロード可能',
    zipShort: 'ZIP',
    clearFinished: '完了をクリア',
    modalTitle: 'これらのページを開きますか？',
    modalBody: (total) => `${total} 個の NetEase 検索ページを開きます。`,
    cancel: 'キャンセル',
    modalConfirm: (total) => `${total} ページを開く`,
    matchedPlaylist: (track) =>
      `プレイリスト一致：${track.playlistTitle}${track.playlistArtist ? ` - ${track.playlistArtist}` : ''}`,
    metadataWaiting: 'メタデータ解析待ち',
    previewLabel: '試聴プレビュー',
    previewEmptyTitle: '変換済みの曲を選択',
    previewEmptySubtitle: '変換後ここで再生できます',
    audioLabel: '楽曲プレビュープレイヤー。スペースで再生/一時停止',
    themeToggleLabel: (theme) => (theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'),
    languageToggleLabel: (current, next) => `現在の言語：${current}。${next}に切り替え`,
  },
}

function playlistDetailText(item, messages) {
  return [item.artist, item.album].filter(Boolean).join(' · ') || messages.neteaseSearchFallback
}

function playlistCopyInfo(item) {
  return [item?.title, item?.artist, item?.album].filter(Boolean).join(' - ').trim()
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

function App() {
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('zh')
  const [playlistText, setPlaylistText] = useState(seedPlaylist)
  const [playlistItems, setPlaylistItems] = useState([])
  const [tracks, setTracks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [copyState, setCopyState] = useState('')
  const [lastParsedText, setLastParsedText] = useState('')
  const [aiEnhancedText, setAiEnhancedText] = useState('')
  const [isAiEnhancing, setIsAiEnhancing] = useState(false)
  const [aiParseError, setAiParseError] = useState('')
  const [openedSearchIds, setOpenedSearchIds] = useState(() => new Set())
  const [isOpenAllConfirmOpen, setIsOpenAllConfirmOpen] = useState(false)
  const [isOpenAllConfirmClosing, setIsOpenAllConfirmClosing] = useState(false)
  const fileInputRef = useRef(null)
  const confirmPrimaryButtonRef = useRef(null)
  const confirmCloseTimerRef = useRef(null)
  const confirmStateRef = useRef({ open: false, closing: false })
  const tracksRef = useRef([])
  const audioRef = useRef(null)
  const rootRef = useGsapIntro([])
  const messages = I18N[language]
  const currentLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.id === language) || LANGUAGE_OPTIONS[0]
  const nextLanguageOption =
    LANGUAGE_OPTIONS[(LANGUAGE_OPTIONS.indexOf(currentLanguageOption) + 1) % LANGUAGE_OPTIONS.length]

  const matchState = useMemo(
    () => matchPlaylistToTracks(playlistItems, tracks),
    [playlistItems, tracks],
  )

  const displayPlaylistItems = matchState.items
  const displayTracks = matchState.tracks
  const matchedPlaylistCount = matchState.matchedCount
  const searchRows = displayPlaylistItems
  const currentPlaylistTextKey = playlistText.trim().replace(/\r\n/g, '\n')
  const hasParsedCurrentPlaylist =
    !!currentPlaylistTextKey && lastParsedText === currentPlaylistTextKey && !!playlistItems.length
  const canAiEnhancePlaylist = hasParsedCurrentPlaylist && aiEnhancedText !== currentPlaylistTextKey
  const aiEnhanceComplete = hasParsedCurrentPlaylist && aiEnhancedText === currentPlaylistTextKey
  const ParseButtonIcon = isAiEnhancing ? Hourglass : canAiEnhancePlaylist ? Sparkles : Wand2
  const parseButtonLabel = isAiEnhancing
    ? messages.parseBusy
    : canAiEnhancePlaylist
      ? messages.parseEnhance
      : aiEnhanceComplete
        ? messages.parseDone
        : messages.parseDefault
  const playlistStats = useMemo(() => {
    const artists = new Set()

    searchRows.forEach((item) => {
      const artist = String(item.artist || '').trim().toLocaleLowerCase()
      if (artist) artists.add(artist)
    })

    return {
      total: searchRows.length,
      artists: artists.size,
    }
  }, [searchRows])

  const selectedTrack = useMemo(
    () =>
      displayTracks.find((track) => track.id === selectedId) ||
      displayTracks.find((track) => track.status === 'ready') ||
      displayTracks[0],
    [selectedId, displayTracks],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = currentLanguageOption.htmlLang
  }, [currentLanguageOption.htmlLang])

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    function handlePlayerShortcut(event) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code !== 'Space' && event.key !== ' ') return
      if (confirmStateRef.current.open) return

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
    confirmStateRef.current = {
      open: isOpenAllConfirmOpen,
      closing: isOpenAllConfirmClosing,
    }
  }, [isOpenAllConfirmOpen, isOpenAllConfirmClosing])

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((track) => {
        if (track.audioUrl) URL.revokeObjectURL(track.audioUrl)
        if (track.coverUrl) URL.revokeObjectURL(track.coverUrl)
      })
    }
  }, [])

  const closeOpenAllConfirm = useCallback(() => {
    const { open, closing } = confirmStateRef.current
    if (!open || closing) return

    confirmStateRef.current = { open: true, closing: true }
    setIsOpenAllConfirmClosing(true)
    window.clearTimeout(confirmCloseTimerRef.current)
    confirmCloseTimerRef.current = window.setTimeout(() => {
      confirmStateRef.current = { open: false, closing: false }
      setIsOpenAllConfirmOpen(false)
      setIsOpenAllConfirmClosing(false)
    }, CONFIRM_MODAL_EXIT_MS)
  }, [])

  useEffect(() => {
    if (!isOpenAllConfirmOpen) return undefined

    window.clearTimeout(confirmCloseTimerRef.current)
    confirmStateRef.current = { open: true, closing: false }
    setIsOpenAllConfirmClosing(false)
    window.setTimeout(() => confirmPrimaryButtonRef.current?.focus(), 0)

    function closeOnEscape(event) {
      if (event.key === 'Escape') closeOpenAllConfirm()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpenAllConfirmOpen, closeOpenAllConfirm])

  useEffect(() => {
    return () => window.clearTimeout(confirmCloseTimerRef.current)
  }, [])

  function animatePress(event) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(
      event.currentTarget,
      { y: 0, scale: 1 },
      { y: -3, scale: 0.985, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' },
    )
  }

  function openOpenAllConfirm() {
    window.clearTimeout(confirmCloseTimerRef.current)
    confirmStateRef.current = { open: true, closing: false }
    setIsOpenAllConfirmClosing(false)
    setIsOpenAllConfirmOpen(true)
  }

  function focusSearchRow(index) {
    const rows = Array.from(document.querySelectorAll('.searchResultRow'))
    const nextRow = rows[index]
    if (nextRow instanceof HTMLElement) nextRow.focus()
  }

  function handleSearchResultsKeyDown(event) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return

    const rows = Array.from(document.querySelectorAll('.searchResultRow'))
    if (!rows.length) return

    const currentIndex = rows.indexOf(document.activeElement)
    if (currentIndex === -1) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'Home') {
        event.preventDefault()
        focusSearchRow(0)
      }
      return
    }

    event.preventDefault()

    if (event.key === 'Home') {
      focusSearchRow(0)
      return
    }

    if (event.key === 'End') {
      focusSearchRow(rows.length - 1)
      return
    }

    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + direction + rows.length) % rows.length
    focusSearchRow(nextIndex)
  }

  function handleParseButtonKeyDown(event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    animatePress(event)
    handleParseClick()
  }

  function handleConfirmDialogKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeOpenAllConfirm()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      openAllSearchResults()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(
      event.currentTarget.querySelectorAll('button:not(:disabled)'),
    )
    if (!focusable.length) return

    const currentIndex = focusable.indexOf(document.activeElement)
    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + focusable.length) % focusable.length
      : (currentIndex + 1) % focusable.length

    event.preventDefault()
    focusable[nextIndex].focus()
  }

  function parsePlaylist() {
    const items = parsePlaylistText(playlistText)
    setPlaylistItems(items)
    setLastParsedText(currentPlaylistTextKey)
    setOpenedSearchIds(new Set())
    closeOpenAllConfirm()
    setAiParseError('')
  }

  function handlePlaylistTextChange(value) {
    setPlaylistText(value)
    setPlaylistItems([])
    setLastParsedText('')
    setAiEnhancedText('')
    setOpenedSearchIds(new Set())
    closeOpenAllConfirm()
    setAiParseError('')
  }

  async function enhancePlaylist() {
    if (!canAiEnhancePlaylist) return
    setIsAiEnhancing(true)
    setAiParseError('')

    try {
      const firstPassItems = playlistItems.length ? playlistItems : parsePlaylistText(playlistText)
      const items = await enhancePlaylistWithDeepSeek(playlistText, firstPassItems)
      setPlaylistItems(items)
      setLastParsedText(currentPlaylistTextKey)
      setAiEnhancedText(currentPlaylistTextKey)
      setOpenedSearchIds(new Set())
      closeOpenAllConfirm()
    } catch (error) {
      setAiParseError(error.message || messages.aiEnhanceError)
    } finally {
      setIsAiEnhancing(false)
    }
  }

  function handleParseClick() {
    if (canAiEnhancePlaylist) {
      enhancePlaylist()
      return
    }

    parsePlaylist()
  }

  function openNeteaseSearch(item) {
    setOpenedSearchIds((current) => {
      if (current.has(item.id)) return current
      const next = new Set(current)
      next.add(item.id)
      return next
    })
    window.open(neteaseSearchUrl(item), '_blank', 'noopener,noreferrer')
  }

  function openAllSearchResults() {
    if (!searchRows.length) return

    setOpenedSearchIds((current) => {
      const next = new Set(current)
      searchRows.forEach((item) => next.add(item.id))
      return next
    })
    closeOpenAllConfirm()
    searchRows.forEach((item) => {
      window.open(neteaseSearchUrl(item), '_blank', 'noopener,noreferrer')
    })
  }

  async function resolveFirstSongLinks(items) {
    const fallbackRows = items.map((item) => ({
      item,
      songLink: neteaseSearchUrl(item),
      downloadLink: '',
      downloadNote: messages.downloadUnavailable,
    }))

    try {
      const response = await fetch('/api/netease-first-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: items.map(({ title, artist, album }) => ({ title, artist, album })),
        }),
      })

      if (!response.ok) return fallbackRows

      const data = await response.json()
      const results = Array.isArray(data?.results) ? data.results : []

      return fallbackRows.map((row, index) => ({
        ...row,
        songLink: results[index]?.songUrl || row.songLink,
        downloadLink: results[index]?.downloadUrl || '',
        downloadNote: results[index]?.downloadIsOuterFallback
          ? messages.downloadOfficial
          : results[index]?.downloadIsPreview
            ? messages.downloadPreview
            : results[index]?.downloadUrl
              ? messages.downloadTemp
              : row.downloadNote,
      }))
    } catch {
      return fallbackRows
    }
  }

  async function copyImportPlan() {
    const items = searchRows.length ? searchRows : parsePlaylistText(playlistText)
    setCopyState('preparing')

    const rows = await resolveFirstSongLinks(items)
    const songInfoBlock = rows
      .map(({ item }) => playlistCopyInfo(item))
      .join('\n')
    const songPageBlock = rows
      .map(({ item, songLink }) => `${playlistCopyInfo(item)}\n${songLink}`)
      .join('\n')
    const downloadLinkBlock = rows
      .map(({ downloadLink, downloadNote }) => downloadLink || downloadNote)
      .join('\n')
    const text = [
      messages.copySongInfo,
      songInfoBlock,
      '',
      messages.copySongPages,
      songPageBlock,
      '',
      messages.copyDownloadLinks,
      downloadLinkBlock,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopyState('done')
    setTimeout(() => setCopyState(''), 1600)
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
      const result = await convertNcmFile(track.file, { enrichTags: true })
      clearInterval(pulse)
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
    const files = Array.from(fileList || []).filter((file) => /\.ncm$/i.test(file.name))
    if (!files.length) return

    const nextTracks = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      title: file.name.replace(/\.ncm$/i, ''),
      artist: '',
      album: '',
      status: 'queued',
      progress: 0,
      sourceSize: file.size,
    }))

    if (!playlistItems.length && playlistText.trim()) {
      setPlaylistItems(parsePlaylistText(playlistText))
    }

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
    const zip = new JSZip()
    readyTracks.forEach((track) => {
      zip.file(track.filename || `${safeFilename(track.title)}.mp3`, track.audioBlob)
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `ncm-studio-${readyTracks.length}-tracks.zip`)
    setIsZipping(false)
  }

  function convertAll() {
    tracks
      .filter((track) => ['queued', 'error'].includes(track.status))
      .forEach((track, index) => setTimeout(() => convertTrack(track, { select: index === 0 }), index * 260))
  }

  const readyCount = tracks.filter((track) => track.status === 'ready').length
  const convertingCount = tracks.filter((track) => track.status === 'converting').length

  return (
    <div className="app" ref={rootRef}>
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
        <section className="leftRail">
          <Panel
            icon={FolderInput}
            title={messages.playlistPanelTitle}
            subtitle={messages.playlistPanelSubtitle}
            accent="blue"
          >
            <textarea
              className="playlistInput"
              value={playlistText}
              onChange={(event) => handlePlaylistTextChange(event.target.value)}
              placeholder={messages.playlistPlaceholder}
            />
            <div className="panelActions playlistActions">
              <button
                className="primaryButton solidCycle"
                type="button"
                onClick={(event) => { animatePress(event); handleParseClick() }}
                onKeyDown={handleParseButtonKeyDown}
                aria-keyshortcuts="Enter"
                disabled={isAiEnhancing || aiEnhanceComplete || !currentPlaylistTextKey}
              >
                <ParseButtonIcon size={18} className={isAiEnhancing ? 'hourglassTurn' : ''} />
                {parseButtonLabel}
              </button>
            </div>
            {aiParseError && <div className="parseAlert">{aiParseError}</div>}
            {!!searchRows.length && (
              <div className="searchResults" onKeyDown={handleSearchResultsKeyDown}>
                <div className="searchResultFooter">
                  <div className="searchResultStats" aria-label={messages.playlistStatsLabel}>
                    <span><strong>{playlistStats.total}</strong> {messages.tracksUnit}</span>
                    <span><strong>{playlistStats.artists}</strong> {messages.artistsUnit}</span>
                  </div>
                  <div className="searchResultFooterActions">
                    <button className="secondaryButton compactCopyButton" type="button" onClick={(event) => { animatePress(event); copyImportPlan() }}>
                      <ClipboardList size={17} />
                      {copyState === 'preparing'
                        ? messages.copyPreparing
                        : copyState === 'done'
                          ? messages.copyDone
                          : messages.copyButtonDefault}
                    </button>
                    <button
                      className="secondaryButton openAllButton"
                      type="button"
                      onClick={(event) => { animatePress(event); openOpenAllConfirm() }}
                    >
                      <ExternalLink size={16} />
                      {messages.openAll}
                    </button>
                  </div>
                </div>
                {searchRows.map((item) => {
                  const hasOpened = openedSearchIds.has(item.id)
                  const RowIcon = hasOpened ? CheckCircle2 : Search

                  return (
                    <button
                      className={`searchResultRow ${hasOpened ? 'searched' : ''}`}
                      key={item.id}
                      type="button"
                      aria-label={messages.openSearchAria(playlistSearchQuery(item))}
                      onClick={(event) => { animatePress(event); openNeteaseSearch(item) }}
                    >
                      <RowIcon size={16} />
                      <span>
                        <strong>{item.title}</strong>
                        <em>{playlistDetailText(item, messages)}</em>
                      </span>
                      <ExternalLink size={14} />
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>

        </section>

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
            accept=".ncm"
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
                  <p>
                    {messages.queueSummary({
                      total: tracks.length,
                      matched: matchedPlaylistCount,
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
                  <button className="secondaryButton" type="button" onClick={convertAll} disabled={!tracks.some((track) => ['queued', 'error'].includes(track.status))}>
                    <RefreshCw size={17} />
                    {messages.convertAll}
                  </button>
                  <button className="primaryButton" type="button" onClick={downloadZip} disabled={!readyCount || isZipping}>
                    <Archive size={17} />
                    {isZipping ? messages.zipping : messages.downloadZip}
                  </button>
                </div>
              </div>

              <div className="queueTable">
                {displayTracks.map((track, index) => (
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
      </main>

      <footer className="siteFooter" data-enter>
        <a
          className="githubFooterLink"
          href={GITHUB_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
        >
          <span>GitHub</span>
          <ExternalLink size={14} />
        </a>
      </footer>

      {!!tracks.length && (
        <div className="bottomBar" data-enter>
          <div>
            <strong>{readyCount}</strong>
            <span>{messages.readyDownloadSuffix}</span>
          </div>
          <button type="button" onClick={convertAll} disabled={!tracks.some((track) => ['queued', 'error'].includes(track.status))}>
            <Sparkles size={17} />
            {messages.convertAll}
          </button>
          <button type="button" onClick={downloadZip} disabled={!readyCount || isZipping}>
            <Archive size={17} />
            {messages.zipShort}
          </button>
          <button type="button" onClick={clearFinished} disabled={!readyCount}>
            <Trash2 size={17} />
            {messages.clearFinished}
          </button>
        </div>
      )}

      {isOpenAllConfirmOpen && !!searchRows.length && (
        <div
          className={`modalBackdrop ${isOpenAllConfirmClosing ? 'isClosing' : ''}`}
          role="presentation"
          onClick={closeOpenAllConfirm}
        >
          <div
            className="confirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="openAllSearchTitle"
            onKeyDown={handleConfirmDialogKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="openAllSearchTitle">{messages.modalTitle}</h2>
            <p>{messages.modalBody(playlistStats.total)}</p>
            <div className="confirmActions">
              <button className="secondaryButton" type="button" onClick={closeOpenAllConfirm}>
                {messages.cancel}
              </button>
              <button ref={confirmPrimaryButtonRef} className="primaryButton" type="button" onClick={openAllSearchResults}>
                <ExternalLink size={17} />
                {messages.modalConfirm(playlistStats.total)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({ icon: Icon, title, subtitle, accent, children }) {
  return (
    <article className={`panel accent-${accent}`} data-enter>
      <div className="panelHead">
        <div className="panelIcon">
          {createElement(Icon, { size: 20 })}
        </div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  )
}

function TrackRow({ track, index, selected, onSelect, onConvert, onDownload, onRemove, messages }) {
  const canDownload = track.status === 'ready' && track.audioBlob

  return (
    <div
      className={`trackRow ${selected ? 'selected' : ''} ${track.playlistItemId ? 'playlistMatched' : ''}`}
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
        <span>
          {track.playlistItemId
            ? messages.matchedPlaylist(track)
            : track.artist || track.album || track.file?.name || messages.metadataWaiting}
        </span>
        {track.status === 'error' && <em>{track.error}</em>}
      </div>
      <div className="formatCell">
        <span>{track.extension?.toUpperCase() || 'MP3'}</span>
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
