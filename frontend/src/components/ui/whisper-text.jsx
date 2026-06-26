import React, { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function WhisperText({
  text,
  className = '',
  delay = 80,
  duration = 0.4,
  x = 0,
  y = 0,
  triggerStart = 'top 90%',
  as: Component = 'div',
}) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray('[data-word]')

      gsap.set(targets, { opacity: 0, x, y })

      gsap.to(targets, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: triggerStart,
          toggleActions: 'play none none none',
          once: true,
        },
        opacity: 1,
        x: 0,
        y: 0,
        duration,
        ease: 'power2.out',
        stagger: delay / 1000,
      })
    }, containerRef)

    return () => ctx.revert()
  }, [text, delay, duration, x, y, triggerStart])

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
