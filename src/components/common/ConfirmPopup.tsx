import Modal from './Modal'

interface ConfirmPopupProps {
  title?: string
  message: string
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
      <p className="text-sm mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
