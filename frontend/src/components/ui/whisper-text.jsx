import React, { useRef } from 'react'

export default function WhisperText({
  text,
  className = '',
  as: Component = 'div',
}) {
  const containerRef = useRef(null)

  return (
    <Component
      ref={containerRef}
      className={className}
      style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.5rem', overflow: 'visible' }}
    >
      {text.split(' ').map((word, index) => (
        <span
          key={`${word}-${index}`}
          data-word
          style={{ display: 'inline-block', whiteSpace: 'nowrap', position: 'relative' }}
        >
          {word}
        </span>
      ))}
    </Component>
  )
}
