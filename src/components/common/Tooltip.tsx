interface TooltipProps {
  borderColor?: string
  overlayColor?: string
  children: React.ReactNode
}

export default function Tooltip({ borderColor = 'var(--color-theme-primary)', overlayColor, children }: TooltipProps) {
  return (
    <div
      className="absolute z-20 pointer-events-none flex flex-col items-center"
      style={{ bottom: '50%', left: '50%', transform: 'translateX(-50%)', width: 'clamp(150px, 20vw, 280px)' }}
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
      <div style={{
        width: 0,
        height: 0,
        borderLeft: '9px solid transparent',
        borderRight: '9px solid transparent',
        borderTop: `9px solid ${borderColor}`,
      }} />
    </div>
  )
}
