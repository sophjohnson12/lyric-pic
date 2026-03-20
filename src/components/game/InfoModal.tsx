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
      <h2 className="text-xl font-bold text-primary mb-4">How to Play</h2>
      <div className="space-y-4 text-sm text-neutral-600">
        <div>
          <p className="font-semibold text-neutral-800">1. Guess the {minSongLyricCount === 1 ? 'Word' : `${minSongLyricCount > 0 ? `${minSongLyricCount} ` : ''}Words`}</p>
          <p>
            {minSongLyricCount === 1 ? 'The tab shows' : 'Each tab shows'} a word from the song.
            <span className="hidden md:inline"> Click </span>
            <span className="inline md:hidden"> Swipe </span>
            through the images for clues. Type a word and press Enter for unlimited attempts.
          </p>
          <ul className="mt-1 space-y-1">
            <li className="flex items-center"><KeyRound size={15} strokeWidth={3} className="mr-2 text-primary"/> Reveal correct word</li>
            {showFlagIcon && <li className="flex items-center"><Flag size={15} strokeWidth={3} className="mr-2 text-primary"/> Flag word for review</li>}
          </ul>
        </div>
        {showAlbumFilters && (
          <div>
            <p className="font-semibold text-neutral-800">2. Guess the Album</p>
            <p>
              <span className="hidden md:inline">Click </span>
              <span className="inline md:hidden">Tap </span>
              until you guess the album.
            </p>
            <div className="mt-1">
              {albums.length > 0 && <AlbumButtons albums={albums} readonly list />}
            </div>
          </div>
        )}
        {!showAlbumFilters && (
          <div>
            <p className="font-semibold text-neutral-800">2. Show Album</p>
            <p>
              <span className="hidden md:inline">Click </span>
              <span className="inline md:hidden">Tap </span>
              <span className="text-primary font-semibold">Show Album </span>for a hint.
            </p>
          </div>
        )}
        <div>
          <p className="font-semibold text-neutral-800">3. Guess the Song</p>
          <p>
            <span className="inline md:hidden">
              Tap
              <span className="text-primary font-semibold"> Guess Song </span>
              to open the song picker.{' '}
            </span>
            You have {guessCount} chances to select a song and
            <span className="hidden md:inline"> click </span>
            <span className="inline md:hidden"> press </span>
            Submit.
            <span> Play all {songCount} songs!</span>
          </p>
          <ul className="mt-1 space-y-1">
            <li className="flex items-center"><Sliders size={15} strokeWidth={3} className="mr-2 text-primary"/> Manage levels, settings, and game history</li>
            <li className="flex items-center"><SkipForward size={15} strokeWidth={3} className="mr-2 text-primary"/>  Skip song</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
