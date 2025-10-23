import { Tag } from 'lucide-react';
import type { ReactElement } from 'react';

import DocumentEditor from '@/components/DocumentEditor';
import SearchableDropdown from '@/components/SearchableDropdown';
import { getDocumentCategories } from '@/lib/shared/services/DocumentService';
import type { DocumentItem, DocumentBlock } from '@/types/documents';

interface EditorContentProps {
  document: DocumentItem;
  fileName: string;
  documentCategory: string;
  blocks: DocumentBlock[];
  canEdit: boolean;
  onNameChange: (name: string) => Promise<void>;
  onCategoryChange: (category: string) => Promise<void>;
  onSave: (blocks: DocumentBlock[]) => Promise<void>;
}

export function EditorContent({
  document,
  fileName,
  documentCategory,
  blocks,
  canEdit,
  onNameChange,
  onCategoryChange,
  onSave,
}: EditorContentProps): ReactElement {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:max-w-5xl lg:px-12 xl:px-16">
      {/* File Name (used as title) */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <input
            type="text"
            value={fileName}
            onChange={(e) => {
              void onNameChange(e.target.value);
            }}
            className="flex-1 text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
            placeholder="Untitled Document"
            readOnly={!canEdit}
          />
          {canEdit ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Editor
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Viewer
            </span>
          )}
        </div>

        {/* Category Searchable Dropdown */}
        <div className="flex items-center space-x-3 mb-6">
          <SearchableDropdown
            value={documentCategory}
            placeholder="Add Category"
            icon={Tag}
            onSelect={(category) => {
              void onCategoryChange(category);
            }}
            fetchOptions={getDocumentCategories}
            disabled={!canEdit}
          />
        </div>

        {/* Meta line: Last modified */}
        {document?.lastModified && (
          <div className="text-sm text-gray-500 mb-2">
            {document.lastModifiedBy?.name
              ? `Last modified by ${document.lastModifiedBy.name} at ${new Date(
                  document.lastModified
                ).toLocaleString()}`
              : `Last modified at ${new Date(document.lastModified).toLocaleString()}`}
          </div>
        )}

        {/* HR Line */}
        <hr className="border-gray-200 mb-6" />

        {/* Document Editor */}
        <DocumentEditor
          initialBlocks={blocks}
          onSave={(newBlocks): void => {
            void onSave(newBlocks);
          }}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}
