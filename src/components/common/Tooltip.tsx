interface TooltipProps {
  borderColor?: string
  overlayColor?: string
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

export default function Tooltip({ borderColor = 'var(--color-theme-primary)', overlayColor, children }: TooltipProps) {
  return (
    <div
      className="absolute z-20 pointer-events-none flex flex-col items-center"
      style={{ bottom: 'calc(50% + 11px)', left: '50%', transform: 'translateX(-50%)', width: 'clamp(150px, 20vw, 280px)' }}
    >
      <div
        className="relative rounded-lg shadow-xl overflow-hidden w-full"
        style={{ border: `1px solid ${borderColor}` }}
      >
        <div className="absolute inset-0 bg-neutral-50" />
        {overlayColor && <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />}
        <div className="relative z-10 p-3 text-center">
          {children}
        </div>
      </div>
      <div style={{ position: 'relative', width: 0, height: 0, marginTop: -1, zIndex: 1 }}>
        <div style={{
          position: 'absolute',
          top: 0, left: -11,
          width: 0, height: 0,
          borderLeft: '11px solid transparent',
          borderRight: '11px solid transparent',
          borderTop: `11px solid ${borderColor}`,
        }} />
        <div style={{
          position: 'absolute',
          top: 0, left: -9,
          width: 0, height: 0,
          borderLeft: '9px solid transparent',
          borderRight: '9px solid transparent',
          borderTop: `9px solid ${caretFill(overlayColor)}`,
        }} />
      </div>
    </div>
  )
}
