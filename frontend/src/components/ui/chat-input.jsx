import { createContext, forwardRef, useContext } from 'react'

import { useTextareaResize } from '../../hooks/use-textarea-resize.js'
import './chat-input.css'

const ChatInputContext = createContext({})

function cn(...values) {
  return values.filter(Boolean).join(' ')
}

function setRef(ref, value) {
  if (!ref) return
  if (typeof ref === 'function') {
    ref(value)
    return
  }
  ref.current = value
}

export function ChatInput({
  children,
  className,
  variant = 'default',
  value,
  onChange,
  onSubmit,
  loading,
  onStop,
  rows = 1,
}) {
  return (
    <ChatInputContext.Provider
      value={{ value, onChange, onSubmit, loading, onStop, variant, rows }}
    >
      <div
        className={cn(
          'aurora-chat-input',
          variant === 'default' && 'aurora-chat-input--default',
          className,
        )}
      >
        {children}
      </div>
    </ChatInputContext.Provider>
  )
}

export const ChatInputTextArea = forwardRef(function ChatInputTextArea(
  {
    onSubmit: onSubmitProp,
    value: valueProp,
    onChange: onChangeProp,
    className,
    ...props
  },
  ref,
) {
  const context = useContext(ChatInputContext)
  const value = valueProp ?? context.value ?? ''
  const onChange = onChangeProp ?? context.onChange
  const onSubmit = onSubmitProp ?? context.onSubmit
  const rows = context.rows ?? 1
  const resizeRef = useTextareaResize(value, rows)

  function handleKeyDown(event) {
    if (!onSubmit) return
    if (event.key !== 'Enter' || event.shiftKey) return
    if (typeof value !== 'string' || value.trim().length === 0) return

    event.preventDefault()
    onSubmit()
  }

  return (
    <textarea
      {...props}
      ref={(node) => {
        setRef(resizeRef, node)
        setRef(ref, node)
      }}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      className={cn('aurora-chat-input__textarea', className)}
      rows={rows}
    />
  )
})

export function ChatInputSubmit({
  onSubmit: onSubmitProp,
  loading: loadingProp,
  onStop: onStopProp,
  className,
  disabled,
  children,
  ...props
}) {
  const context = useContext(ChatInputContext)
  const loading = loadingProp ?? context.loading
  const onStop = onStopProp ?? context.onStop
  const onSubmit = onSubmitProp ?? context.onSubmit

  if (loading && onStop) {
    return (
      <div className="aurora-chat-input__actions">
        <button
          type="button"
          onClick={onStop}
          className={cn('aurora-chat-input__submit', className)}
          aria-label="Stop"
          {...props}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
          </svg>
        </button>
      </div>
    )
  }

  const isDisabled =
    disabled ||
    loading ||
    typeof context.value !== 'string' ||
    context.value.trim().length === 0

  return (
    <div className="aurora-chat-input__actions">
      <button
        type="button"
        className={cn('aurora-chat-input__submit', className)}
        disabled={isDisabled}
        onClick={(event) => {
          event.preventDefault()
          if (!isDisabled) onSubmit?.()
        }}
        aria-label="Send message"
        {...props}
      >
        {children || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        )}
      </button>
    </div>
  )
}
