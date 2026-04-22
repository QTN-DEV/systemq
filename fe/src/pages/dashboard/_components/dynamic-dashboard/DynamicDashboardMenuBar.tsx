import { Loader2Icon, MessageCircleIcon, SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useChat } from "./hooks/use-chat";
import { useSaveDashboard } from "./hooks/use-save-dashboard";

export function DynamicDashboardMenuBar(): React.ReactElement {
  const { toggleChat } = useChat();
  const { save, isSaving } = useSaveDashboard();

  return (
    <div className="flex items-center justify-end gap-2 p-4 border-b border-gray-200">
      <Button onClick={save} variant="outline" disabled={isSaving}>
        {isSaving ? (
          <Loader2Icon className="w-4 h-4 animate-spin" />
        ) : (
          <SaveIcon className="w-4 h-4" />
        )}
        <span className="ml-1 text-sm">{isSaving ? "Saving…" : "Save"}</span>
      </Button>

      <Button onClick={toggleChat} variant="outline">
        <MessageCircleIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
