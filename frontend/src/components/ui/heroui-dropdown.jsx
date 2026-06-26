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
  placement = "bottom start",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const suppressNextOpenRef = useRef(false)
  const selectedItem = items.find((item) => item.value === selectedKey) ?? null
  const triggerLabel = renderTriggerLabel
    ? renderTriggerLabel(selectedItem)
    : selectedItem?.label ?? placeholder

  useEffect(() => {
    if (!isOpen) return undefined

    function isInsideDropdown(target) {
      return (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      )
    }

    function handlePointerDown(event) {
      if (!isInsideDropdown(event.target)) {
        setIsOpen(false)
      }
    }

    function handleFocusIn(event) {
      if (!isInsideDropdown(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown, true)
    document.addEventListener("focusin", handleFocusIn, true)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true)
      document.removeEventListener("focusin", handleFocusIn, true)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (suppressNextOpenRef.current && nextOpen) {
          suppressNextOpenRef.current = false
          return
        }
        suppressNextOpenRef.current = false
        setIsOpen(nextOpen)
      }}
    >
      <Button
        aria-label={ariaLabel}
        className={cn("aurora-dropdown-trigger", buttonClassName)}
        isDisabled={disabled}
        onPointerDownCapture={(event) => {
          if (isOpen) {
            suppressNextOpenRef.current = true
            event.preventDefault()
            setIsOpen(false)
          }
        }}
        ref={triggerRef}
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
        <span className="aurora-dropdown-trigger-icon" aria-hidden="true">
          ▾
        </span>
      </Button>
      <Dropdown.Popover
        className={cn("aurora-dropdown-popover", popoverClassName)}
        isNonModal
        placement={placement}
        shouldCloseOnInteractOutside={() => true}
        ref={popoverRef}
      >
        <Dropdown.Menu
          aria-label={ariaLabel}
          className={cn("aurora-dropdown-menu", menuClassName)}
          onAction={(key) => {
            onSelectionChange?.(String(key))
            setIsOpen(false)
          }}
        >
          {items.map((item) => {
            const isSelected = item.value === selectedKey
            return (
              <Dropdown.Item
                key={item.value}
                id={item.value}
                className={cn("aurora-dropdown-item", itemClassName)}
                textValue={item.label}
              >
                <div className="aurora-dropdown-item-row">
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
                    ✓
                  </span>
                </div>
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
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
