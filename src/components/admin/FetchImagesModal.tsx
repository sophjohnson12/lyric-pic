import { useState } from 'react'
import Modal from '../common/Modal'

interface FetchImagesModalProps {
  onConfirm: (api: string, count: number) => void
  onCancel: () => void
}

export default function FetchImagesModal({ onConfirm, onCancel }: FetchImagesModalProps) {
  const [api, setApi] = useState('pexels')
  const [count, setCount] = useState(5)

  return (
    <Modal onClose={onCancel}>
      <h2 className="text-lg font-bold mb-4">Fetch Images</h2>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">API</label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="fetch-api"
            value="pexels"
            checked={api === 'pexels'}
            onChange={() => setApi('pexels')}
          />
          Pexels
        </label>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-1">Count</label>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          className="w-24 px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(api, count)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
        >
          Fetch
        </button>
      </div>
    </Modal>
  )
}
