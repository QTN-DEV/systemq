import type { Editor } from '@tiptap/react';
import type { ReactElement } from 'react';

import { TipTapEditor } from '@/components/modules/DocumentEditor/TipTapEditor';
import type { DocumentBlock } from '@/types/documents';

interface EditorContentTipTapProps {
  contentHtml: string;
  initialBlocks?: DocumentBlock[]; // For migration: convert blocks to HTML if HTML is missing
  canEdit: boolean;
  onSave: (html: string) => Promise<void>;
  onEditorReady?: (editor: Editor | null) => void;
}

export function EditorContentTipTap({
  contentHtml,
  initialBlocks,
  canEdit,
  onSave,
  onEditorReady,
}: EditorContentTipTapProps): ReactElement {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-4 lg:max-w-5xl lg:px-12 xl:px-16">
      {/* File Name (used as title) */}
      <div className="mb-6">
        {/* TipTap Document Editor */}
        <TipTapEditor
          initialHtml={contentHtml || undefined}
          initialBlocks={initialBlocks}
          onSave={(html): void => {
            void onSave(html);
          }}
          readOnly={!canEdit}
          showToolbar={false}
          onEditorReady={onEditorReady}
        />
      </div>
    </div>
  );
}

