import { useState, useEffect, useRef, type ReactElement } from 'react'
import { ChevronDown, Search, Plus } from 'lucide-react'

interface SearchableDropdownProps {
  value: string
  placeholder: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: (value: string) => void
  fetchOptions: (searchQuery: string) => Promise<string[]>
  className?: string
}

function SearchableDropdown({
  value,
  placeholder,
  icon: Icon,
  onSelect,
  fetchOptions,
  className = ''
}: SearchableDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load initial options when dropdown opens
  useEffect(() => {
    if (isOpen && !isSearching) {
      loadOptions('')
    }
  }, [isOpen])

  // Search when query changes
  useEffect(() => {
    if (isSearching && searchQuery !== '') {
      const debounceTimer = setTimeout(() => {
        loadOptions(searchQuery)
      }, 300)

      return () => clearTimeout(debounceTimer)
    } else if (isSearching && searchQuery === '') {
      loadOptions('')
    }
  }, [searchQuery, isSearching])

  const loadOptions = async (query: string): Promise<void> => {
    setIsLoading(true)
    try {
      const results = await fetchOptions(query)
      setOptions(results)
    } catch (error) {
      console.error('Error loading options:', error)
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }

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
        onClick={handleOpen}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
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
                <>
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
                      <span>Create "{searchQuery}"</span>
                    </button>
                  ) : (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Start typing to search...
                    </div>
                  )}
                </>
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
