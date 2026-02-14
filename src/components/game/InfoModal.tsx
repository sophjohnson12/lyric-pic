import Modal from '../common/Modal'

interface InfoModalProps {
  onClose: () => void
}

export default function InfoModal({ onClose }: InfoModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-primary mb-4">How to Play</h2>
      <div className="space-y-3 text-sm text-text/80">
        <div>
          <p className="font-semibold text-text">1. Guess the Words</p>
          <p>Each image represents a word from a song's lyrics. Type your guesses in any order and press Enter.</p>
        </div>
        <div>
          <p className="font-semibold text-text">2. Guess the Song</p>
          <p>After guessing all three words, select the album (optional) and song from the dropdowns.</p>
        </div>
        <div>
          <p className="font-semibold text-text">3. Need Help?</p>
          <ul className="ml-4 space-y-1">
            <li>🔄 Refresh - Get a different image for that word</li>
            <li>👁️ Reveal - Show the correct answer</li>
            <li>⏭️ Skip - Move to the next song without revealing answers</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-text">4. Have Fun!</p>
          <p>No duplicate songs in your session. Check your history anytime to see what you've played.</p>
        </div>
      </div>
    </Modal>
  )
}
