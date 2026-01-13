"use client"

import { useRef, useEffect, useState } from "react"

interface MousePosition {
  x: number
  y: number
}

export function useMouseFollow(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const x = (e.clientX - centerX) / intensity
      const y = (e.clientY - centerY) / intensity

      setMousePosition({ x, y })
    }

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 })
    }

    const element = ref.current
    if (element) {
      element.addEventListener("mousemove", handleMouseMove)
      element.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      if (element) {
        element.removeEventListener("mousemove", handleMouseMove)
        element.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [intensity])

  const transform = `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0)`

  return { ref, transform }
}
