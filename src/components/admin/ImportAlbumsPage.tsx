import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import { getAlbumImports, getAdminArtistById } from '../../services/adminService'
import type { AdminAlbumImportRow } from '../../services/adminService'

export default function ImportAlbumsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [imports, setImports] = useState<AdminAlbumImportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Albums', to: `/admin/artists/${aid}/albums` },
        { label: 'Import Albums' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    setLoading(true)
    getAlbumImports(aid)
      .then(setImports)
      .finally(() => setLoading(false))
  }, [aid])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Import Albums</h1>
      <AdminTable
        data={imports}
        keyFn={(a) => a.id}
        loading={loading}
        columns={[
          { header: 'Name', accessor: (a) => a.name },
          { header: 'Album Type', accessor: (a) => a.album_type ?? '—' },
          { header: 'Songs', accessor: (a) => a.song_count },
        ]}
      />
    </div>
  )
}
