import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getDocumentAccess } from '@/lib/shared/services/DocumentService';

export function useDocumentAccess(fileId: string | undefined) {
  const navigate = useNavigate();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileId) return;

    const checkAccess = async (): Promise<void> => {
      try {
        const access = await getDocumentAccess(fileId);
        if (!access?.can_view) {
          void navigate('/documents');
          return;
        }
        setCanEdit(Boolean(access.can_edit));
      } catch {
        void navigate('/documents');
      } finally {
        setLoading(false);
      }
    };

    void checkAccess();
  }, [fileId, navigate]);

  return { canEdit, loading };
}
