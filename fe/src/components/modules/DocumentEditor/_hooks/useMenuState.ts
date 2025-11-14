import { useState, useRef } from 'react'
import type { MenuPlacement } from '../_types'

export const useMenuState = () => {
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  const [showGripMenu, setShowGripMenu] = useState<string | null>(null)
  const [gripMenuPlacement, setGripMenuPlacement] = useState<MenuPlacement>('bottom')
  const [typeMenuPlacement, setTypeMenuPlacement] = useState<MenuPlacement>('bottom')
  
  const gripMenuRef = useRef<HTMLDivElement | null>(null)
  const typeMenuRef = useRef<HTMLDivElement | null>(null)

  const closeAllMenus = () => {
    setShowGripMenu(null)
    setShowTypeMenu(null)
  }

  return {
    showTypeMenu,
    setShowTypeMenu,
    showGripMenu,
    setShowGripMenu,
    gripMenuPlacement,
    setGripMenuPlacement,
    typeMenuPlacement,
    setTypeMenuPlacement,
    gripMenuRef,
    typeMenuRef,
    closeAllMenus,
  }
}
