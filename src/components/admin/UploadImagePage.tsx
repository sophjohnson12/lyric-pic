import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Upload } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import { uploadCustomImage, createCustomImage } from '../../services/adminService'

type Status = 'idle' | 'converting' | 'compressing' | 'uploading' | 'complete' | 'error'

function isHeic(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif'
}

export default function UploadImagePage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setBreadcrumbs([
      { label: 'All Images', to: '/admin/images/all' },
      { label: 'Upload Image' },
    ])
  }, [setBreadcrumbs])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus(isHeic(file) ? 'converting' : 'compressing')
    setErrorMessage('')

    try {
      let imageFile: File = file
      if (isHeic(file)) {
        const heic2any = (await import('heic2any')).default
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
        const blob = Array.isArray(converted) ? converted[0] : converted
        imageFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' })
        setStatus('compressing')
      }

      const compressed = await imageCompression(imageFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      setStatus('uploading')

      const { url, imageId } = await uploadCustomImage(compressed as File)
      const newId = await createCustomImage(url, imageId)

      setStatus('complete')
      setTimeout(() => navigate(`/admin/images/${newId}`), 800)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/images/all" className="text-primary hover:opacity-70" title="Back">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Upload Image</h1>
      </div>

      <div className="space-y-6">
        {status === 'idle' || status === 'error' ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/40 rounded-xl p-12 cursor-pointer hover:border-primary/70 hover:bg-primary/5 transition-colors">
            <Upload size={36} className="text-primary/60" />
            <span className="text-neutral-600 font-medium">Click to select an image</span>
            <span className="text-neutral-400 text-sm">JPG, PNG, WebP, HEIC, etc. — max 1 MB after compression</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        ) : null}

        {(status === 'converting' || status === 'compressing' || status === 'uploading') && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-neutral-600 font-medium">
              {status === 'converting' ? 'Converting HEIC...' : status === 'compressing' ? 'Compressing...' : 'Uploading...'}
            </p>
          </div>
        )}

        {status === 'complete' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle size={40} className="text-success" />
            <p className="text-neutral-600 font-medium">Upload complete. Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <p className="text-error text-sm font-medium">{errorMessage}</p>
        )}
      </div>
    </div>
  )
}
