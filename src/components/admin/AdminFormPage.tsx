interface AdminFormPageProps {
  title: string
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
  loading?: boolean
  canSubmit?: boolean
  children: React.ReactNode
}

export default function AdminFormPage({ title, onSubmit, onCancel, loading = false, canSubmit = true, children }: AdminFormPageProps) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-text/50 mb-6">* required</p>
      <form onSubmit={onSubmit} className="space-y-5">
        {children}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-200 text-text px-6 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
