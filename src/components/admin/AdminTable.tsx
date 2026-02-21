import { useState } from 'react'

export interface Column<T> {
  header: string
  accessor: (row: T) => React.ReactNode
}

interface AdminTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyFn: (row: T) => string | number
  loading?: boolean
  // Server-side pagination
  serverPagination?: {
    total: number
    page: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
  }
  // Checkbox selection
  selection?: {
    selected: Set<string | number>
    onToggle: (key: string | number) => void
    onToggleAll: (keys: (string | number)[]) => void
  }
}

export default function AdminTable<T>({
  columns,
  data,
  keyFn,
  loading = false,
  serverPagination,
  selection,
}: AdminTableProps<T>) {
  const [clientPage, setClientPage] = useState(1)
  const [clientPageSize, setClientPageSize] = useState(10)

  const isServerPaginated = !!serverPagination
  const page = isServerPaginated ? serverPagination.page : clientPage
  const pageSize = isServerPaginated ? serverPagination.pageSize : clientPageSize
  const total = isServerPaginated ? serverPagination.total : data.length

  const showAll = pageSize === 0
  const effectivePageSize = showAll ? total : pageSize

  const displayData = isServerPaginated
    ? data
    : showAll
      ? data
      : data.slice((page - 1) * effectivePageSize, page * effectivePageSize)

  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(total / effectivePageSize))
  const from = total === 0 ? 0 : showAll ? 1 : (page - 1) * effectivePageSize + 1
  const to = showAll ? total : Math.min(page * effectivePageSize, total)

  function handlePageChange(newPage: number) {
    if (isServerPaginated) {
      serverPagination.onPageChange(newPage)
    } else {
      setClientPage(newPage)
    }
  }

  function handlePageSizeChange(newSize: number) {
    if (isServerPaginated) {
      serverPagination.onPageSizeChange(newSize)
    } else {
      setClientPageSize(newSize)
      setClientPage(1)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary/10">
            {selection && (
              <th className="w-10 px-4 py-2.5 border-b border-primary/20">
                <input
                  type="checkbox"
                  checked={displayData.length > 0 && displayData.every((row) => selection.selected.has(keyFn(row)))}
                  onChange={() => selection.onToggleAll(displayData.map((row) => keyFn(row)))}
                  className="cursor-pointer"
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className="text-left px-4 py-2.5 font-semibold border-b border-primary/20 text-text"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selection ? 1 : 0)} className="text-center py-8 text-text/50">
                No data found
              </td>
            </tr>
          ) : (
            displayData.map((row) => (
              <tr key={keyFn(row)} className="border-b border-primary/10 hover:bg-primary/5">
                {selection && (
                  <td className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selection.selected.has(keyFn(row))}
                      onChange={() => selection.onToggle(keyFn(row))}
                      className="cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col, i) => (
                  <td key={i} className="px-4 py-2.5">
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-text/70 border-t border-primary/20">
          <span>
            Showing {from}–{to} of {total}
          </span>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-primary/30 rounded px-2 py-1 bg-bg text-text text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={0}>All</option>
            </select>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-primary/30 disabled:opacity-30 hover:bg-primary/10"
            >
              Prev
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-primary/30 disabled:opacity-30 hover:bg-primary/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
