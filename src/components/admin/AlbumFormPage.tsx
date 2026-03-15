import { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ColorField from './ColorField'
import Toast from '../common/Toast'
import { getAdminAlbumById, getAdminArtistById, createAlbum, updateAlbum, uploadAlbumIcon, uploadAlbumBackground } from '../../services/adminService'
import AlbumIcon from '../common/AlbumIcon'
import { Trash2 } from 'lucide-react'

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
  const [backgroundPatternColor, setBackgroundPatternColor] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [pendingBackgroundFile, setPendingBackgroundFile] = useState<File | null>(null)
  const [backgroundTileSize, setBackgroundTileSize] = useState('')
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
        setBackgroundPatternColor(a.theme_background_color ?? '')
        setImageUrl(a.image_url ?? '')
        setBackgroundUrl(a.background_url ?? '')
        setBackgroundTileSize(a.background_tile_size?.toString() ?? '')
      })
    }
  }, [id, isEdit])

  // Live-preview the background pattern on #bg-pattern
  useEffect(() => {
    let objectUrl: string | null = null
    const bgPattern = document.getElementById('bg-pattern')
    if (!bgPattern) return

    const effectiveUrl = pendingBackgroundFile
      ? (objectUrl = URL.createObjectURL(pendingBackgroundFile))
      : backgroundUrl || null

    if (effectiveUrl) {
      bgPattern.style.backgroundColor = backgroundPatternColor || primaryColor
      bgPattern.style.webkitMaskImage = `url(${effectiveUrl})`
      bgPattern.style.maskImage = `url(${effectiveUrl})`
      const maskSize = backgroundTileSize ? `${backgroundTileSize}px auto` : ''
      bgPattern.style.webkitMaskSize = maskSize
      bgPattern.style.setProperty('mask-size', maskSize)
      bgPattern.style.opacity = '1'
    } else {
      bgPattern.style.webkitMaskImage = ''
      bgPattern.style.maskImage = ''
      bgPattern.style.webkitMaskSize = ''
      bgPattern.style.setProperty('mask-size', '')
      bgPattern.style.opacity = '0'
    }

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [pendingBackgroundFile, backgroundUrl, backgroundPatternColor, primaryColor, backgroundTileSize])

  // Reset #bg-pattern before the browser paints the next page.
  // useLayoutEffect fires before paint; setting backgroundColor to 'transparent'
  // avoids the primary-color flash caused by the CSS opacity transition (which has
  // !important and can't be overridden inline).
  useLayoutEffect(() => () => {
    const bgPattern = document.getElementById('bg-pattern')
    if (bgPattern) {
      bgPattern.style.webkitMaskImage = ''
      bgPattern.style.maskImage = ''
      bgPattern.style.webkitMaskSize = ''
      bgPattern.style.setProperty('mask-size', '')
      bgPattern.style.backgroundColor = 'transparent'
      bgPattern.style.opacity = '0'
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let finalImageUrl = imageUrl || null
      if (pendingFile) {
        finalImageUrl = await uploadAlbumIcon(pendingFile)
      }
      let finalBackgroundUrl = backgroundUrl || null
      if (pendingBackgroundFile) {
        finalBackgroundUrl = await uploadAlbumBackground(pendingBackgroundFile)
      }
      const data = {
        artist_id: aid,
        name,
        release_year: releaseYear ? Number(releaseYear) : null,
        theme_primary_color: primaryColor || null,
        theme_secondary_color: secondaryColor || null,
        theme_background_color: backgroundPatternColor || null,
        image_url: finalImageUrl,
        background_url: finalBackgroundUrl,
        background_tile_size: backgroundTileSize ? Number(backgroundTileSize) : null,
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

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage title={isEdit ? 'Edit Album' : 'Add Album'} onSubmit={handleSubmit} onCancel={() => navigate(backUrl, { state: locationState?.backState ?? undefined })} loading={saving} backUrl={backUrl} backState={locationState?.backState}>
        <div className="space-y-5">
          <h2 className="text-base font-semibold mb-3 text-neutral-600 uppercase tracking-wide text-xs">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </FormField>
            <FormField label="Release Year" required>
              <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} required className={inputClass} />
            </FormField>
          </div>
          <h2 className="text-base font-semibold mb-3 text-neutral-600 uppercase tracking-wide text-xs">Themes</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Primary Color">
              <ColorField value={primaryColor} onChange={setPrimaryColor} />
            </FormField>
            <FormField label="Secondary Color">
              <ColorField value={secondaryColor} onChange={setSecondaryColor} />
            </FormField>
            <FormField label="Background Pattern Color">
              <ColorField value={backgroundPatternColor} onChange={setBackgroundPatternColor} />
            </FormField>
          </div>
          <FormField label="Icon (SVG)">
            <div className="flex items-center gap-3">
              <AlbumIcon
                album={{
                  name,
                  image_url: pendingFile ? URL.createObjectURL(pendingFile) : imageUrl,
                  theme_primary_color: primaryColor,
                  theme_secondary_color: secondaryColor,
                }}
              />
              <label className={`${inputClass} cursor-pointer`}>
                {pendingFile ? pendingFile.name : imageUrl ? imageUrl.split('/').pop() : 'Choose file…'}
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              {(pendingFile || imageUrl) && (
                <button type="button" onClick={() => { setPendingFile(null); setImageUrl('') }} title="Remove icon" className="text-neutral-400 hover:text-error shrink-0">
                  <Trash2 size={20} className="drop-shadow-md" />
                </button>
              )}
            </div>
          </FormField>
          <FormField label="Background Pattern (SVG)">
            <div className="flex items-center gap-3">
              <label className={`${inputClass} cursor-pointer`}>
                {pendingBackgroundFile ? pendingBackgroundFile.name : backgroundUrl ? backgroundUrl.split('/').pop() : 'Choose file…'}
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => setPendingBackgroundFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              {(pendingBackgroundFile || backgroundUrl) && (
                <button type="button" onClick={() => { setPendingBackgroundFile(null); setBackgroundUrl('') }} title="Remove background" className="text-neutral-400 hover:text-error shrink-0">
                  <Trash2 size={20} className="drop-shadow-md" />
                </button>
              )}
            </div>
          </FormField>
          <FormField label="Background Tile Size (px)">
            <input
              type="number"
              min="1"
              value={backgroundTileSize}
              onChange={(e) => setBackgroundTileSize(e.target.value)}
              placeholder="Auto (intrinsic SVG size)"
              className={inputClass}
            />
          </FormField>
        </div>
      </AdminFormPage>
    </>
  )
}
