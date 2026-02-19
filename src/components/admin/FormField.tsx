interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

export default function FormField({ label, required = false, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
