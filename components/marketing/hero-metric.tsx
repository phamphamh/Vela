"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Count-up metric for the hero "control room" mock. Eases from 0 → target
 * once on mount. Respects prefers-reduced-motion (jumps straight to target).
 */
export function HeroMetric({ target = 342 }: { target?: number }) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // duration 0 → the first frame eases straight to target (no animation),
    // which also keeps all setState calls inside the rAF callback (not the
    // effect body) to avoid cascading-render lint/perf pitfalls.
    const duration = reduce ? 0 : 1200
    const start = performance.now()
    const tick = (now: number) => {
      const k = duration === 0 ? 1 : Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      setValue(Math.round(target * eased))
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  return (
    <span className="text-[38px] font-semibold leading-none tracking-tight tabular-nums">
      {value}
    </span>
  )
}
