import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ColorField from './ColorField'
import Toast from '../common/Toast'
import { getAdminAlbumById, getAdminArtistById, createAlbum, updateAlbum, uploadAlbumIcon } from '../../services/adminService'

export default function AlbumFormPage() {
  const { artistId, id } = useParams()
  const aid = Number(artistId)
  const isEdit = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { backUrl?: string; backState?: unknown } | null
  const backUrl = locationState?.backUrl ?? `/admin/artists/${aid}/albums`
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [name, setName] = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [bgColor, setBgColor] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Albums', to: backUrl },
        { label: isEdit ? 'Edit Album' : 'Add Album' },
      ])
    })
  }, [aid, setBreadcrumbs, isEdit, backUrl])

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
      let finalImageUrl = imageUrl || null
      if (pendingFile) {
        finalImageUrl = await uploadAlbumIcon(pendingFile)
      }
      const data = {
        artist_id: aid,
        name,
        release_year: releaseYear ? Number(releaseYear) : null,
        theme_primary_color: primaryColor || null,
        theme_secondary_color: secondaryColor || null,
        theme_background_color: bgColor || null,
        image_url: finalImageUrl,
      }
      if (isEdit) {
        await updateAlbum(Number(id), data)
      } else {
        await createAlbum(data)
      }
      setToast('Album saved')
      setTimeout(() => navigate(backUrl, { state: locationState?.backState ?? undefined }), 1000)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage title={isEdit ? 'Edit Album' : 'Add Album'} onSubmit={handleSubmit} onCancel={() => navigate(backUrl, { state: locationState?.backState ?? undefined })} loading={saving} backUrl={backUrl} backState={locationState?.backState}>
        <div className="space-y-5">
          <h2 className="text-base font-semibold mb-3 text-text/70 uppercase tracking-wide text-xs">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </FormField>
            <FormField label="Release Year" required>
              <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} required className={inputClass} />
            </FormField>
          </div>
          <h2 className="text-base font-semibold mb-3 text-text/70 uppercase tracking-wide text-xs">Themes</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Primary Color">
              <ColorField value={primaryColor} onChange={setPrimaryColor} />
            </FormField>
            <FormField label="Secondary Color">
              <ColorField value={secondaryColor} onChange={setSecondaryColor} />
            </FormField>
            <FormField label="Background Color">
              <ColorField value={bgColor} onChange={setBgColor} />
            </FormField>
          </div>
          <FormField label="Icon (SVG)">
            <div className="flex items-center gap-3">
              {(pendingFile || imageUrl) && (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: primaryColor || '#6b7280', border: '1px solid', borderColor: secondaryColor || '#9ca3af' }}
                >
                  <img
                    src={pendingFile ? URL.createObjectURL(pendingFile) : imageUrl}
                    alt="icon preview"
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                </div>
              )}
              <label className={`${inputClass} cursor-pointer`}>
                {pendingFile ? pendingFile.name : 'Choose file…'}
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            </div>
          </FormField>
        </div>     
      </AdminFormPage>
    </>
  )
}
