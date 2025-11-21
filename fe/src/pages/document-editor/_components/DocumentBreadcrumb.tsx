import type { ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getFolderPathIds } from '@/lib/shared/services/DocumentService';
import type { DocumentItem } from '@/types/documents';

interface DocumentBreadcrumbProps {
  document: DocumentItem;
  fileName: string;
  canEdit: boolean;
  onNameChange: (name: string) => Promise<void>;
}

export function DocumentBreadcrumb({
  document,
  fileName,
  canEdit,
  onNameChange,
}: DocumentBreadcrumbProps): ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSharedView = searchParams.get('view') === 'shared';

  const handleParentClick = (): void => {
    if (document.parentId) {
      const navigateToParent = async (): Promise<void> => {
        try {
          const parentPathIds = await getFolderPathIds(document.parentId ?? null);
          const parentPath = parentPathIds.join('/');
          const prefix = isSharedView ? 'shared/' : '';
          void navigate(`/documents/${prefix}${parentPath}`);
        } catch {
          // If parent cannot be accessed, stay on current page
        }
      };
      void navigateToParent();
    }
  };

  return (
    <div className="flex flex-col">
      {/* Breadcrumb Path */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
        <button
          onClick={(): void => {
            void navigate(isSharedView ? '/documents/shared' : '/documents');
          }}
          className="hover:text-gray-700 transition-colors"
        >
          {isSharedView ? 'Shared with Me' : 'All Documents'}
        </button>
        {document?.parentId && (
          <button onClick={handleParentClick} className="hover:text-gray-700 transition-colors">
            {document.path.length > 0
              ? document.path[document.path.length - 1]
              : 'Documents'}
          </button>
        )}
      </div>
      {/* Title Input */}
      {canEdit ? (
        <input
          type="text"
          value={fileName || 'New Document'}
          onChange={(e) => {
            void onNameChange(e.target.value);
          }}
          className="text-xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-1.5 min-w-[250px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
          placeholder="Untitled Document"
        />
      ) : (
        <span className="text-xl font-bold text-gray-900">{fileName || 'New Document'}</span>
      )}
    </div>
  );
}
