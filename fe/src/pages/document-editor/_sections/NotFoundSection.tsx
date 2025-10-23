import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFoundSection(): ReactElement {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
        <p className="text-gray-600 mb-6">
          The document you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button
          onClick={(): void => {
            void navigate('/documents');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Back to Documents
        </button>
      </div>
    </div>
  );
}
