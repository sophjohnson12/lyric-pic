import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import {
  getAdminArtistById,
  getLevelById,
  createLevel,
  updateLevel,
} from '../../services/adminService'

export default function LevelFormPage() {
  const { artistId, id } = useParams()
  const aid = Number(artistId)
  const isEdit = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { backUrl?: string; backState?: unknown } | null
  const backUrl = locationState?.backUrl ?? `/admin/artists/${aid}/levels`
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxDifficultyRank, setMaxDifficultyRank] = useState('')
  const [showAlbumFilters, setShowAlbumFilters] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Levels', to: backUrl },
        { label: isEdit ? 'Edit Level' : 'Add Level' },
      ])
    })
  }, [aid, setBreadcrumbs, isEdit, backUrl])

  useEffect(() => {
    if (isEdit) {
      getLevelById(Number(id)).then((l) => {
        setName(l.name)
        setDescription(l.description ?? '')
        setMaxDifficultyRank(l.max_difficulty_rank.toString())
        setShowAlbumFilters(l.show_album_filters)
      })
    }
  }, [id, isEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await updateLevel(Number(id), {
          name,
          description: description || null,
          max_difficulty_rank: Number(maxDifficultyRank),
          show_album_filters: showAlbumFilters,
        })
      } else {
        await createLevel({
          artist_id: aid,
          name,
          description: description || null,
          max_difficulty_rank: Number(maxDifficultyRank),
          show_album_filters: showAlbumFilters,
        })
      }
      setToast('Level saved')
      setTimeout(() => navigate(backUrl, { state: locationState?.backState ?? undefined }), 1000)
    } catch (err) {
      setToast(`Error: ${err instanceof Error ? err.message : 'Failed to save level'}`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm'

  return (
    <>
      <Toast message={toast} />
      <AdminFormPage
        title={isEdit ? 'Edit Level' : 'Add Level'}
        onSubmit={handleSubmit}
        onCancel={() => navigate(backUrl, { state: locationState?.backState ?? undefined })}
        loading={saving}
        backUrl={backUrl}
        backState={locationState?.backState}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </FormField>
            <FormField label="Max Difficulty Rank" required>
              <input
                type="number"
                value={maxDifficultyRank}
                onChange={(e) => setMaxDifficultyRank(e.target.value)}
                required
                min={1}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </FormField>
          <FormField label="Album Filters?">
            <ToggleSwitch checked={showAlbumFilters} onChange={setShowAlbumFilters} />
          </FormField>
        </div>
      </AdminFormPage>
    </>
  )
}
