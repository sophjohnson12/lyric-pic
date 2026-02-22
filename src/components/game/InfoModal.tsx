import Modal from '../common/Modal'
import { LockOpen, History, SkipForward, RefreshCw } from 'lucide-react';
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
      <div className="space-y-3 text-sm text-text/80">
        <div>
          <p className="font-semibold text-text">1. Guess the Words</p>
          <p>Each picture represents a word from a song's lyrics. Type a guess and press Enter.</p>
        </div>
        <div>
          <p className="font-semibold text-text">2. Guess the Album</p>
          <p className="mb-2">Click the buttons to guess the album.</p>
          {albums.length > 0 && <AlbumButtons albums={albums} readonly list />}
        </div>        
        <div>
          <p className="font-semibold text-text">3. Guess the Song</p>
          <p>Select a song from the dropdown and click Submit.</p>
        </div>
        <div>
          <p className="font-semibold text-text">4. Need Help?</p>
          <ul className="space-y-1">
            <li className="flex items-center"><RefreshCw size={15} className="mr-2"/> Load new image</li>
            <li className="flex items-center"><LockOpen size={15} className="mr-2"/> Reveal correct word</li>
            <li className="flex items-center"> <History size={15} className="mr-2"/> View  played songs</li>
            <li className="flex items-center"><SkipForward size={15} className="mr-2"/>  Skip song</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
