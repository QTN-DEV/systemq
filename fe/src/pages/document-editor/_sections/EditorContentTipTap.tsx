import type { ReactElement } from 'react';

import { TipTapEditor } from '@/components/modules/DocumentEditor/TipTapEditor';
import type { DocumentItem, DocumentBlock } from '@/types/documents';

interface EditorContentTipTapProps {
  document: DocumentItem;
  fileName: string;
  contentHtml: string;
  initialBlocks?: DocumentBlock[]; // For migration: convert blocks to HTML if HTML is missing
  canEdit: boolean;
  onNameChange: (name: string) => Promise<void>;
  onSave: (html: string) => Promise<void>;
}

export function EditorContentTipTap({
  document,
  fileName,
  contentHtml,
  initialBlocks,
  canEdit,
  onNameChange,
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
        </div>

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

