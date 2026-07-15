import { createElement, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { sx } from './sx'

type HProps = {
  /** Element tag name, e.g. 'button', 'div', 'span'. Defaults to 'div'. */
  as?: keyof JSX.IntrinsicElements
  /** Base CSS as a declaration string (ported from the prototype's style=""). */
  css?: string
  /** Extra CSS applied while hovered (ported from style-hover=""). */
  hover?: string
  /** Additional style object merged last. */
  style?: CSSProperties
  children?: ReactNode
} & Record<string, unknown>

/**
 * Hoverable element. Mirrors the prototype's `style` + `style-hover` pair:
 * the hover CSS is merged on top of the base CSS while the pointer is over it.
 */
export function H({ as = 'div', css, hover, style, children, onMouseEnter, onMouseLeave, ...rest }: HProps) {
  const [hovered, setHovered] = useState(false)
  const merged: CSSProperties = {
    ...sx(css),
    ...(hovered && hover ? sx(hover) : {}),
    ...style,
  }
  return createElement(
    as,
    {
      style: merged,
      onMouseEnter: (e: unknown) => {
        setHovered(true)
        ;(onMouseEnter as ((e: unknown) => void) | undefined)?.(e)
      },
      onMouseLeave: (e: unknown) => {
        setHovered(false)
        ;(onMouseLeave as ((e: unknown) => void) | undefined)?.(e)
      },
      ...rest,
    },
    children,
  )
}
