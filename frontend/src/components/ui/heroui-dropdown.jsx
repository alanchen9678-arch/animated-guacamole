"use client"

import "@heroui/styles/css"
import "./heroui-dropdown-utils/index.css"
import { useEffect, useRef, useState } from "react"
import {
  Avatar,
  Button,
  Description,
  Dropdown,
  Header,
  Kbd,
  Label,
  Separator,
} from "@heroui/react"

function cn(...values) {
  return values.filter(Boolean).join(" ")
}

export function AuroraDropdown({
  items,
  selectedKey,
  onSelectionChange,
  placeholder = "Select an option",
  ariaLabel = "Select an option",
  buttonClassName = "",
  popoverClassName = "",
  menuClassName = "",
  itemClassName = "",
  triggerLabelClassName = "",
  renderItemLabel,
  renderTriggerLabel,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const selectedItem = items.find((item) => item.value === selectedKey) ?? null
  const triggerLabel = renderTriggerLabel
    ? renderTriggerLabel(selectedItem)
    : selectedItem?.label ?? placeholder

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown, true)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  function focusItem(index) {
    const options = menuRef.current?.querySelectorAll('[role="option"]')
    if (!options?.length) return
    options[Math.max(0, Math.min(index, options.length - 1))]?.focus()
  }

  function handleOptionKeyDown(event, index) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusItem(index + 1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      focusItem(index - 1)
    } else if (event.key === "Home") {
      event.preventDefault()
      focusItem(0)
    } else if (event.key === "End") {
      event.preventDefault()
      focusItem(items.length - 1)
    }
  }

  function selectItem(value) {
    onSelectionChange?.(String(value))
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="aurora-dropdown-shell" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn("aurora-dropdown-trigger", buttonClassName)}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setIsOpen(true)
            requestAnimationFrame(() => focusItem(0))
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span
          className={cn(
            "aurora-dropdown-trigger-label",
            !selectedItem && "aurora-dropdown-trigger-label--placeholder",
            triggerLabelClassName,
          )}
        >
          {triggerLabel}
        </span>
        <span className="aurora-dropdown-trigger-icon" aria-hidden="true">{"\u25BE"}</span>
      </button>

      {isOpen && (
        <div className={cn("aurora-dropdown-popover", popoverClassName)}>
          <div
            aria-label={ariaLabel}
            className={cn("aurora-dropdown-menu", menuClassName)}
            ref={menuRef}
            role="listbox"
          >
            {items.map((item, index) => {
              const isSelected = item.value === selectedKey
              return (
                <button
                  aria-selected={isSelected}
                  className={cn("aurora-dropdown-item", itemClassName)}
                  key={item.value}
                  onClick={() => selectItem(item.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  role="option"
                  type="button"
                >
                  <span className="aurora-dropdown-item-row">
                    <span className="aurora-dropdown-item-copy">
                      {renderItemLabel ? renderItemLabel(item) : item.label}
                    </span>
                    <span
                      className={cn(
                        "aurora-dropdown-item-check",
                        isSelected && "aurora-dropdown-item-check--selected",
                      )}
                      aria-hidden="true"
                    >
                      {"\u2713"}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export {
  Avatar,
  Button,
  Description,
  Dropdown,
  Header,
  Kbd,
  Label,
  Separator,
}
export default Dropdown
