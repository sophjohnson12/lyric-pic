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
import {
  getAdminArtistById,
  getPlayableSongsForDifficulty,
  updateSongDifficultyRank,
  type DifficultySong,
} from '../../services/adminService'

// ─── SongCard ─────────────────────────────────────────────────────────────────

interface SongCardProps {
  song: DifficultySong
  isDragging?: boolean
}

function SongCard({ song, isDragging }: SongCardProps) {
  const album = song.album
  const initials = album?.name
    ? album.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div
      className={`flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 shadow-sm border border-gray-200 select-none${isDragging ? ' opacity-50' : ''}`}
    >
      {/* Album icon */}
      <div
        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border"
        style={{
          backgroundColor: album?.theme_primary_color ?? '#6b7280',
          borderColor: album?.theme_secondary_color ?? 'transparent',
        }}
      >
        {album?.image_url ? (
          <img
            src={window.location.origin + album.image_url}
            style={{ width: 15, height: 15, objectFit: 'contain' }}
            alt=""
          />
        ) : (
          <span className="text-white font-bold leading-none" style={{ fontSize: 9 }}>
            {initials}
          </span>
        )}
      </div>
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

// ─── DifficultyLevelsPage ─────────────────────────────────────────────────────

const COLUMN_TO_RANK: Record<string, number> = { easy: 1, medium: 2, hard: 3 }

export default function DifficultyLevelsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const location = useLocation()
  const [capturedLocationState] = useState(() => location.state as { backUrl?: string } | null)
  const backUrl = capturedLocationState?.backUrl ?? '/admin'
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [songs, setSongs] = useState<DifficultySong[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Difficulty Levels' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    setLoading(true)
    getPlayableSongsForDifficulty(aid)
      .then(setSongs)
      .catch((err) => showToast(`Error: ${err instanceof Error ? err.message : 'Failed to load songs'}`))
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

    const newRank = COLUMN_TO_RANK[over.id as string]
    if (newRank == null) return

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

  const easySongs = songs.filter((s) => s.difficulty_rank === 1)
  const mediumSongs = songs.filter((s) => s.difficulty_rank === 2)
  const hardSongs = songs.filter((s) => s.difficulty_rank === 3)
  const activeSong = activeId != null ? songs.find((s) => s.id === activeId) : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to={backUrl} className="text-primary hover:opacity-70" title="Back to Artists">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Difficulty Levels</h1>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0 grid grid-cols-3 gap-4 overflow-hidden">
            <DroppableColumn id="easy" label="Easy" songs={easySongs} activeId={activeId} />
            <DroppableColumn id="medium" label="Medium" songs={mediumSongs} activeId={activeId} />
            <DroppableColumn id="hard" label="Hard" songs={hardSongs} activeId={activeId} />
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
