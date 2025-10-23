import { AlertCircleIcon, CheckCircle2Icon, XIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface NotificationBannerProps {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}

export function NotificationBanner({
  type,
  message,
  onClose,
}: NotificationBannerProps) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2Icon : AlertCircleIcon;

  return (
    <Alert
      variant={isSuccess ? "default" : "destructive"}
      className="flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`size-5 ${
            isSuccess ? "text-emerald-600" : "text-destructive"
          }`}
        />
        <AlertDescription className="font-medium">{message}</AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss notification"
        onClick={onClose}
      >
        <XIcon className="size-4" />
      </Button>
    </Alert>
  );
}
