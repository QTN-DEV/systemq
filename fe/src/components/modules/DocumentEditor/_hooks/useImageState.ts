import { useState } from 'react'

export const useImageState = (): {
  hoveredImageId: string | null
  setHoveredImageId: (id: string | null) => void
} => {
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)

  return {
    hoveredImageId,
    setHoveredImageId,
  }
}
