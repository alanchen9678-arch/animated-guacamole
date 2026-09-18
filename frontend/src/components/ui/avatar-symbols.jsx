import React from 'react'

export const USER_AVATAR_SYMBOLS = [
  { id: 'user-horizon', label: 'Horizon' },
  { id: 'user-lantern', label: 'Lantern' },
  { id: 'user-ripple', label: 'Ripple' },
  { id: 'user-fern', label: 'Fern' },
  { id: 'user-moon', label: 'Moon' },
  { id: 'user-compass', label: 'Compass' },
  { id: 'user-cairn', label: 'Cairn' },
  { id: 'user-open-sky', label: 'Open Sky' },
]

export const PEER_AVATAR_SYMBOLS = [
  { id: 'peer-cove', label: 'Cove' },
  { id: 'peer-tide', label: 'Tide' },
  { id: 'peer-reed', label: 'Reed' },
  { id: 'peer-pebble', label: 'Pebble' },
  { id: 'peer-beacon', label: 'Beacon' },
  { id: 'peer-shell', label: 'Shell' },
  { id: 'peer-pine', label: 'Pine' },
  { id: 'peer-north-star', label: 'North Star' },
]

export function AvatarSymbol({ symbol, size = 24, title, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="geometricPrecision"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <use href={`/avatar-symbols.svg#${symbol}`} />
    </svg>
  )
}
