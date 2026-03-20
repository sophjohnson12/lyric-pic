import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'

interface ModalProps {
  children: ReactNode
  onClose?: () => void
  showClose?: boolean
  showEaseIn?: boolean
  /** When true, locks the modal's top position after the opening animation so the
   *  modal shrinks downward instead of re-centering when its content gets shorter. */
  lockTop?: boolean
}

export default function Modal({ children, onClose, showClose = true, showEaseIn = false, lockTop = false }: ModalProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [lockedTop, setLockedTop] = useState<number | null>(null)

  // After the opening animation completes, measure and lock the modal's top position.
  useEffect(() => {
    if (!lockTop) return
    const timer = setTimeout(() => {
      if (innerRef.current) {
        setLockedTop(innerRef.current.getBoundingClientRect().top)
      }
    }, 350) // > animation duration (250ms)
    return () => clearTimeout(timer)
  }, [lockTop])

  useEffect(() => {
    if (!onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      initial={showEaseIn ? { opacity: 0 } : { opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: showEaseIn ? 0.2 : 0 }}
      className={`fixed inset-0 z-60 flex ${lockedTop !== null ? 'items-start' : 'items-center'} justify-center bg-black/50`}
      style={lockedTop !== null ? { paddingTop: lockedTop } : undefined}
      onClick={onClose}
    >
      <motion.div
        ref={innerRef}
        initial={showEaseIn ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: showEaseIn ? 0.25 : 0, ease: 'easeOut' }}
        className="bg-neutral-50 text-neutral-800 rounded-2xl shadow-xl p-6 mx-4 max-w-lg w-full min-w-2xs max-h-[80vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && onClose && (
          <button
            onClick={onClose}
            autoFocus
            className="absolute top-2 right-2 h-12 w-12 md:h-auto md:w-auto md:p-2 flex items-center justify-center text-neutral-500 hover:text-neutral-800 rounded-full transition-colors hover:text-neutral-800 text-xl leading-none cursor-pointer max-sm:focus:outline-none"
          >
            <X size={20} className="drop-shadow-md" ></X>
          </button>
        )}
        {children}
      </motion.div>
    </motion.div>
  )
}
