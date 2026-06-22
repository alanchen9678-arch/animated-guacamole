"use client";

import React, { memo, useMemo, useState } from "react";

const baseRootStyle = {
  display: "inline-block",
  position: "relative",
  textDecoration: "none",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "-0.03em",
  overflow: "hidden",
  cursor: "pointer",
  userSelect: "none",
};

const TextReveal = memo(function TextReveal({
  text,
  as: Component = "a",
  href,
  target,
  className = "",
  style,
  fontSize = "3rem",
  staggerDelay = 25,
  duration = 250,
  easing = "ease-in-out",
  color = "inherit",
  hoverColor = "#b2c73a",
  direction = "up",
  onClick,
}) {
  const [hovered, setHovered] = useState(false);

  const chars = useMemo(() => {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), (segment) => segment.segment);
    }

    return [...text];
  }, [text]);

  const sign = direction === "up" ? 1 : -1;

  const rootProps = {
    className,
    style: {
      ...baseRootStyle,
      fontSize,
      color: hovered ? hoverColor : color,
      transition: "color 0.35s ease",
      padding: "0.15em 0.4em",
      lineHeight: 1,
      ...style,
    },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onClick,
    "aria-label": text,
  };

  if (Component === "a") {
    rootProps.href = href ?? "#";
    if (target) rootProps.target = target;
    if (target === "_blank") rootProps.rel = "noopener noreferrer";
  }

  return (
    <Component {...rootProps}>
      <span
        style={{
          display: "inline-flex",
          overflow: "hidden",
          position: "relative",
          height: "1em",
        }}
        aria-hidden="true"
      >
        {chars.map((char, index) => (
          <span
            key={index}
            style={{
              display: "inline-block",
              position: "relative",
              willChange: "transform",
              textShadow: `0 ${sign}em currentColor`,
              transition: `transform ${duration}ms ${easing}`,
              transitionDelay: `${index * staggerDelay}ms`,
              transform: hovered ? `translateY(${-sign}em)` : "translateY(0)",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
    </Component>
  );
});

TextReveal.displayName = "TextReveal";

export { TextReveal };
