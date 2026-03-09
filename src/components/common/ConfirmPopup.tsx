import Modal from './Modal'

interface ConfirmPopupProps {
  title?: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export default function ConfirmPopup({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
}: ConfirmPopupProps) {
  return (
    <Modal onClose={onCancel} showClose={false}>
      {title && <h2 className="text-lg font-bold text-primary mb-2">{title}</h2>}
      {message && <p className="text-sm mb-6">{message}</p>}
      <div className="flex gap-3 md:justify-end">
        <button
          onClick={onCancel}
          className="flex-1 md:flex-none bg-gray-200 text-neutral-800 px-4 py-2 h-12 md:h-auto rounded-lg font-semibold hover:opacity-90 cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          autoFocus
          className="flex-1 md:flex-none bg-primary text-white px-4 py-2 h-12 md:h-auto rounded-lg font-medium hover:opacity-90 cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
