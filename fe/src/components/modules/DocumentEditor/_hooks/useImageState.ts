import { useState } from 'react'

export const useImageState = () => {
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)

  return {
    hoveredImageId,
    setHoveredImageId,
  }
}
