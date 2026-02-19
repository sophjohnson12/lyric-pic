import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ColorField from './ColorField'
import Toast from '../common/Toast'
import { getAdminArtistById, createArtist, updateArtist, searchGeniusArtistId } from '../../services/adminService'

export default function ArtistFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [geniusArtistId, setGeniusArtistId] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#722F37')
  const [secondaryColor, setSecondaryColor] = useState('#5C2028')
  const [bgColor, setBgColor] = useState('#FFF8F0')
  const [textColor, setTextColor] = useState('#2D1F2D')
  const [font, setFont] = useState('')
  const [saving, setSaving] = useState(false)
  const [findingGenius, setFindingGenius] = useState(false)
  const [geniusError, setGeniusError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Artists', to: '/admin' },
      { label: isEdit ? 'Edit Artist' : 'Add Artist' },
    ])
  }, [setBreadcrumbs, isEdit])

  useEffect(() => {
    if (isEdit) {
      getAdminArtistById(Number(id)).then((a) => {
        setName(a.name)
        setSlug(a.slug)
        setSuccessMessage(a.success_message ?? '')
        setGeniusArtistId(a.genius_artist_id?.toString() ?? '')
        setPrimaryColor(a.theme_primary_color)
        setSecondaryColor(a.theme_secondary_color)
        setBgColor(a.theme_background_color)
        setTextColor(a.theme_text_color)
        setFont(a.theme_font_heading)
      })
    }
  }, [id, isEdit])

  async function handleFindGeniusId() {
    if (!name.trim()) return
    setGeniusError('')
    setFindingGenius(true)
    try {
      const id = await searchGeniusArtistId(name.trim())
      if (id) {
        setGeniusArtistId(id.toString())
      } else {
        setGeniusError('Unable to find Genius ID for the provided artist name.')
      }
    } finally {
      setFindingGenius(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name,
        slug,
        success_message: successMessage,
        genius_artist_id: geniusArtistId ? Number(geniusArtistId) : null,
        theme_primary_color: primaryColor,
        theme_secondary_color: secondaryColor,
        theme_background_color: bgColor,
        theme_text_color: textColor,
        theme_font_heading: font,
      }
      if (isEdit) {
        await updateArtist(Number(id), data)
      } else {
        await createArtist(data)
      }
      setToast('Artist saved')
      setTimeout(() => navigate('/admin'), 1000)
    } catch (err) {
      setToast(`Error: ${err instanceof Error ? err.message : 'Save failed'}`)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = !!(name.trim() && slug.trim() && successMessage.trim() && geniusArtistId)

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage title={isEdit ? 'Edit Artist' : 'Add Artist'} onSubmit={handleSubmit} loading={saving} canSubmit={canSubmit}>
        <FormField label="Name" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </FormField>
        <FormField label="Slug" required>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required className={inputClass} />
        </FormField>
        <FormField label="Success Message" required>
          <input type="text" value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} required className={inputClass} />
        </FormField>
        <FormField label="Genius Artist ID" required>
          <div className="flex items-center gap-2">
            <input type="number" value={geniusArtistId} readOnly required className={`${inputClass} bg-gray-100 cursor-not-allowed`} />
            <button
              type="button"
              onClick={handleFindGeniusId}
              disabled={findingGenius || !name.trim()}
              className="shrink-0 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {findingGenius ? 'Finding...' : 'Find ID'}
            </button>
          </div>
          {geniusError && <p className="text-red-500 text-sm mt-1">{geniusError}</p>}
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
        <FormField label="Text Color">
          <ColorField value={textColor} onChange={setTextColor} />
        </FormField>
        <FormField label="Font">
          <input type="text" value={font} onChange={(e) => setFont(e.target.value)} className={inputClass} />
        </FormField>
      </AdminFormPage>
    </>
  )
}
