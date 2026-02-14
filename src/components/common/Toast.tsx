interface ToastProps {
  message: string | null
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
      {message}
    </div>
  )
}
