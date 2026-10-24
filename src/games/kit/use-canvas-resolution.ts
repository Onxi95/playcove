import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

export function useCanvasResolution(canvasRef: RefObject<HTMLCanvasElement | null>, logicalWidth: number, logicalHeight: number) {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let ratio = 0
    let resolutionQuery: MediaQueryList | null = null
    function resize() {
      if (!canvas) return
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width <= 0) return
      const nextRatio = Math.max(1, window.devicePixelRatio || 1)
      const width = Math.round(bounds.width * nextRatio)
      const height = Math.round(bounds.width * logicalHeight / logicalWidth * nextRatio)
      if (ratio !== (window.devicePixelRatio || 1) && typeof window.matchMedia === 'function') {
        resolutionQuery?.removeEventListener('change', resize)
        resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
        resolutionQuery.addEventListener('change', resize)
      }
      ratio = window.devicePixelRatio || 1
      canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`
      if (canvas.width === width && canvas.height === height) return
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')?.setTransform(width / logicalWidth, 0, 0, height / logicalHeight, 0, 0)
      setRevision((current) => current + 1)
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(canvas)
    window.addEventListener('resize', resize)
    resize()
    return () => {
      observer?.disconnect()
      resolutionQuery?.removeEventListener('change', resize)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef, logicalWidth, logicalHeight])
  return revision
}
