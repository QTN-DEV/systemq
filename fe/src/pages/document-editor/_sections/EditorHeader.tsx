import { Share2 } from 'lucide-react';
import type { ReactElement } from 'react';

import type { DocumentItem } from '@/types/documents';

import { DocumentBreadcrumb } from '../_components/DocumentBreadcrumb';

interface EditorHeaderProps {
  document: DocumentItem;
  fileName: string;
  canEdit: boolean;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  showHistory: boolean;
  showHistoryButton: boolean;
}

export function EditorHeader({
  document,
  fileName,
  canEdit,
  onOpenShare,
  onOpenHistory,
  showHistory,
  showHistoryButton,
}: EditorHeaderProps): ReactElement {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between bg-white">
        <DocumentBreadcrumb document={document} fileName={fileName} />

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenShare}
            disabled={!canEdit}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              canEdit
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
              className={`px-3 py-2 text-sm rounded transition-colors ${
                showHistory
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
