import { ChevronDown, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'

interface SearchableDropdownProps {
  value: string
  placeholder: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: (value: string) => void
  fetchOptions: (searchQuery: string) => Promise<string[]>
  className?: string
  disabled?: boolean
}

function SearchableDropdown({
  value,
  placeholder,
  icon: Icon,
  onSelect,
  fetchOptions,
  className = '',
  disabled = false
}: SearchableDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadOptions = useCallback(async (query: string): Promise<void> => {
    setIsLoading(true)
    try {
      const results = await fetchOptions(query)
      setOptions(results)
    } catch {
      // Silently handle errors or implement proper error handling
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [fetchOptions])

  // Load initial options when dropdown opens
  useEffect(() => {
    if (isOpen && !isSearching) {
      void loadOptions('')
    }
  }, [isOpen, isSearching, loadOptions])

  // Search when query changes
  useEffect(() => {
    if (isSearching && searchQuery !== '') {
      const debounceTimer = setTimeout((): void => {
        void loadOptions(searchQuery)
      }, 300)

      return (): void => clearTimeout(debounceTimer)
    } else if (isSearching && searchQuery === '') {
      void loadOptions('')
    }
  }, [searchQuery, isSearching, loadOptions])

  const handleOpen = (): void => {
    setIsOpen(true)
    setIsSearching(false)
    setSearchQuery('')
    // Focus search input after dropdown opens
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 100)
  }

  const handleClose = (): void => {
    setIsOpen(false)
    setIsSearching(false)
    setSearchQuery('')
  }

  const handleSelect = (option: string): void => {
    onSelect(option)
    handleClose()
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const query = e.target.value
    setSearchQuery(query)
    setIsSearching(true)
  }

  const handleSearchInputKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter' && searchQuery && options.length === 0) {
      // If no options found, create new option with search query
      handleSelect(searchQuery)
    }
  }


  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={disabled ? undefined : handleOpen}
        disabled={disabled}
        className={`flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'hover:bg-gray-50'
        }`}
      >
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-700">
          {value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={handleClose}
            onKeyDown={(e): void => {
              if (e.key === 'Escape') {
                handleClose()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close dropdown"
          />
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchInputKeyDown}
                  placeholder={`Search ${placeholder.toLowerCase()}...`}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : (
                <div>
                  {options.length > 0 ? (
                    options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleSelect(option)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <span>{option}</span>
                      </button>
                    ))
                  ) : searchQuery ? (
                    <button
                      onClick={() => handleSelect(searchQuery)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                      <span>Create &quot;{searchQuery}&quot;</span>
                    </button>
                  ) : (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Start typing to search...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="p-2 border-t border-gray-200 text-xs text-gray-500">
              Type to search or create a new {placeholder.toLowerCase()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SearchableDropdown
