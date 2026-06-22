import { useEffect, useMemo, useRef, useState } from 'react'

function normalizeHex(color) {
  const raw = color.trim()
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('')}`.toUpperCase()
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase()
  return '#111827'
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()
}

function hexToHsl(hex) {
  const { red, green, blue } = hexToRgb(hex)
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h, s, l) {
  const saturation = s / 100
  const lightness = l / 100
  const a = saturation * Math.min(lightness, 1 - lightness)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
  }

  return rgbToHex(f(0), f(8), f(4))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseTextColor(value) {
  if (!value) return null
  if (/^#[0-9a-f]{3}$/i.test(value) || /^#[0-9a-f]{6}$/i.test(value)) {
    return normalizeHex(value)
  }
  return null
}

function getLuminance(hex) {
  const { red, green, blue } = hexToRgb(hex)
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
}

export default function ColorPickerMenu({
  color,
  onChange,
  disabled = false,
  presetColors = [],
  ariaLabel = 'Custom color picker',
}) {
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const squareRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(normalizeHex(color))
  const [hsl, setHsl] = useState(() => hexToHsl(color))

  useEffect(() => {
    const next = normalizeHex(color)
    setInputValue(next)
    setHsl(hexToHsl(next))
  }, [color])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (
        popoverRef.current?.contains(event.target) ||
        triggerRef.current?.contains(event.target)
      ) {
        return
      }
      setOpen(false)
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const currentColor = useMemo(() => normalizeHex(color), [color])
  const isPresetColor = useMemo(
    () => presetColors.some((preset) => normalizeHex(preset) === currentColor),
    [currentColor, presetColors],
  )
  const isCustomSelected = !isPresetColor
  const checkmarkDark = getLuminance(currentColor) > 0.6

  function handleHueChange(event) {
    const hue = Number(event.target.value)
    const next = [hue, hsl[1], hsl[2]]
    setHsl(next)
    const nextHex = hslToHex(next[0], next[1], next[2])
    setInputValue(nextHex)
    onChange(nextHex)
  }

  function updateFromSquare(clientX, clientY) {
    const rect = squareRef.current?.getBoundingClientRect()
    if (!rect) return
    const saturation = clamp(Math.round(((clientX - rect.left) / rect.width) * 100), 0, 100)
    const lightness = clamp(Math.round(100 - ((clientY - rect.top) / rect.height) * 100), 0, 100)
    const next = [hsl[0], saturation, lightness]
    setHsl(next)
    const nextHex = hslToHex(next[0], next[1], next[2])
    setInputValue(nextHex)
    onChange(nextHex)
  }

  function handleSquarePointerDown(event) {
    event.preventDefault()
    updateFromSquare(event.clientX, event.clientY)

    function handleMove(moveEvent) {
      updateFromSquare(moveEvent.clientX, moveEvent.clientY)
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  function handleInputChange(event) {
    const next = event.target.value.toUpperCase()
    setInputValue(next)
    const parsed = parseTextColor(next)
    if (parsed) {
      setHsl(hexToHsl(parsed))
      onChange(parsed)
    }
  }

  return (
    <div className="cp-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`cp-trigger${open ? ' cp-trigger--open' : ''}${isCustomSelected ? ' cp-trigger--selected' : ''}`}
        onClick={() => !disabled && setOpen((value) => !value)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className="cp-trigger-wheel" />
        {isCustomSelected && (
          <span
            className={`cp-trigger-check${checkmarkDark ? ' cp-trigger-check--dark' : ''}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 12 12" fill="none" role="presentation">
              <polyline points="2.5 6 5 8.5 9.5 3" />
            </svg>
          </span>
        )}
        <span className="cp-trigger-dot" style={{ background: currentColor }} />
      </button>

      {open && (
        <div ref={popoverRef} className="cp-popover" role="dialog" aria-label="Color picker">
          <div
            ref={squareRef}
            className="cp-square"
            style={{
              background: `
                linear-gradient(to top, rgba(0, 0, 0, 1), transparent),
                linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0)),
                hsl(${hsl[0]} 100% 50%)
              `,
            }}
            onPointerDown={handleSquarePointerDown}
          >
            <span
              className="cp-square-handle"
              style={{
                left: `${hsl[1]}%`,
                top: `${100 - hsl[2]}%`,
                background: currentColor,
              }}
            />
          </div>

          <input
            className="cp-hue"
            type="range"
            min="0"
            max="360"
            value={hsl[0]}
            onChange={handleHueChange}
            aria-label="Hue"
          />

          <div className="cp-input-row">
            <input
              className="cp-input"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="#RRGGBB"
              aria-label="Color hex code"
            />
            <span className="cp-preview" style={{ background: currentColor }} />
          </div>
        </div>
      )}
    </div>
  )
}
