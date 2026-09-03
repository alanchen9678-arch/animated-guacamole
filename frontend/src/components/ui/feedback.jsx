import './feedback.css'

const SYMBOLS = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '!',
}

export function FeedbackNotice({
  variant = 'info',
  title,
  message,
  children,
  onRetry,
  retryLabel = 'Try again',
  onDismiss,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={`feedback-notice feedback-notice--${variant}${compact ? ' feedback-notice--compact' : ''} ${className}`.trim()}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className="feedback-notice__icon" aria-hidden="true">
        {SYMBOLS[variant] || SYMBOLS.info}
      </span>
      <div className="feedback-notice__content">
        {title && <strong className="feedback-notice__title">{title}</strong>}
        {(message || children) && (
          <div className="feedback-notice__message">{message || children}</div>
        )}
        {onRetry && (
          <button type="button" className="feedback-notice__action" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="feedback-notice__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function LoadingState({
  label = 'Loading…',
  compact = false,
  skeletonLines = 0,
  className = '',
}) {
  return (
    <div
      className={`feedback-loading${compact ? ' feedback-loading--compact' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="feedback-loading__label">
        <span className="feedback-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {skeletonLines > 0 && (
        <div className="feedback-skeleton" aria-hidden="true">
          {Array.from({ length: skeletonLines }, (_, index) => (
            <span key={index} className="feedback-skeleton__line" />
          ))}
        </div>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) {
  return (
    <div className={`feedback-empty${compact ? ' feedback-empty--compact' : ''} ${className}`.trim()}>
      <div className="feedback-empty__mark" aria-hidden="true">···</div>
      {title && <strong className="feedback-empty__title">{title}</strong>}
      {description && <p className="feedback-empty__description">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="feedback-empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function AsyncButton({
  pending = false,
  pendingLabel = 'Working…',
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`feedback-async-button ${className}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && <span className="feedback-spinner feedback-spinner--button" aria-hidden="true" />}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  )
}
