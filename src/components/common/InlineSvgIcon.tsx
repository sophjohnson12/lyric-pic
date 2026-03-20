import { useState, useEffect } from 'react'
import type React from 'react'

const svgCache = new Map<string, string>()

interface Props {
  src: string
  className?: string
  style?: React.CSSProperties
  alt?: string
}

export default function InlineSvgIcon({ src, className = '', style, alt = '' }: Props) {
  const isSvg = src.toLowerCase().endsWith('.svg')
  const [svgContent, setSvgContent] = useState<string | null>(
    isSvg ? (svgCache.get(src) ?? null) : null
  )

  useEffect(() => {
    if (!isSvg) return
    if (svgCache.has(src)) {
      setSvgContent(svgCache.get(src)!)
      return
    }
    let cancelled = false
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        svgCache.set(src, text)
        if (!cancelled) setSvgContent(text)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [src, isSvg])

  if (!isSvg) {
    return <img src={src} alt={alt} className={className} style={style} />
  }

  if (!svgContent) return <span className={className} style={style} />

  return (
    <span
      className={`[&>svg]:w-full [&>svg]:h-full [&>svg]:block ${className}`}
      style={style}
      aria-label={alt}
      role="img"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
