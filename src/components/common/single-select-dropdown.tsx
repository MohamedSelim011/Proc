"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

type SingleSelectDropdownProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
  className?: string;
  contentClassName?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  loadingText?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onReachEnd?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  clearAriaLabel?: string;
  id?: string;
  name?: string;
  required?: boolean;
};

export function SingleSelectDropdown({
  value,
  onValueChange,
  placeholder,
  options,
  className,
  contentClassName,
  searchPlaceholder,
  noResultsText = "No matching options.",
  loadingText = "Loading...",
  searchValue,
  onSearchChange,
  onReachEnd,
  hasMore = false,
  loading = false,
  disabled = false,
  clearable = false,
  clearAriaLabel,
  id,
  name,
  required = false,
}: SingleSelectDropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isSearchControlled = onSearchChange !== undefined;
  const effectiveSearch = isSearchControlled ? (searchValue ?? "") : search;
  const [loadMoreRequested, setLoadMoreRequested] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (isSearchControlled) return options;

    const query = effectiveSearch.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [effectiveSearch, isSearchControlled, options]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (isSearchControlled) {
        onSearchChange?.("");
      } else {
        setSearch("");
      }
    }
  }, [isOpen, isSearchControlled, onSearchChange]);

  useEffect(() => {
    if (!loading) {
      setLoadMoreRequested(false);
    }
  }, [loading]);

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue);
    setIsOpen(false);
  };

  const handleSearchChange = (nextValue: string) => {
    if (isSearchControlled) {
      onSearchChange?.(nextValue);
      return;
    }
    setSearch(nextValue);
  };

  const handleOptionsScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading || loadMoreRequested || !onReachEnd) return;
    const target = event.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 28;
    if (isNearBottom) {
      setLoadMoreRequested(true);
      onReachEnd();
    }
  };

  const triggerClassName = [
    "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-900 transition-colors hover:border-wujha-primary/40 focus:outline-none focus:ring-2 focus:ring-wujha-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
    className ?? "",
    "!h-10 !py-0 !items-center",
  ]
    .join(" ")
    .trim();

  const panelClassName = [
    "absolute left-0 z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-xl",
    contentClassName ?? "",
  ]
    .join(" ")
    .trim();

  const searchPlaceholderText = (() => {
    if (searchPlaceholder) return searchPlaceholder;
    const base = placeholder
      .replace(/^select\s+/i, "")
      .replace(/^all\s+/i, "")
      .trim()
      .toLowerCase();
    return base ? `Search ${base}...` : "Search options...";
  })();

  return (
    <div className="flex items-center gap-2" ref={rootRef}>
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          className={triggerClassName}
          onClick={() => setIsOpen((open) => !open)}
          disabled={disabled}
          id={id}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={`block truncate leading-5 ${selectedOption ? "text-gray-900" : "text-gray-500"}`}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {name ? <input type="hidden" name={name} value={value} required={required} /> : null}

        {isOpen ? (
          <div className={panelClassName}>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={effectiveSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={searchPlaceholderText}
                className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary"
              />
            </div>

            <div className="max-h-56 overflow-y-auto" onScroll={handleOptionsScroll}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-gray-100"
                onClick={() => selectValue("")}
              >
                <span>{placeholder}</span>
                {!value ? <Check className="h-4 w-4 text-wujha-primary" /> : null}
              </button>

              {filteredOptions.map((option) => {
                const checked = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-gray-900 transition-colors hover:bg-gray-100"
                    onClick={() => selectValue(option.value)}
                  >
                    <span>{option.label}</span>
                    {checked ? <Check className="h-4 w-4 text-wujha-primary" /> : null}
                  </button>
                );
              })}

              {filteredOptions.length === 0 ? (
                <div className="px-2 py-3 text-sm text-gray-500">{noResultsText}</div>
              ) : null}

              {loading ? (
                <div className="px-2 py-3 text-sm text-gray-500">{loadingText}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {clearable && value ? (
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-500 transition-colors hover:border-wujha-primary/40 hover:text-wujha-primary disabled:cursor-not-allowed disabled:opacity-60"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onValueChange("");
          }}
          aria-label={clearAriaLabel ?? "Clear selection"}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
