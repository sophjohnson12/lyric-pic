import { useState, useLayoutEffect, useRef } from 'react'

interface TooltipProps {
  borderColor?: string
  overlayColor?: string
  topMargin?: number
  exiting?: boolean
  children: React.ReactNode
}

function caretFill(overlayColor?: string): string {
  const base = 250 // neutral-50 = #fafafa = rgb(250, 250, 250)
  if (!overlayColor) return `rgb(${base}, ${base}, ${base})`
  const match = overlayColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) return `rgb(${base}, ${base}, ${base})`
  const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3])
  const a = match[4] ? parseFloat(match[4]) : 1
  return `rgb(${Math.round(r * a + base * (1 - a))}, ${Math.round(g * a + base * (1 - a))}, ${Math.round(b * a + base * (1 - a))})`
}

const MARGIN = 8

export default function Tooltip({ borderColor = 'var(--color-theme-primary)', overlayColor, topMargin = MARGIN, exiting, children }: TooltipProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isBelow, setIsBelow] = useState(false)
  const [xShift, setXShift] = useState(0)
  const [caretOffset, setCaretOffset] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < topMargin) setIsBelow(true)
    let shift = 0
    if (rect.left < MARGIN) shift = MARGIN - rect.left
    else if (rect.right > window.innerWidth - MARGIN) shift = (window.innerWidth - MARGIN) - rect.right
    if (shift !== 0) {
      setXShift(shift)
      // Caret should counter-shift by -shift to keep pointing at anchor, but clamp
      // so it never overhangs the rounded corners (border-radius=8, caret half-width=11)
      const maxOffset = rect.width / 2 - 8 - 11
      setCaretOffset(Math.max(-maxOffset, Math.min(maxOffset, -shift)))
    }
  }, [])

  const box = (
    <div className="relative rounded-lg shadow-xl overflow-hidden w-full" style={{ border: `1px solid ${borderColor}` }}>
      <div className="absolute inset-0 bg-neutral-50" />
      {overlayColor && <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />}
      <div className="relative z-10 p-3 text-center">{children}</div>
    </div>
  )

  const caret = (
    <div style={{
      position: 'relative', width: 0, height: 0,
      ...(isBelow ? { marginBottom: -1 } : { marginTop: -1 }),
      zIndex: 1,
      left: caretOffset,
    }}>
      <div style={{
        position: 'absolute', top: isBelow ? -11 : 0, left: -11, width: 0, height: 0,
        borderLeft: '11px solid transparent',
        borderRight: '11px solid transparent',
        ...(isBelow ? { borderBottom: `11px solid ${borderColor}` } : { borderTop: `11px solid ${borderColor}` }),
      }} />
      <div style={{
        position: 'absolute', top: isBelow ? -9 : 0, left: -9, width: 0, height: 0,
        borderLeft: '9px solid transparent',
        borderRight: '9px solid transparent',
        ...(isBelow ? { borderBottom: `9px solid ${caretFill(overlayColor)}` } : { borderTop: `9px solid ${caretFill(overlayColor)}` }),
      }} />
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="absolute z-20 pointer-events-none flex flex-col items-center"
      style={{
        [isBelow ? 'top' : 'bottom']: 'calc(50% + 11px)',
        left: '50%',
        transform: `translateX(calc(-50% + ${xShift}px))`,
        width: 'clamp(180px, 20vw, 200px)',
        ...(exiting ? { opacity: 0, transition: 'opacity 0.18s ease-out' } : {}),
      }}
    >
      {isBelow ? <>{caret}{box}</> : <>{box}{caret}</>}
    </div>
  )
}
