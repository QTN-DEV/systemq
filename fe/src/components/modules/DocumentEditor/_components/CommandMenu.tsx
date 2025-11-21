import { useRef, useEffect, type ReactElement } from 'react'

import { COMMAND_OPTIONS, type CommandOption } from '../_constants/commandOptions'

interface CommandMenuProps {
  query: string
  blockId: string
  position: { x: number; y: number }
  onSelect: (option: CommandOption) => void
  selectedIndex: number
}

export const CommandMenu = ({
  query,
  position,
  onSelect,
  selectedIndex,
}: CommandMenuProps): ReactElement => {
  const menuRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLButtonElement>(null)

  // Filter commands based on query
  const filteredOptions = COMMAND_OPTIONS.filter((option) => {
    if (!query.trim()) return true
    const queryLower = query.toLowerCase()
    return option.keywords.some((keyword) => keyword.includes(queryLower))
  })

  // Clamp selectedIndex to valid range
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(0, filteredOptions.length - 1))

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && menuRef.current) {
      const menu = menuRef.current
      const item = selectedItemRef.current
      const menuRect = menu.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()

      if (itemRect.top < menuRect.top) {
        menu.scrollTop -= menuRect.top - itemRect.top + 8
      } else if (itemRect.bottom > menuRect.bottom) {
        menu.scrollTop += itemRect.bottom - menuRect.bottom + 8
      }
    }
  }, [selectedIndex])


  if (filteredOptions.length === 0) {
    return (
      <div
        ref={menuRef}
        data-command-menu
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[280px] max-w-[320px]"
        style={{ left: position.x, top: position.y }}
      >
        <div className="px-3 py-2 text-sm text-gray-500">No commands found</div>
      </div>
    )
  }

  return (
    <div
      ref={menuRef}
      data-command-menu
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[280px] max-w-[320px] max-h-[300px] overflow-y-auto"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
        {query ? `Commands matching "${query}"` : 'Commands'}
      </div>
      {filteredOptions.map((option, index) => {
        const Icon = option.icon
        const isSelected = index === safeSelectedIndex
        return (
          <button
            key={`${option.type}-${index}`}
            ref={isSelected ? selectedItemRef : undefined}
            className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-start space-x-3 transition-colors ${
              isSelected ? 'bg-blue-50' : ''
            }`}
            onClick={() => onSelect(option)}
            onMouseEnter={() => {
              // Update selection on hover
            }}
          >
            <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}


