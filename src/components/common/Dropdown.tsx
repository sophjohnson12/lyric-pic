import { useState, useRef, useEffect } from 'react'

interface DropdownOption {
  id: number | null
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
  placeholder: string
  onSelect: (id: number | null, label: string) => void
  disabled?: boolean
  excludeLabels?: string[]
}

export default function Dropdown({ options, placeholder, onSelect, disabled = false, excludeLabels = [] }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = options.filter(
    (opt) =>
      !excludeLabels.map((l) => l.toLowerCase()).includes(opt.label.toLowerCase()) &&
      opt.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (opt: DropdownOption) => {
    setSelectedLabel(opt.label)
    setSearch('')
    setIsOpen(false)
    onSelect(opt.id, opt.label)
  }

  const handleInputChange = (value: string) => {
    setSearch(value)
    setSelectedLabel('')
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={selectedLabel || search}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-200 text-text disabled:opacity-50 text-base focus:border-gray-200 focus:outline-none"
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-30 w-full bg-white rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((opt) => (
            <li
              key={`${opt.id}-${opt.label}`}
              onClick={() => handleSelect(opt)}
              className="px-3 py-2 hover:bg-primary/10 cursor-pointer text-sm text-text"
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
