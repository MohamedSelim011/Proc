import React from 'react'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/common/searchable-select'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, children, ...props }, _ref) => {
    const normalizedLabel = label?.trim()
    const autoPlaceholder =
      placeholder?.trim() ||
      (normalizedLabel ? `Select ${normalizedLabel}` : 'Select value')

    const optionsList = options ?? []
    const hasEmptyOption = optionsList.some((option) => option.value === '')

    const optionChildren = options ? (
      <>
        {!hasEmptyOption && <option value="">{autoPlaceholder}</option>}
        {optionsList.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </>
    ) : (
      children
    )

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <SearchableSelect
          className={cn(error && 'border-red-300 focus:border-red-500 focus:ring-red-100', className)}
          {...props}
        >
          {optionChildren}
        </SearchableSelect>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select, type SelectProps }
