import { useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import gsap from 'gsap'
import {
  Archive,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileMusic,
  Languages,
  Moon,
  Music2,
  RefreshCw,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
} from 'lucide-react'
import { convertNcmFile } from './lib/ncm.js'
import { formatBytes, safeFilename } from './lib/format.js'
import { buildTracksZip, calculateCrc32 } from './lib/zip.js'

const GITHUB_REPOSITORY_URL = 'https://github.com/yanghaoleng/ncm-studio'
const FEEDBACK_IMESSAGE_URL = 'imessage://yanghaoleng@icloud.com'
const NETEASE_PLAYLIST_IMPORT_URL = 'https://music.163.com/st/ncmcli#setup'
const NPM_PACKAGE_URL = 'https://www.npmjs.com/package/ncm-studio-cli'

const LANGUAGE_OPTIONS = [
  { id: 'zh', short: '中', label: '中文', htmlLang: 'zh-CN' },
  { id: 'en', short: 'EN', label: 'English', htmlLang: 'en' },
  { id: 'ja', short: '日', label: '日本語', htmlLang: 'ja' },
]

const I18N = {
  zh: {
    appTitle: 'NCM Studio',
    convertError: '转换失败',
    processingTitle: 'NCM文件转MP3',
    chooseDropTitle: '选择或拖入 NCM 文件',
    chooseDropSubtitle: '文件只会在本地处理',
    dropOverlayTitle: '松手继续导入',
    dropOverlaySubtitle: '新文件会自动加入处理队列',
    queueSummary: ({ total, ready, converting }) =>
      `${total} 个文件 · ${ready} 个完成 · ${converting} 个转换中`,
    chooseMore: '继续选择',
    convertAll: '全部转换',
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
    platformImportNote: '其他音乐平台推荐使用网易官方歌单导入工具或者cli来快速创建歌单',
    platformImportLinkAria: '打开网易云官方歌单导入工具和 CLI 使用说明',
    localCliTitle: '安装CLI让AI帮你处理',
    localCliSummary: '复制链接给到本地的AI，可以直接处理本地ncm文件',
    localCliLinkLabel: '安装链接',
    localCliLinkAria: '复制 ncm-studio-cli 的 npm 安装链接',
    cliLinkCopied: '复制成功',
    cliLinkCopyFailed: '复制失败',
    githubLinkLabel: 'GitHub 仓库',
    feedbackLinkLabel: '提交反馈',
    feedbackLinkAria: '通过 iMessage 提交反馈',
    themeToggleLabel: (theme) => (theme === 'light' ? '切换到深色模式' : '切换到浅色模式'),
    languageToggleLabel: (current, next) => `当前语言：${current}。切换到${next}`,
  },
  en: {
    appTitle: 'NCM Studio',
    convertError: 'Conversion failed',
    processingTitle: 'NCM to MP3',
    chooseDropTitle: 'Choose or drop NCM files',
    chooseDropSubtitle: 'Files are processed locally only',
    dropOverlayTitle: 'Release to import',
    dropOverlaySubtitle: 'New files will join the queue',
    queueSummary: ({ total, ready, converting }) =>
      `${total} files · ${ready} done · ${converting} converting`,
    chooseMore: 'Choose more',
    convertAll: 'Convert all',
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
    platformImportNote: 'For other music platforms, use the official NetEase playlist import tool or CLI to quickly create playlists.',
    platformImportLinkAria: 'Open the official NetEase playlist import tool and CLI guide',
    localCliTitle: 'Install CLI for AI processing',
    localCliSummary: 'Copy this link to a local AI so it can process local NCM files directly.',
    localCliLinkLabel: 'Install link',
    localCliLinkAria: 'Copy the ncm-studio-cli npm package link',
    cliLinkCopied: 'Copied',
    cliLinkCopyFailed: 'Copy failed',
    githubLinkLabel: 'GitHub repository',
    feedbackLinkLabel: 'Feedback',
    feedbackLinkAria: 'Send feedback with iMessage',
    themeToggleLabel: (theme) => (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'),
    languageToggleLabel: (current, next) => `Current language: ${current}. Switch to ${next}`,
  },
  ja: {
    appTitle: 'NCM Studio',
    convertError: '変換に失敗しました',
    processingTitle: 'NCM から MP3 へ',
    chooseDropTitle: 'NCM ファイルを選択またはドロップ',
    chooseDropSubtitle: 'ファイルはローカルでのみ処理されます',
    dropOverlayTitle: '離してインポート',
    dropOverlaySubtitle: '新しいファイルはキューに追加されます',
    queueSummary: ({ total, ready, converting }) =>
      `${total} ファイル · ${ready} 件完了 · ${converting} 件変換中`,
    chooseMore: '追加選択',
    convertAll: 'すべて変換',
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
    platformImportNote: '他の音楽プラットフォームでは、NetEase 公式のプレイリストインポートツールまたは CLI でプレイリストをすばやく作成できます。',
    platformImportLinkAria: 'NetEase 公式プレイリストインポートツールと CLI のガイドを開く',
    localCliTitle: 'CLI を入れて AI で処理',
    localCliSummary: 'このリンクをローカル AI に渡すと、ローカル NCM ファイルを直接処理できます。',
    localCliLinkLabel: 'インストールリンク',
    localCliLinkAria: 'ncm-studio-cli の npm インストールリンクをコピー',
    cliLinkCopied: 'コピー完了',
    cliLinkCopyFailed: 'コピー失敗',
    githubLinkLabel: 'GitHub リポジトリ',
    feedbackLinkLabel: 'フィードバック',
    feedbackLinkAria: 'iMessage でフィードバックを送信',
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

function App() {
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('zh')
  const [tracks, setTracks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const [zipFeedback, setZipFeedback] = useState(null)
  const [cliCopyStatus, setCliCopyStatus] = useState('')
  const fileInputRef = useRef(null)
  const cliCopyTimerRef = useRef(null)
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
    tracksRef.current = tracks
  }, [tracks])

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
    } catch (error) {
      console.error('Failed to build ZIP archive', error)
      setZipFeedback({ type: 'error', message: messages.zipFailed })
    } finally {
      setIsZipping(false)
    }
  }

  function convertAll() {
    tracks
      .filter((track) => ['queued', 'error'].includes(track.status))
      .forEach((track, index) => setTimeout(() => convertTrack(track, { select: index === 0 }), index * 260))
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
                  <PlatformImportNote messages={messages} />
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
                  <PlatformImportNote messages={messages} />
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
                  <button className="secondaryButton" type="button" onClick={convertAll} disabled={!tracks.some((track) => ['queued', 'error'].includes(track.status))}>
                    <RefreshCw size={17} />
                    {messages.convertAll}
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
          <div className="cliInstallHeading">
            <span className="cliInstallIcon" aria-hidden="true">
              <Terminal size={18} />
            </span>
            <h2>{messages.localCliTitle}</h2>
          </div>
          <p>{messages.localCliSummary}</p>
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
        </aside>

      </main>

      <footer className="siteFooter" data-enter>
        <a
          className="footerTextLink"
          href={GITHUB_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={messages.githubLinkLabel}
        >
          <span>GitHub</span>
          <ExternalLink size={14} />
        </a>
        <a
          className="footerTextLink"
          href={FEEDBACK_IMESSAGE_URL}
          aria-label={messages.feedbackLinkAria}
        >
          <span>{messages.feedbackLinkLabel}</span>
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

    </div>
  )
}

function PlatformImportNote({ messages }) {
  return (
    <p className="platformImportNote">
      <a
        href={NETEASE_PLAYLIST_IMPORT_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={messages.platformImportLinkAria}
      >
        <span>{messages.platformImportNote}</span>
        <ExternalLink size={13} />
      </a>
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
