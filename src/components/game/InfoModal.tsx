import Modal from '../common/Modal'
import { KeyRound, Sliders, SkipForward, Map, Flag } from 'lucide-react';
import type { Album } from '../../types/database'
import AlbumButtons from './AlbumButtons'

interface InfoModalProps {
  minSongLyricCount: number
  minImageCount: number
  maxImageCount: number
  guessCount: number
  songCount: number
  albums: Album[]
  showAlbumFilters: boolean
  showFlagIcon: boolean
  showMapButton: boolean
  levelName: string
  onClose: () => void
}

export default function InfoModal({ minSongLyricCount, minImageCount, maxImageCount, guessCount, songCount, albums, showAlbumFilters, showFlagIcon, showMapButton, levelName, onClose }: InfoModalProps) {
  return (
    <Modal onClose={onClose} showEaseIn={true}>
      <h2 className="text-xl font-bold text-primary md:mb-1 tracking-wide">How to Play</h2>
      <div className="text-sm mb-0.5 md:mb-1">
        <span className="text-neutral-600 font-semibold">Level: </span>
        <span className="text-neutral-700 font-normal">{levelName}</span>
      </div>
      <div className="space-y-1 md:space-y-2 text-base text-neutral-600">
        <div>
          <h3 className="font-semibold text-neutral-800 tracking-wide mb-0.5 md:mb-1">1. Guess the {minSongLyricCount === 1 ? 'Word' : `${minSongLyricCount > 0 ? `${minSongLyricCount} ` : ''}Words`}</h3>
          <p className="mb-0.5">
            <span className="inline md:hidden">
              {minSongLyricCount === 1 ? 'The tab' : 'Each tab'} has {minImageCount}–{maxImageCount} pictures that represent a word from the song.
              Swipe to see all pictures. 
            </span>
            <span className="hidden md:inline">
              {minSongLyricCount === 1 ? 'The box' : 'Each box'} has {minImageCount}–{maxImageCount} pictures that represent a word from the song.
              Click the arrows to see all pictures. 
            </span>
            <span> Press Enter to submit your guess. You have unlimited attempts!</span>
          </p>
          <ul>
            <li className="flex items-center"><KeyRound size={15} strokeWidth={3} className="mr-2 text-primary"/>Reveal correct word</li>
            {showFlagIcon && <li className="flex items-center"><Flag size={15} strokeWidth={3} className="mr-2 text-primary"/>Flag word for review</li>}
          </ul>
        </div>
        {showAlbumFilters && (
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-0.5 md:mb-1">2. Guess the Album</h3>
            <div>
              {albums.length > 0 && <AlbumButtons albums={albums} readonly list />}
            </div>
          </div>
        )}
        {!showAlbumFilters && (
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-0.5 md:mb-1">2. Show the Album</h3>
            <p>
              <span className="hidden md:inline">Click </span>
              <span className="inline md:hidden">Tap </span>
              <span className="text-primary font-semibold">Show Album </span>for a hint.
            </p>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-neutral-800 mb-0.5 md:mb-1">3. Guess the Song</h3>
          <p className="mb-0.5 md:mb-1">
            You have {guessCount} chances. Play all {songCount} songs!
          </p>
          <ul className="space-y-0.5 md:space-y-1">
            <li className="flex items-center"><Sliders size={15} strokeWidth={3} className="mr-2 text-primary"/>Manage levels and game history</li>
            {showMapButton && <li className="flex items-center"><Map size={15} strokeWidth={3} className="mr-2 text-primary"/>View landmark map</li>}
            <li className="flex items-center"><SkipForward size={15} strokeWidth={3} className="mr-2 text-primary"/>Skip song</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
