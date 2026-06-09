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

function playlistDetailText(item) {
  return [item.artist, item.album].filter(Boolean).join(' · ') || '网易云音乐搜索'
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
  const rootRef = useGsapIntro([])

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
    ? 'AI增强中'
    : canAiEnhancePlaylist
      ? 'AI增强解析'
      : aiEnhanceComplete
        ? '已完成增强'
        : '解析'
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
    tracksRef.current = tracks
  }, [tracks])

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
      setAiParseError(error.message || 'AI 增强解析失败')
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
      downloadNote: '暂无公开直链',
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
          ? '官方外链'
          : results[index]?.downloadIsPreview
            ? '试听/临时'
            : results[index]?.downloadUrl
              ? '临时'
              : row.downloadNote,
      }))
    } catch {
      return fallbackRows
    }
  }

  async function copyImportPlan() {
    const items = searchRows.length ? searchRows : parsePlaylistText(playlistText)
    setCopyState('整理中')

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
      '【歌曲信息】',
      songInfoBlock,
      '',
      '【歌曲详情页】',
      songPageBlock,
      '',
      '【外链下载链接】',
      downloadLinkBlock,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopyState('已复制')
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
            ? { ...item, status: 'error', progress: 0, error: error.message || '转换失败' }
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
              <h1>NCM Studio</h1>
            </div>
          </div>

        <div className="topbarActions">
          <button className="iconButton" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="leftRail">
          <Panel
            icon={FolderInput}
            title="粘贴歌单"
            subtitle="快速从网易云索引歌曲"
            accent="blue"
          >
            <textarea
              className="playlistInput"
              value={playlistText}
              onChange={(event) => handlePlaylistTextChange(event.target.value)}
              placeholder="一行一首"
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
                  <div className="searchResultStats" aria-label="歌单统计">
                    <span><strong>{playlistStats.total}</strong> 曲目</span>
                    <span><strong>{playlistStats.artists}</strong> 歌手</span>
                  </div>
                  <div className="searchResultFooterActions">
                    <button className="secondaryButton compactCopyButton" type="button" onClick={(event) => { animatePress(event); copyImportPlan() }}>
                      <ClipboardList size={17} />
                      {copyState || '复制'}
                    </button>
                    <button
                      className="secondaryButton openAllButton"
                      type="button"
                      onClick={(event) => { animatePress(event); openOpenAllConfirm() }}
                    >
                      <ExternalLink size={16} />
                      全部打开
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
                      aria-label={`打开网易云搜索：${playlistSearchQuery(item)}`}
                      onClick={(event) => { animatePress(event); openNeteaseSearch(item) }}
                    >
                      <RowIcon size={16} />
                      <span>
                        <strong>{item.title}</strong>
                        <em>{playlistDetailText(item)}</em>
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
                  <h2>NCM 文件处理</h2>
                </div>
              </div>

              <button
                className={`dropzone heroDropzone ${isDragging ? 'isDragging' : ''}`}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={34} />
                <strong>选择或拖入 NCM 文件</strong>
                <span>文件只会在本地处理</span>
              </button>
            </div>
          ) : (
            <>
              {isDragging && (
                <div className="dropOverlay">
                  <UploadCloud size={34} />
                  <strong>松手继续导入</strong>
                  <span>新文件会自动加入处理队列</span>
                </div>
              )}

              <div className="queueHeader">
                <div>
                  <h2>NCM 文件处理</h2>
                  <p>
                    {`${tracks.length} 个文件 · ${matchedPlaylistCount} 个歌单匹配 · ${readyCount} 个完成 · ${convertingCount} 个转换中`}
                  </p>
                </div>
                <div className="queueControls">
                  <button className="secondaryButton" type="button" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud size={17} />
                    继续选择
                  </button>
                  <button className="secondaryButton" type="button" onClick={convertAll} disabled={!tracks.some((track) => ['queued', 'error'].includes(track.status))}>
                    <RefreshCw size={17} />
                    全部转换
                  </button>
                  <button className="primaryButton" type="button" onClick={downloadZip} disabled={!readyCount || isZipping}>
                    <Archive size={17} />
                    {isZipping ? '打包中' : '打包下载'}
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
                  />
                ))}
              </div>

              <PreviewPane
                track={selectedTrack}
              />
            </>
          )}
        </section>
      </main>

      {!!tracks.length && (
        <div className="bottomBar" data-enter>
          <div>
            <strong>{readyCount}</strong>
            <span>个 MP3 可下载</span>
          </div>
          <button type="button" onClick={convertAll} disabled={!tracks.some((track) => ['queued', 'error'].includes(track.status))}>
            <Sparkles size={17} />
            全部转换
          </button>
          <button type="button" onClick={downloadZip} disabled={!readyCount || isZipping}>
            <Archive size={17} />
            ZIP
          </button>
          <button type="button" onClick={clearFinished} disabled={!readyCount}>
            <Trash2 size={17} />
            清空完成
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
            <h2 id="openAllSearchTitle">确定要打开这些页面吗？</h2>
            <p>{`将打开 ${playlistStats.total} 个网易云搜索页面。`}</p>
            <div className="confirmActions">
              <button className="secondaryButton" type="button" onClick={closeOpenAllConfirm}>
                取消
              </button>
              <button ref={confirmPrimaryButtonRef} className="primaryButton" type="button" onClick={openAllSearchResults}>
                <ExternalLink size={17} />
                {`打开 ${playlistStats.total} 个页面`}
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

function TrackRow({ track, index, selected, onSelect, onConvert, onDownload, onRemove }) {
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
            ? `匹配歌单：${track.playlistTitle}${track.playlistArtist ? ` - ${track.playlistArtist}` : ''}`
            : track.artist || track.album || track.file?.name || '等待解析元数据'}
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

function PreviewPane({ track }) {
  return (
    <aside className="previewPane">
      <div className="cover">
        {track?.coverUrl ? <img src={track.coverUrl} alt="" /> : <Music2 size={42} />}
      </div>
      <div className="previewMeta">
        <span>试听预览</span>
        <strong>{track?.title || '选择一首已完成的歌曲'}</strong>
        <p>{track?.artist || track?.album || '完成转换后可在线播放'}</p>
      </div>
      <div className="playerControls">
        {track?.audioUrl ? <audio src={track.audioUrl} controls /> : <audio controls />}
      </div>
    </aside>
  )
}

export default App
