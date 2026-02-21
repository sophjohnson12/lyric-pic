import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import Toast from '../common/Toast'
import {
  getAdminSongById,
  getAdminArtistById,
  getAlbumsForDropdown,
  createSong,
  updateSong,
} from '../../services/adminService'

export default function SongFormPage() {
  const { artistId, id } = useParams()
  const aid = Number(artistId)
  const isEdit = !!id
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [name, setName] = useState('')
  const [geniusSongId, setGeniusSongId] = useState('')
  const [albumId, setAlbumId] = useState<string>('')
  const [trackNumber, setTrackNumber] = useState('')
  const [featuredArtists, setFeaturedArtists] = useState('')
  const [fullLyrics, setFullLyrics] = useState('')
  const [albums, setAlbums] = useState<{ id: number; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Songs', to: `/admin/artists/${aid}/songs` },
        { label: isEdit ? 'Edit Song' : 'Add Song' },
      ])
    })
  }, [aid, setBreadcrumbs, isEdit])

  useEffect(() => {
    getAlbumsForDropdown(aid).then(setAlbums)
  }, [aid])

  useEffect(() => {
    if (isEdit) {
      getAdminSongById(Number(id)).then((s) => {
        setName(s.name)
        setGeniusSongId(s.genius_song_id?.toString() ?? '')
        setAlbumId(s.album_id?.toString() ?? '')
        setTrackNumber(s.track_number?.toString() ?? '')
        setFeaturedArtists(s.featured_artists?.join(', ') ?? '')
        setFullLyrics(s.lyrics_full_text ?? '')
      })
    }
  }, [id, isEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        artist_id: aid,
        name,
        genius_song_id: geniusSongId ? Number(geniusSongId) : null,
        album_id: albumId ? Number(albumId) : null,
        track_number: trackNumber ? Number(trackNumber) : null,
        featured_artists: featuredArtists
          ? featuredArtists.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        lyrics_full_text: fullLyrics || null,
      }
      if (isEdit) {
        await updateSong(Number(id), data)
      } else {
        await createSong(data)
      }
      setToast('Song saved')
      setTimeout(() => navigate(`/admin/artists/${aid}/songs`), 1000)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage title={isEdit ? 'Edit Song' : 'Add Song'} onSubmit={handleSubmit} onCancel={() => navigate(`/admin/artists/${aid}/songs`)} loading={saving}>
        <FormField label="Name" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </FormField>
        <FormField label="Genius Song ID">
          <input type="number" value={geniusSongId} onChange={(e) => setGeniusSongId(e.target.value)} className={inputClass} />
        </FormField>
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
            rows={10}
            className={inputClass}
          />
        </FormField>
      </AdminFormPage>
    </>
  )
}
