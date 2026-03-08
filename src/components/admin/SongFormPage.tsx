import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import Toast from '../common/Toast'
import ConfirmPopup from '../common/ConfirmPopup'
import {
  getAdminSongById,
  getAdminArtistById,
  getAlbumsForDropdown,
  getAdminLevels,
  createSong,
  updateSong,
  toggleSongSelectable,
} from '../../services/adminService'

export default function SongFormPage() {
  const { artistId, id } = useParams()
  const aid = Number(artistId)
  const isEdit = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { backState?: unknown } | null
  const [searchParams] = useSearchParams()
  const songsUrl = `/admin/artists/${aid}/songs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [name, setName] = useState('')
  const [geniusSongId, setGeniusSongId] = useState('')
  const [albumId, setAlbumId] = useState<string>('')
  const [trackNumber, setTrackNumber] = useState('')
  const [difficultyRank, setDifficultyRank] = useState('')
  const [featuredArtists, setFeaturedArtists] = useState('')
  const [fullLyrics, setFullLyrics] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [failureMessage, setFailureMessage] = useState('')
  const [albums, setAlbums] = useState<{ id: number; name: string }[]>([])
  const [difficultyRankOptions, setDifficultyRankOptions] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isSelectable, setIsSelectable] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const [artistName, setArtistName] = useState('')

  useEffect(() => {
    getAdminArtistById(aid).then((a) => setArtistName(a.name))
  }, [aid])

  useEffect(() => {
    if (!artistName) return
    const albumParam = searchParams.get('album')
    const albumName = albumParam && albumParam !== 'none'
      ? albums.find((a) => a.id === Number(albumParam))?.name
      : null
    setBreadcrumbs([
      { label: 'Artists', to: '/admin' },
      { label: artistName },
      { label: 'Albums', to: `/admin/artists/${aid}/albums` },
      ...(albumName ? [{ label: albumName }] : []),
      { label: 'Songs', to: songsUrl },
      { label: isEdit ? 'Edit Song' : 'Add Song' },
    ])
  }, [aid, artistName, albums, searchParams, setBreadcrumbs, isEdit, songsUrl])

  useEffect(() => {
    getAlbumsForDropdown(aid).then(setAlbums)
  }, [aid])

  useEffect(() => {
    getAdminLevels(aid).then((levels) => {
      const distinct = [...new Set(levels.map((l) => l.max_difficulty_rank))].sort((a, b) => a - b)
      setDifficultyRankOptions(distinct)
    })
  }, [aid])

  useEffect(() => {
    if (isEdit) {
      getAdminSongById(Number(id)).then((s) => {
        setName(s.name)
        setGeniusSongId(s.genius_song_id?.toString() ?? '')
        setAlbumId(s.album_id?.toString() ?? '')
        setTrackNumber(s.track_number?.toString() ?? '')
        setDifficultyRank(s.difficulty_rank?.toString() ?? '')
        setFeaturedArtists(s.featured_artists?.join(', ') ?? '')
        setFullLyrics(s.lyrics_full_text ?? '')
        setSuccessMessage(s.success_message ?? '')
        setFailureMessage(s.failure_message ?? '')
        setIsSelectable(s.is_selectable ?? false)
      })
    }
  }, [id, isEdit])

  function buildFormData() {
    return {
      artist_id: aid,
      name,
      genius_song_id: geniusSongId ? Number(geniusSongId) : null,
      album_id: albumId ? Number(albumId) : null,
      track_number: Number(trackNumber),
      difficulty_rank: Number(difficultyRank),
      featured_artists: featuredArtists
        ? featuredArtists.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      lyrics_full_text: fullLyrics || null,
      success_message: successMessage || null,
      failure_message: failureMessage || null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = buildFormData()
    // If editing a selectable song and removing the album, confirm first
    if (isEdit && isSelectable && !data.album_id) {
      setShowDisableConfirm(true)
      return
    }
    await doSave(data, false)
  }

  async function handleDisableConfirm() {
    setShowDisableConfirm(false)
    await doSave(buildFormData(), true)
  }

  async function doSave(data: ReturnType<typeof buildFormData>, disableSong: boolean) {
    setSaving(true)
    try {
      if (isEdit) {
        await updateSong(Number(id), data)
        if (disableSong) {
          await toggleSongSelectable(Number(id), false)
        }
      } else {
        await createSong(data)
      }
      setToast('Song saved')
      setTimeout(() => navigate(songsUrl, { state: locationState?.backState ?? undefined }), 1000)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      {showDisableConfirm && (
        <ConfirmPopup
          message="Are you sure? This song will be automatically disabled without an album."
          onConfirm={handleDisableConfirm}
          onCancel={() => setShowDisableConfirm(false)}
        />
      )}
      <AdminFormPage title={isEdit ? 'Edit Song' : 'Add Song'} onSubmit={handleSubmit} onCancel={() => navigate(songsUrl, { state: locationState?.backState ?? undefined })} loading={saving} backUrl={songsUrl} backState={locationState?.backState}>
        <div className="space-y-5">
          <h2 className="text-base font-semibold mb-3 text-neutral-600 uppercase tracking-wide text-xs">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </FormField>
            <FormField label="Genius Song ID">
              <input type="number" value={geniusSongId} onChange={(e) => setGeniusSongId(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Album">
              <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Track Number">
              <input type="number" value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Difficulty Rank" required>
              <select value={difficultyRank} onChange={(e) => setDifficultyRank(e.target.value)} required className={inputClass}>
                <option value="">Select...</option>
                {difficultyRankOptions.map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Featured Artists">
            <input
              type="text"
              value={featuredArtists}
              onChange={(e) => setFeaturedArtists(e.target.value)}
              placeholder="Comma-separated names"
              className={inputClass}
            />
          </FormField>
          <FormField label="Full Lyrics">
            <textarea
              value={fullLyrics}
              onChange={(e) => setFullLyrics(e.target.value)}
              rows={5}
              className={inputClass}
            />
          </FormField>
          <h2 className="text-base font-semibold mb-3 text-neutral-600 uppercase tracking-wide text-xs">Game Behavior</h2>
          <FormField label="Success Message">
            <input
              type="text"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Failure Message">
            <input
              type="text"
              value={failureMessage}
              onChange={(e) => setFailureMessage(e.target.value)}
              className={inputClass}
            />
          </FormField>
      </div>
      </AdminFormPage>
    </>
  )
}
