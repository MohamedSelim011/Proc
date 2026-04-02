"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SingleSelectDropdown } from "@/components/common/single-select-dropdown";

type SearchableSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  dropdownClassName?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  clearable?: boolean;
  clearAriaLabel?: string;
};

type ParsedOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function textFromChildren(children: React.ReactNode): string {
  if (children === null || children === undefined || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map((item) => textFromChildren(item)).join("");
  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<{ children?: React.ReactNode }>;
    return textFromChildren(element.props.children);
  }
  return "";
}

function parseOptions(children: React.ReactNode, groupLabel?: string): ParsedOption[] {
  const result: ParsedOption[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const element = child as React.ReactElement<{
      value?: string | number;
      disabled?: boolean;
      label?: string;
      children?: React.ReactNode;
    }>;

    if (element.type === "option") {
      const rawValue = element.props.value;
      const value =
        rawValue !== undefined ? String(rawValue) : textFromChildren(element.props.children);
      const baseLabel = textFromChildren(element.props.children).trim() || value;
      const label = groupLabel ? `${groupLabel} - ${baseLabel}` : baseLabel;
      result.push({
        value,
        label,
        disabled: Boolean(element.props.disabled),
      });
      return;
    }

    if (element.type === "optgroup") {
      const nextGroupLabel = element.props.label ? String(element.props.label) : groupLabel;
      result.push(...parseOptions(element.props.children, nextGroupLabel));
      return;
    }

    if (element.props?.children) {
      result.push(...parseOptions(element.props.children, groupLabel));
    }
  });

  return result;
}

function toTitleCase(text: string) {
  return text
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ""))
    .join(" ");
}

function derivePlaceholder(opts: {
  id?: string;
  name?: string;
  ariaLabel?: string;
}) {
  const fromAria = opts.ariaLabel?.trim();
  if (fromAria) return `Select ${fromAria}`;

  const token = opts.name?.trim() || opts.id?.trim();
  if (!token) return "Select value";
  const normalized = toTitleCase(token);
  return normalized ? `Select ${normalized}` : "Select value";
}

export function SearchableSelect({
  children,
  value,
  defaultValue,
  onChange,
  disabled = false,
  className,
  id,
  name,
  required = false,
  dropdownClassName,
  searchPlaceholder,
  noResultsText = "No matching options.",
  clearable = false,
  clearAriaLabel,
  ...restProps
}: SearchableSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(String(defaultValue ?? ""));
    }
  }, [defaultValue, isControlled]);

  const parsedOptions = useMemo(() => parseOptions(children), [children]);
  const selectedValue = isControlled ? String(value ?? "") : internalValue;

  const emptyOption = useMemo(
    () => parsedOptions.find((option) => option.value === "") ?? null,
    [parsedOptions],
  );
  const nonEmptyOptions = useMemo(
    () =>
      parsedOptions
        .filter((option) => option.value !== "")
        .map((option) => ({ value: option.value, label: option.label })),
    [parsedOptions],
  );
  const displayPlaceholder =
    emptyOption?.label ??
    derivePlaceholder({
      id,
      name,
      ariaLabel: typeof restProps["aria-label"] === "string" ? restProps["aria-label"] : undefined,
    });
  const normalizedTriggerClassName =
    className !== undefined ? `${className} h-10 py-0` : undefined;

  const handleChange = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.({
      target: { value: nextValue, name: name ?? "", id: id ?? "" },
      currentTarget: { value: nextValue, name: name ?? "", id: id ?? "" },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <>
      <SingleSelectDropdown
        value={selectedValue}
        onValueChange={handleChange}
        placeholder={displayPlaceholder}
        options={nonEmptyOptions}
        className={normalizedTriggerClassName}
        contentClassName={dropdownClassName}
        searchPlaceholder={searchPlaceholder}
        noResultsText={noResultsText}
        disabled={disabled}
        clearable={clearable}
        clearAriaLabel={clearAriaLabel}
        id={id}
        name={name}
        required={required}
      />

      <select
        value={selectedValue}
        onChange={(event) => handleChange(event.target.value)}
        disabled
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        {...restProps}
      >
        {children}
      </select>
    </>
  );
}
