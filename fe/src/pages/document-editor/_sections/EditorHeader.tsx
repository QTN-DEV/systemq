import { Share2, Tag } from 'lucide-react';
import type { ReactElement } from 'react';

import SearchableDropdown from '@/components/SearchableDropdown';
import { getDocumentCategories } from '@/lib/shared/services/DocumentService';
import type { DocumentItem } from '@/types/documents';

import { DocumentBreadcrumb } from '../_components/DocumentBreadcrumb';

interface EditorHeaderProps {
  document: DocumentItem;
  fileName: string;
  documentCategory: string;
  canEdit: boolean;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  onCategoryChange: (category: string) => Promise<void>;
  onNameChange: (name: string) => Promise<void>;
  showHistory: boolean;
  showHistoryButton: boolean;
}

export function EditorHeader({
  document,
  fileName,
  documentCategory,
  canEdit,
  onOpenShare,
  onOpenHistory,
  onCategoryChange,
  onNameChange,
  showHistory,
  showHistoryButton,
}: EditorHeaderProps): ReactElement {
  return (
    <div className="bg-white h-20 flex items-center justify-center border-b border-gray-200 px-6 py-2 sticky top-0 z-10">
      <div className="flex items-center justify-between bg-white w-full h-full">
        <div className="flex items-center">
          <DocumentBreadcrumb
            document={document}
            fileName={fileName}
            canEdit={canEdit}
            onNameChange={onNameChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {canEdit ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Editor
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Viewer
            </span>
          )}
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
          <button
            onClick={onOpenShare}
            disabled={!canEdit}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${canEdit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {showHistoryButton && !showHistory && (
            <button
              onClick={onOpenHistory}
              className={`px-3 py-2 text-sm rounded transition-colors ${showHistory
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-blue-600 hover:bg-blue-50'
                }`}
            >
              {showHistory ? 'Hide Edit History' : 'Edit History'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
