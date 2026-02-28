import type { ReactNode } from 'react'

interface ModalProps {
  children: ReactNode
  onClose?: () => void
  showClose?: boolean
}

export default function Modal({ children, onClose, showClose = true }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-bg text-text rounded-2xl shadow-xl p-6 mx-4 max-w-md w-full max-h-[80vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 h-12 w-12 flex items-center justify-center text-text/60 hover:text-text text-xl leading-none cursor-pointer"
          >
            &times;
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
