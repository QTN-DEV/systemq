import { useState, useRef } from 'react'

import type { MenuPlacement } from '../_types'

export const useMenuState = (): {
  showTypeMenu: string | null
  setShowTypeMenu: (id: string | null) => void
  showGripMenu: string | null
  setShowGripMenu: (id: string | null) => void
  gripMenuPlacement: MenuPlacement
  setGripMenuPlacement: (placement: MenuPlacement) => void
  typeMenuPlacement: MenuPlacement
  setTypeMenuPlacement: (placement: MenuPlacement) => void
  gripMenuRef: React.RefObject<HTMLDivElement | null>
  typeMenuRef: React.RefObject<HTMLDivElement | null>
  closeAllMenus: () => void
} => {
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  const [showGripMenu, setShowGripMenu] = useState<string | null>(null)
  const [gripMenuPlacement, setGripMenuPlacement] = useState<MenuPlacement>('bottom')
  const [typeMenuPlacement, setTypeMenuPlacement] = useState<MenuPlacement>('bottom')
  
  const gripMenuRef = useRef<HTMLDivElement | null>(null)
  const typeMenuRef = useRef<HTMLDivElement | null>(null)

  const closeAllMenus = (): void => {
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
