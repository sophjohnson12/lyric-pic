import Modal from '../common/Modal'
import { LockOpen, History, SkipForward, RefreshCw, Flag } from 'lucide-react';
import type { Album } from '../../types/database'
import AlbumButtons from './AlbumDropdown'

interface InfoModalProps {
  albums: Album[]
  onClose: () => void
}

export default function InfoModal({ albums, onClose }: InfoModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-primary mb-4">How to Play</h2>
      <div className="space-y-4 text-sm text-text/80">
        <div>
          <p className="font-semibold text-text">1. Guess the Words</p>
          <p> Each picture represents a word from a song's lyrics. Type a guess and press the Enter key.</p>
          <ul className="mt-1 space-y-1">
            <li className="flex items-center"><RefreshCw size={15} strokeWidth={3} className="mr-2 text-primary"/> Load new picture</li>
            <li className="flex items-center"><LockOpen size={15} strokeWidth={3} className="mr-2 text-primary"/> Reveal correct word</li>
            <li className="flex items-center"><Flag size={15} strokeWidth={3} className="mr-2 text-primary"/> Flag word for review</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-text">2. Guess the Album</p>
          <p className="hidden md:inline">Click the buttons to guess the album.</p>
          <p className="inline md:hidden">Tap the buttons to guess the album.</p>
          <div className="mt-1">
            {albums.length > 0 && <AlbumButtons albums={albums} readonly list />}
          </div>
        </div>        
        <div>
          <p className="font-semibold text-text">3. Guess the Song</p>
          <p>
            <span className="hidden md:inline">Select a song from the dropdown and click the Submit button.</span>
            <span className="inline md:hidden">Select a song and press the Submit button.</span>
            <span> Play until you guess them all!</span>
          </p>
          <ul className="mt-1 space-y-1">
            <li className="flex items-center"> <History size={15} strokeWidth={3} className="mr-2 text-primary"/> View  played songs</li>
            <li className="flex items-center"><SkipForward size={15} strokeWidth={3} className="mr-2 text-primary"/>  Skip song</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
