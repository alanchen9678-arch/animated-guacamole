import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => (
    !element.hidden
    && element.getAttribute('aria-hidden') !== 'true'
    && element.getClientRects().length > 0
  ))
}

/**
 * Supplies the interaction behavior expected of an ARIA modal dialog while
 * leaving each surface's existing visual design and actions untouched.
 */
export function useAccessibleDialog({
  open,
  containerRef,
  dialogRef,
  initialFocusRef,
  onClose,
}) {
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const container = containerRef.current
    const dialog = dialogRef.current
    if (!container || !dialog) return undefined

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const siblingStates = [...(container.parentElement?.children ?? [])]
      .filter((element) => element !== container && element instanceof HTMLElement)
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'),
      }))

    siblingStates.forEach(({ element }) => {
      element.inert = true
      element.setAttribute('aria-hidden', 'true')
    })

    const focusFrame = window.requestAnimationFrame(() => {
      const preferredTarget = initialFocusRef?.current
      const target = preferredTarget ?? getFocusableElements(dialog)[0] ?? dialog
      target.focus()
    })

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(dialog)
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (!dialog.contains(activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (activeElement === first || activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown, true)
      siblingStates.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert
        if (ariaHidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', ariaHidden)
      })

      window.requestAnimationFrame(() => {
        if (previouslyFocused?.isConnected) previouslyFocused.focus()
      })
    }
  }, [containerRef, dialogRef, initialFocusRef, open])
}