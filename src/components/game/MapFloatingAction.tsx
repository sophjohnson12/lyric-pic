interface MapFloatingActionProps {
  buttonText: string
  messageText: string
  onClick: () => void
  disabled?: boolean
}

export default function MapFloatingAction({ buttonText, messageText, onClick, disabled }: MapFloatingActionProps) {
  return (
    <>
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-30 w-fit bg-neutral-50/25 backdrop-blur-3xl rounded-3xl p-1">
        <div className="text-xs text-neutral-800 whitespace-nowrap">
          {messageText}
        </div>
      </div>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 bg-neutral-50 rounded-3xl [will-change:transform] shadow-sm">
        <button
          onClick={onClick}
          disabled={disabled}
          className="h-12 py-2 px-4 bg-primary text-neutral-100 rounded-3xl text-lg font-semibold hover:text-white hover:opacity-90 cursor-pointer border border-secondary flex items-center gap-1 whitespace-nowrap disabled:opacity-60 disabled:cursor-default disabled:pointer-events-none"
        >
          {buttonText}
        </button>
      </div>
    </>
  )
}
