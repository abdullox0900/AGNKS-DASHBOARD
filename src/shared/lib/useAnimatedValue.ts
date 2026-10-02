import { useEffect, useState } from 'react'

/** Starts at 0 and jumps to `target` on the next painted frame, so a CSS transition on the
 * consumer plays on mount and again whenever the target changes. */
export function useAnimatedValue(target: number, enabled = true): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setValue(target))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [target, enabled])

  return value
}
