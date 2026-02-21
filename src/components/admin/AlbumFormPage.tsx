import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ColorField from './ColorField'
import Toast from '../common/Toast'
import { getAdminAlbumById, getAdminArtistById, createAlbum, updateAlbum } from '../../services/adminService'

export default function AlbumFormPage() {
  const { artistId, id } = useParams()
  const aid = Number(artistId)
  const isEdit = !!id
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [name, setName] = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [bgColor, setBgColor] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Albums', to: `/admin/artists/${aid}/albums` },
        { label: isEdit ? 'Edit Album' : 'Add Album' },
      ])
    })
  }, [aid, setBreadcrumbs, isEdit])

  useEffect(() => {
    if (isEdit) {
      getAdminAlbumById(Number(id)).then((a) => {
        setName(a.name)
        setReleaseYear(a.release_year?.toString() ?? '')
        setPrimaryColor(a.theme_primary_color ?? '')
        setSecondaryColor(a.theme_secondary_color ?? '')
        setBgColor(a.theme_background_color ?? '')
        setImageUrl(a.image_url ?? '')
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
        release_year: releaseYear ? Number(releaseYear) : null,
        theme_primary_color: primaryColor || null,
        theme_secondary_color: secondaryColor || null,
        theme_background_color: bgColor || null,
        image_url: imageUrl || null,
      }
      if (isEdit) {
        await updateAlbum(Number(id), data)
      } else {
        await createAlbum(data)
      }
      setToast('Album saved')
      setTimeout(() => navigate(`/admin/artists/${aid}/albums`), 1000)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage title={isEdit ? 'Edit Album' : 'Add Album'} onSubmit={handleSubmit} onCancel={() => navigate(`/admin/artists/${aid}/albums`)} loading={saving} backUrl={`/admin/artists/${aid}/albums`}>
        <FormField label="Name" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </FormField>
        <FormField label="Release Year" required>
          <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} required className={inputClass} />
        </FormField>
        <FormField label="Primary Color">
          <ColorField value={primaryColor} onChange={setPrimaryColor} />
        </FormField>
        <FormField label="Secondary Color">
          <ColorField value={secondaryColor} onChange={setSecondaryColor} />
        </FormField>
        <FormField label="Background Color">
          <ColorField value={bgColor} onChange={setBgColor} />
        </FormField>
        <FormField label="Image URL">
          <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} />
        </FormField>
      </AdminFormPage>
    </>
  )
}
