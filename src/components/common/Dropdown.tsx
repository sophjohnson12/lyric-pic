import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string | number
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string | number | null
  onChange: (value: string | number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function Dropdown({ options, value, onChange, placeholder = 'Select…', disabled = false, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value) ?? null

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between gap-2 w-full h-12 px-3 border border-primary/30 rounded-lg bg-neutral-50 text-base focus:outline-none focus:border-primary disabled:opacity-50 cursor-pointer disabled:cursor-default"
      >
        <span className={selectedOption ? 'text-neutral-800' : 'text-neutral-400'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`text-neutral-500 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <ul className="absolute z-30 mt-1 w-full min-w-max bg-white border border-primary/30 rounded-lg shadow-lg overflow-hidden">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              className={`h-12 flex items-center px-3 text-base cursor-pointer hover:bg-primary/10 text-neutral-800 ${opt.value === value ? 'bg-primary/5 font-medium' : ''}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
