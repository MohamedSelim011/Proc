type ThemeCssVariables = Record<string, string>

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
const RGB_TRIPLET_REGEX =
  /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/

const clamp = (n: number): number => Math.max(0, Math.min(255, n))

const normalizeHexToRgbTriplet = (hex: string): string => {
  const value = hex.replace('#', '')
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : value
  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

const normalizeRgbValue = (input?: string, fallback = '255 87 34'): string => {
  const raw = (input || '').trim()
  if (!raw) return fallback

  if (HEX_COLOR_REGEX.test(raw)) {
    return normalizeHexToRgbTriplet(raw)
  }

  const rgbMatch = raw.match(RGB_TRIPLET_REGEX)
  if (rgbMatch) {
    const r = clamp(Number(rgbMatch[1]))
    const g = clamp(Number(rgbMatch[2]))
    const b = clamp(Number(rgbMatch[3]))
    return `${r} ${g} ${b}`
  }

  return fallback
}

export function resolveThemeCssVariables(): ThemeCssVariables {
  const primary = normalizeRgbValue(process.env.THEME_PRIMARY_COLOR, '255 87 34')
  const primaryHover = normalizeRgbValue(
    process.env.THEME_PRIMARY_HOVER_COLOR,
    '230 74 25'
  )
  const secondary = normalizeRgbValue(
    process.env.THEME_SECONDARY_COLOR,
    '250 99 53'
  )
  const secondaryHover = normalizeRgbValue(
    process.env.THEME_SECONDARY_HOVER_COLOR,
    '232 90 47'
  )

  return {
    '--wujha-primary': primary,
    '--wujha-primary-hover': primaryHover,
    '--wujha-secondary': secondary,
    '--wujha-secondary-hover': secondaryHover,
  }
}

