import { ReactNode } from 'react';
import { Filter } from 'lucide-react';

interface ListFiltersCardProps {
  children: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  title?: string;
  className?: string;
  columnsClassName?: string;
}

interface ListFilterFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ListFiltersCard({
  children,
  onClear,
  clearLabel = 'Clear All',
  title = 'Filters',
  className = '',
  columnsClassName = 'grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4',
}: ListFiltersCardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 md:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-wujha-primary hover:text-wujha-primary-hover"
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className={columnsClassName}>{children}</div>
    </div>
  );
}

export function ListFilterField({ label, children, className = '' }: ListFilterFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="erp-label">{label}</label>
      {children}
    </div>
  );
}
