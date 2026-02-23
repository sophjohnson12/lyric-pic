import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ConfirmPopup from '../common/ConfirmPopup'
import { getImageById, getImageLyrics, updateLyricImageSelectable, blocklistImageUnknown } from '../../services/adminService'
import type { AdminImageLyricRow } from '../../services/adminService'
import ToggleSwitch from './ToggleSwitch'

export default function ImageLyricsPage() {
  const { imageId } = useParams<{ imageId: string }>()
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [image, setImage] = useState<{ id: number; image_id: string; url: string } | null>(null)
  const [lyrics, setLyrics] = useState<AdminImageLyricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [showBlocklistConfirm, setShowBlocklistConfirm] = useState(false)
  const [blocklisting, setBlocklisting] = useState(false)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Images', to: '/admin/images' },
      { label: 'Image Lyrics' },
    ])
  }, [setBreadcrumbs])

  useEffect(() => {
    if (!imageId) return
    setLoading(true)
    Promise.all([
      getImageById(Number(imageId)),
      getImageLyrics(Number(imageId)),
    ]).then(([img, lyr]) => {
      setImage(img)
      setLyrics(lyr)
    }).finally(() => setLoading(false))
  }, [imageId])

  async function handleBlocklistConfirm() {
    if (!imageId) return
    setBlocklisting(true)
    try {
      await blocklistImageUnknown(Number(imageId))
      navigate('/admin/images')
    } catch (err) {
      console.error('Failed to blocklist image:', err)
      setBlocklisting(false)
    }
    setShowBlocklistConfirm(false)
  }

  async function handleToggleSelectable(lyricId: number, value: boolean) {
    if (!imageId) return
    setToggling(lyricId)
    try {
      await updateLyricImageSelectable(Number(imageId), lyricId, value)
      setLyrics((prev) => prev.map((l) => l.lyric_id === lyricId ? { ...l, is_selectable: value } : l))
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/images"
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Image Lyrics</h1>
        </div>
        <button
          onClick={() => setShowBlocklistConfirm(true)}
          disabled={blocklisting || loading}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          {blocklisting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          Blocklist
        </button>
      </div>

      {image && (
        <div className="flex items-center gap-3 mb-6">
          <img
            src={image.url}
            alt=""
            className="w-32 h-32 object-cover rounded"
          />
          <div>
            <p className="text-sm font-medium text-text/60">Image ID</p>
            <p className="font-mono text-sm">{image.image_id}</p>
          </div>
        </div>
      )}

      <AdminTable
        data={lyrics}
        keyFn={(l) => l.lyric_id}
        loading={loading}
        columns={[
          { header: 'Word', accessor: (l) => l.root_word },
          {
            header: 'Enabled?',
            accessor: (l) => (
              <ToggleSwitch
                checked={l.is_selectable}
                onChange={(value) => handleToggleSelectable(l.lyric_id, value)}
                disabled={toggling === l.lyric_id}
              />
            ),
          },
        ]}
      />
      {showBlocklistConfirm && (
        <ConfirmPopup
          title="Blocklist Image?"
          message="This will mark the image as blocklisted and disable it for all lyrics. This cannot be undone from this page."
          confirmLabel="Blocklist"
          cancelLabel="Cancel"
          onConfirm={handleBlocklistConfirm}
          onCancel={() => setShowBlocklistConfirm(false)}
        />
      )}
    </div>
  )
}
