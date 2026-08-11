import { useCallback, useEffect, useRef, useState } from 'react'
import './AutoMarqueeText.css'

export default function AutoMarqueeText({
  as: Tag = 'div',
  children,
  className = '',
  lines = 1,
  title,
  ...props
}) {
  const safeLines = Math.max(1, Number(lines) || 1)
  const rootRef = useRef(null)
  const measureRef = useRef(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const updateMarquee = useCallback(() => {
    const root = rootRef.current
    const measure = measureRef.current
    if (!root || !measure) return

    const distance = Math.max(0, Math.ceil(measure.scrollWidth - root.clientWidth))
    const availableTextWidth = root.clientWidth * safeLines
    const overflowing = measure.scrollWidth - availableTextWidth > 3
    const duration = Math.min(14, Math.max(4.5, distance / 34 + 3.2))

    root.style.setProperty('--auto-marquee-distance', `${-distance}px`)
    root.style.setProperty('--auto-marquee-duration', `${duration.toFixed(2)}s`)
    setIsOverflowing(overflowing)
  }, [safeLines])

  useEffect(() => {
    updateMarquee()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateMarquee)
      : null

    if (rootRef.current) resizeObserver?.observe(rootRef.current)
    if (document.fonts?.ready) document.fonts.ready.then(updateMarquee)
    window.addEventListener('resize', updateMarquee)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateMarquee)
    }
  }, [children, updateMarquee])

  return (
    <Tag
      ref={rootRef}
      className={`auto-marquee-text${isOverflowing ? ' is-overflowing' : ''}${className ? ` ${className}` : ''}`}
      data-lines={safeLines}
      title={title ?? (typeof children === 'string' ? children : undefined)}
      style={{ '--auto-marquee-lines': safeLines }}
      {...props}
    >
      <span className='auto-marquee-track'>{children}</span>
      <span ref={measureRef} className='auto-marquee-measure' aria-hidden='true'>{children}</span>
    </Tag>
  )
}
