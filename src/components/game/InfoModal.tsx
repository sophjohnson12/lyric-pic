import Modal from '../common/Modal'
import { KeyRound, Sliders, SkipForward, Flag } from 'lucide-react';
import type { Album } from '../../types/database'
import AlbumButtons from './AlbumButtons'

interface InfoModalProps {
  minSongLyricCount: number
  guessCount: number
  songCount: number
  albums: Album[]
  showAlbumFilters: boolean
  showFlagIcon: boolean
  onClose: () => void
}

export default function InfoModal({ minSongLyricCount, guessCount, songCount, albums, showAlbumFilters, showFlagIcon, onClose }: InfoModalProps) {
  return (
    <Modal onClose={onClose} showEaseIn={true}>
      <h2 className="text-xl font-bold text-primary mb-1 tracking-wide">How to Play</h2>
      <div className="space-y-2 md:space-y-3 text-base text-neutral-600">
        <div>
          <h3 className="font-semibold text-neutral-800 tracking-wide mb-1">1. Guess the {minSongLyricCount === 1 ? 'Word' : `${minSongLyricCount > 0 ? `${minSongLyricCount} ` : ''}Words`}</h3>
          <p className="mb-1">
            {minSongLyricCount === 1 ? 'The tab shows' : 'Each tab shows'} a word from the song.
            <span className="hidden md:inline"> Click </span>
            <span className="inline md:hidden"> Swipe </span>
            through the images for clues. Type and press Enter for unlimited attempts.
          </p>
          <ul>
            <li className="flex items-center"><KeyRound size={15} strokeWidth={3} className="mr-2 text-primary"/>Reveal correct word</li>
            {showFlagIcon && <li className="flex items-center"><Flag size={15} strokeWidth={3} className="mr-2 text-primary"/>Flag word for review</li>}
          </ul>
        </div>
        {showAlbumFilters && (
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">2. Guess the Album</h3>
            <div>
              {albums.length > 0 && <AlbumButtons albums={albums} readonly list />}
            </div>
          </div>
        )}
        {!showAlbumFilters && (
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">2. Show the Album</h3>
            <p>
              <span className="hidden md:inline">Click </span>
              <span className="inline md:hidden">Tap </span>
              <span className="text-primary font-semibold">Show Album </span>for a hint.
            </p>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-neutral-800 mb-1">3. Guess the Song</h3>
          <p className="mb-1">
            You have {guessCount} chances. Play all {songCount} songs!
          </p>
          <ul>
            <li className="flex items-center"><Sliders size={15} strokeWidth={3} className="mr-2 text-primary"/>Manage levels and game history</li>
            <li className="flex items-center"><SkipForward size={15} strokeWidth={3} className="mr-2 text-primary"/>Skip song</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
