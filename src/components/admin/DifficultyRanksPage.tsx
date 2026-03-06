import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import Toast from '../common/Toast'
import AlbumIcon from '../common/AlbumIcon'
import {
  getAdminArtistById,
  getAdminLevels,
  getPlayableSongsForDifficulty,
  updateSongDifficultyRank,
  type AdminLevelRow,
  type DifficultySong,
} from '../../services/adminService'

// ─── SongCard ─────────────────────────────────────────────────────────────────

interface SongCardProps {
  song: DifficultySong
  isDragging?: boolean
}

function SongCard({ song, isDragging }: SongCardProps) {
  const album = song.album

  return (
    <div
      className={`flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 shadow-sm border border-gray-200 select-none${isDragging ? ' opacity-50' : ''}`}
    >
      {album && <AlbumIcon album={album} />}
      <span className="text-sm text-gray-800 leading-tight">{song.name}</span>
    </div>
  )
}

// ─── DraggableSongCard ────────────────────────────────────────────────────────

function DraggableSongCard({ song }: { song: DifficultySong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: song.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
      className="cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <SongCard song={song} isDragging={isDragging} />
    </div>
  )
}

// ─── DroppableColumn ──────────────────────────────────────────────────────────

interface DroppableColumnProps {
  id: string
  label: string
  songs: DifficultySong[]
  activeId: number | null
}

function DroppableColumn({ id, label, songs, activeId }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 transition-colors h-full min-h-0${isOver ? ' border-primary bg-primary/5' : ' border-gray-200 bg-gray-50'}`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0">
        <h2 className="font-semibold text-sm text-gray-700">{label}</h2>
        <span className="text-xs text-gray-400">{songs.length} songs</span>
      </div>
      <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto min-h-0">
        {songs.map((song) =>
          song.id === activeId ? (
            // Ghost placeholder while dragging
            <div key={song.id} className="h-11 rounded-lg border-2 border-dashed border-gray-300 opacity-40" />
          ) : (
            <DraggableSongCard key={song.id} song={song} />
          )
        )}
      </div>
    </div>
  )
}

// ─── DifficultyRanksPage ─────────────────────────────────────────────────────

export default function DifficultyRanksPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const location = useLocation()
  const [capturedLocationState] = useState(() => location.state as { backUrl?: string; backState?: unknown } | null)
  const backUrl = capturedLocationState?.backUrl ?? '/admin'
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [levels, setLevels] = useState<AdminLevelRow[]>([])
  const [songs, setSongs] = useState<DifficultySong[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Difficulty Ranks' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    setLoading(true)
    Promise.all([getAdminLevels(aid), getPlayableSongsForDifficulty(aid)])
      .then(([lvls, sngs]) => { setLevels(lvls); setSongs(sngs) })
      .catch((err) => showToast(`Error: ${err instanceof Error ? err.message : 'Failed to load data'}`))
      .finally(() => setLoading(false))
  }, [aid])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const level = levels.find((l) => String(l.id) === String(over.id))
    if (!level) return

    const newRank = level.max_difficulty_rank
    const songId = active.id as number
    const song = songs.find((s) => s.id === songId)
    if (!song || song.difficulty_rank === newRank) return

    // Optimistic update
    setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, difficulty_rank: newRank } : s)))

    updateSongDifficultyRank(songId, newRank).catch((err) => {
      // Revert on failure
      setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, difficulty_rank: song.difficulty_rank } : s)))
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to update difficulty'}`)
    })
  }

  const activeSong = activeId != null ? songs.find((s) => s.id === activeId) : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to={backUrl} state={capturedLocationState?.backState} className="text-primary hover:opacity-70" title="Back to Artists">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Difficulty Ranks</h1>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : levels.length === 0 ? (
        <p className="text-gray-500 text-sm">No levels defined for this artist. Add levels first.</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className="flex-1 min-h-0 grid gap-4 overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }}
          >
            {levels.map((level) => (
              <DroppableColumn
                key={level.id}
                id={String(level.id)}
                label={level.name}
                songs={songs.filter((s) => s.difficulty_rank === level.max_difficulty_rank)}
                activeId={activeId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeSong ? <SongCard song={activeSong} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <Toast message={toast} />
    </div>
  )
}
