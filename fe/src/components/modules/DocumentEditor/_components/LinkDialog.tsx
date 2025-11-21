import type { ReactElement, KeyboardEvent } from 'react'

interface LinkDialogProps {
  text: string
  url: string
  onTextChange: (value: string) => void
  onUrlChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export const LinkDialog = ({
  text,
  url,
  onTextChange,
  onUrlChange,
  onSave,
  onCancel,
}: LinkDialogProps): ReactElement => (
  <div className="fixed inset-0 z-40 flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/30"
      onClick={onCancel}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Close dialog"
    />
    <div className="relative bg-white w-96 max-w-[95vw] border border-gray-200 rounded-lg shadow-xl p-4 z-50">
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 mb-1">Text</div>
        <input
          className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Link text"
        />
      </div>
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-1">Link</div>
        <input
          type="url"
          className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          className="px-3 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          onClick={onSave}
          disabled={!url.trim()}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)
