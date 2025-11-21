import { Tag } from 'lucide-react';
import type { ReactElement } from 'react';

import { TipTapEditor } from '@/components/modules/DocumentEditor/TipTapEditor';
import SearchableDropdown from '@/components/SearchableDropdown';
import { getDocumentCategories } from '@/lib/shared/services/DocumentService';
import type { DocumentItem, DocumentBlock } from '@/types/documents';

import { formatDateTime } from '../_utils/formatDateTime';

interface EditorContentTipTapProps {
  document: DocumentItem;
  fileName: string;
  documentCategory: string;
  contentHtml: string;
  initialBlocks?: DocumentBlock[]; // For migration: convert blocks to HTML if HTML is missing
  canEdit: boolean;
  onNameChange: (name: string) => Promise<void>;
  onCategoryChange: (category: string) => Promise<void>;
  onSave: (html: string) => Promise<void>;
}

export function EditorContentTipTap({
  document,
  fileName,
  documentCategory,
  contentHtml,
  initialBlocks,
  canEdit,
  onNameChange,
  onCategoryChange,
  onSave,
}: EditorContentTipTapProps): ReactElement {
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
              ? `Last modified by ${document.lastModifiedBy.name} at ${formatDateTime(document.lastModified)}`
              : `Last modified at ${formatDateTime(document.lastModified)}`}
          </div>
        )}

        {/* HR Line */}
        <hr className="border-gray-200 mb-6" />

        {/* TipTap Document Editor */}
        <TipTapEditor
          initialHtml={contentHtml || undefined}
          initialBlocks={initialBlocks}
          onSave={(html): void => {
            void onSave(html);
          }}
          readOnly={!canEdit}
          className="min-h-[400px]"
        />
      </div>
    </div>
  );
}

