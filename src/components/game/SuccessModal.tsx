import Modal from '../common/Modal'
import type { Song, Album, Artist } from '../../types/database'

interface SuccessModalProps {
  song: Song
  album: Album | null
  artist: Artist
  onNext: () => void
}

export default function SuccessModal({ song, album, artist, onNext }: SuccessModalProps) {
  const message = song.success_message || artist.success_message || 'You got it!'
  const songDisplay = song.featured_artists?.length
    ? `${song.name} ft. ${song.featured_artists.join(', ')}`
    : song.name

  return (
    <Modal showClose={false}>
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-primary mb-4">{message}</h2>
        <p className="text-lg font-semibold text-text mb-1">{songDisplay}</p>
        <p className="text-sm text-text/60 mb-6">{album ? album.name : 'Single'}</p>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Next Song
        </button>
      </div>
    </Modal>
  )
}
