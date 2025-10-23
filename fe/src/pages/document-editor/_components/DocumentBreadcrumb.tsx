import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { getFolderPathIds } from '@/lib/shared/services/DocumentService';
import type { DocumentItem } from '@/types/documents';

interface DocumentBreadcrumbProps {
  document: DocumentItem;
  fileName: string;
}

export function DocumentBreadcrumb({
  document,
  fileName,
}: DocumentBreadcrumbProps): ReactElement {
  const navigate = useNavigate();

  const handleParentClick = (): void => {
    if (document.parentId) {
      const navigateToParent = async (): Promise<void> => {
        try {
          const parentPathIds = await getFolderPathIds(document.parentId ?? null);
          const parentPath = parentPathIds.join('/');
          void navigate(`/documents/${parentPath}`);
        } catch {
          // If parent cannot be accessed, stay on current page
        }
      };
      void navigateToParent();
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-500">
      <button
        onClick={(): void => {
          void navigate('/documents');
        }}
        className="hover:text-gray-700 transition-colors"
      >
        All Documents
      </button>
      <span>/</span>
      {document?.parentId && (
        <>
          <button onClick={handleParentClick} className="hover:text-gray-700 transition-colors">
            {document.path.length > 0
              ? document.path[document.path.length - 1]
              : 'Documents'}
          </button>
          <span>/</span>
        </>
      )}
      <span className="text-gray-900 font-medium">{fileName || 'New Document'}</span>
    </div>
  );
}
