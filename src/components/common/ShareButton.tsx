import { useState } from 'react'
import { Share } from 'lucide-react'

interface ShareButtonProps {
  text?: string
  url?: string
  imageUrl?: string
}

export default function ShareButton({ text, url, imageUrl }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)

    if (imageUrl) {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'map.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file] })
            setSharing(false)
            return
          } catch (err) {
            if ((err as DOMException).name === 'AbortError') {
              setSharing(false)
              return
            }
          }
        }
        // Fallback: trigger download
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = 'map.png'
        a.click()
        URL.revokeObjectURL(objectUrl)
      } catch {
        // silently ignore
      }
      setSharing(false)
      return
    }

    const isMac = /Mac/.test(navigator.platform) && !('ontouchstart' in window)
    if (navigator.share) {
      try {
        await navigator.share(isMac ? { text: `${text ?? ''}\n\n${url ?? ''}` } : { text, url })
        setSharing(false)
        return
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') {
          setSharing(false)
          return
        }
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text ?? ''}\n\n${url ?? ''}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently ignore
    }
    setSharing(false)
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="h-12 px-2 text-primary rounded-3xl text-base font-medium cursor-pointer flex items-center gap-1 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-default disabled:hover:scale-100"
    >
      <Share size={20} />
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
