import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import Toast from '../common/Toast'
import {
  getAdminArtistById,
  getMapElementById,
  updateMapElement,
  uploadMapElementImage,
  getPlayableSongsForDropdown,
  getSongLinesForDropdown,
} from '../../services/adminService'

export default function MapElementFormPage() {
  const { artistId, id } = useParams()
  const aid = Number(artistId)
  const elementId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { backUrl?: string; backState?: unknown } | null
  const backUrl = locationState?.backUrl ?? `/admin/artists/${aid}/map-elements`
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [elementName, setElementName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [url, setUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [xPercent, setXPercent] = useState('')
  const [yPercent, setYPercent] = useState('')
  const [widthPercent, setWidthPercent] = useState('')

  // Song combobox
  const [songSearch, setSongSearch] = useState('')
  const [songDropdownOpen, setSongDropdownOpen] = useState(false)
  const [songId, setSongId] = useState<number | null>(null)
  const [songs, setSongs] = useState<{ id: number; name: string }[]>([])

  // Song line combobox
  const [lineSearch, setLineSearch] = useState('')
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false)
  const [songLineId, setSongLineId] = useState<number | null>(null)
  const [songLines, setSongLines] = useState<{ id: number; line_index: number; text: string }[]>([])

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Map Elements', to: backUrl },
        { label: elementName || 'Edit Element' },
      ])
    })
  }, [aid, setBreadcrumbs, backUrl, elementName])

  useEffect(() => {
    async function load() {
      const [el, songList] = await Promise.all([
        getMapElementById(elementId),
        getPlayableSongsForDropdown(aid),
      ])
      setSongs(songList)
      setElementName(el.name)
      setDisplayName(el.display_name)
      setUrl(el.url)
      setXPercent(el.x_percent.toString())
      setYPercent(el.y_percent.toString())
      setWidthPercent(el.width_percent.toString())
      setSongId(el.song_id)
      setSongLineId(el.song_line_id)

      if (el.song_id !== null) {
        const matchedSong = songList.find((s) => s.id === el.song_id)
        if (matchedSong) setSongSearch(matchedSong.name)

        const lines = await getSongLinesForDropdown(el.song_id)
        setSongLines(lines)
        if (el.song_line_id !== null) {
          const matchedLine = lines.find((l) => l.id === el.song_line_id)
          if (matchedLine) setLineSearch(matchedLine.text)
        }
      }
    }
    load()
  }, [elementId, aid])

  async function handleSongSelect(id: number, name: string) {
    setSongId(id)
    setSongSearch(name)
    setSongDropdownOpen(false)
    setSongLineId(null)
    setLineSearch('')
    setSongLines([])
    const lines = await getSongLinesForDropdown(id)
    setSongLines(lines)
  }

  function handleSongClear() {
    setSongId(null)
    setSongSearch('')
    setSongDropdownOpen(false)
    setSongLineId(null)
    setLineSearch('')
    setSongLines([])
  }

  function handleLineClear() {
    setSongLineId(null)
    setLineSearch('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let finalUrl = url
      if (pendingFile) {
        finalUrl = await uploadMapElementImage(pendingFile, elementName)
      }
      await updateMapElement(elementId, {
        display_name: displayName,
        url: finalUrl,
        x_percent: Number(xPercent),
        y_percent: Number(yPercent),
        width_percent: Number(widthPercent),
        song_id: songId,
        song_line_id: songLineId,
      })
      setToast('Map element saved')
      setTimeout(() => navigate(backUrl, { state: locationState?.backState ?? undefined }), 1000)
    } catch (err) {
      setToast(`Error: ${err instanceof Error ? err.message : 'Failed to save map element'}`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm'

  const filteredSongs = songs.filter((s) =>
    s.name.toLowerCase().includes(songSearch.toLowerCase())
  )

  const filteredLines = songLines.filter((l) =>
    l.text.toLowerCase().includes(lineSearch.toLowerCase())
  )

  const previewUrl = pendingFile ? URL.createObjectURL(pendingFile) : url

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage
        title="Edit Map Element"
        onSubmit={handleSubmit}
        onCancel={() => navigate(backUrl, { state: locationState?.backState ?? undefined })}
        loading={saving}
        backUrl={backUrl}
        backState={locationState?.backState}
      >
        <div className="space-y-5">
          <FormField label="Name">
            <input
              type="text"
              value={elementName}
              readOnly
              className={`${inputClass} opacity-60 cursor-default`}
            />
          </FormField>
          <FormField label="Display Name" required>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className={inputClass}
            />
          </FormField>
          <FormField label="Image (PNG / WebP)">
            <div className="flex items-center gap-3">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="h-16 w-16 object-contain rounded border border-primary/20" />
              )}
              <label className={`${inputClass} cursor-pointer`}>
                {pendingFile ? pendingFile.name : url ? url.split('/').pop() : 'Choose file…'}
                <input
                  type="file"
                  accept="image/png,image/webp"
                  onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              {(pendingFile || url) && (
                <button
                  type="button"
                  onClick={() => { setPendingFile(null); setUrl('') }}
                  title="Remove image"
                  className="text-neutral-400 hover:text-error shrink-0"
                >
                  <Trash2 size={20} className="drop-shadow-md" />
                </button>
              )}
            </div>
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="X %" required>
              <input
                type="number"
                value={xPercent}
                onChange={(e) => setXPercent(e.target.value)}
                required
                step="0.01"
                className={inputClass}
              />
            </FormField>
            <FormField label="Y %" required>
              <input
                type="number"
                value={yPercent}
                onChange={(e) => setYPercent(e.target.value)}
                required
                step="0.01"
                className={inputClass}
              />
            </FormField>
            <FormField label="Width %" required>
              <input
                type="number"
                value={widthPercent}
                onChange={(e) => setWidthPercent(e.target.value)}
                required
                step="0.01"
                className={inputClass}
              />
            </FormField>
          </div>

          {/* Song combobox */}
          <FormField label="Song">
            <div className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={songSearch}
                  onChange={(e) => {
                    setSongSearch(e.target.value)
                    setSongDropdownOpen(true)
                    if (songId !== null) setSongId(null)
                  }}
                  onFocus={() => setSongDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setSongDropdownOpen(false), 150)}
                  placeholder="Search songs…"
                  className={inputClass}
                />
                {songId !== null && (
                  <button
                    type="button"
                    onClick={handleSongClear}
                    title="Clear song"
                    className="text-neutral-400 hover:text-error shrink-0"
                  >
                    <Trash2 size={20} className="drop-shadow-md" />
                  </button>
                )}
              </div>
              {songDropdownOpen && (
                <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border-2 border-primary/30 rounded-lg bg-neutral-50 text-sm shadow-lg">
                  {filteredSongs.length === 0
                    ? <li className="px-3 py-2 text-neutral-500">No results</li>
                    : filteredSongs.map((s) => (
                        <li
                          key={s.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSongSelect(s.id, s.name)}
                          className={`px-3 py-2 cursor-pointer hover:bg-primary/10 ${s.id === songId ? 'bg-primary/10 font-semibold' : ''}`}
                        >
                          {s.name}
                        </li>
                      ))
                  }
                </ul>
              )}
            </div>
          </FormField>

          {/* Song line combobox */}
          <FormField label="Song Line">
            <div className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lineSearch}
                  onChange={(e) => {
                    setLineSearch(e.target.value)
                    setLineDropdownOpen(true)
                    if (songLineId !== null) setSongLineId(null)
                  }}
                  onFocus={() => { if (songId !== null) setLineDropdownOpen(true) }}
                  onBlur={() => setTimeout(() => setLineDropdownOpen(false), 150)}
                  disabled={songId === null}
                  placeholder={songId === null ? 'Select a song first' : 'Search lines…'}
                  className={`${inputClass} ${songId === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {songLineId !== null && (
                  <button
                    type="button"
                    onClick={handleLineClear}
                    title="Clear line"
                    className="text-neutral-400 hover:text-error shrink-0"
                  >
                    <Trash2 size={20} className="drop-shadow-md" />
                  </button>
                )}
              </div>
              {lineDropdownOpen && songId !== null && (
                <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border-2 border-primary/30 rounded-lg bg-neutral-50 text-sm shadow-lg">
                  {filteredLines.length === 0
                    ? <li className="px-3 py-2 text-neutral-500">No results</li>
                    : filteredLines.map((l) => (
                        <li
                          key={l.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSongLineId(l.id)
                            setLineSearch(l.text)
                            setLineDropdownOpen(false)
                          }}
                          className={`px-3 py-2 cursor-pointer hover:bg-primary/10 ${l.id === songLineId ? 'bg-primary/10 font-semibold' : ''}`}
                        >
                          <span className="text-neutral-500 text-xs mr-2">#{l.line_index}</span>
                          {l.text}
                        </li>
                      ))
                  }
                </ul>
              )}
            </div>
          </FormField>
        </div>
      </AdminFormPage>
    </>
  )
}
