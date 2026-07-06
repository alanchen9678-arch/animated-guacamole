import { useLayoutEffect, useRef } from 'react'

export function useTextareaResize(value, rows = 1) {
  const textareaRef = useRef(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const computedStyle = window.getComputedStyle(textarea)
    const lineHeight = Number.parseInt(computedStyle.lineHeight, 10) || 20
    const padding =
      Number.parseInt(computedStyle.paddingTop, 10) +
      Number.parseInt(computedStyle.paddingBottom, 10)

    const minHeight = lineHeight * rows + padding

    textarea.style.height = '0px'
    const scrollHeight = Math.max(textarea.scrollHeight, minHeight)
    textarea.style.height = `${scrollHeight + 2}px`
  }, [value, rows])

  return textareaRef
}
