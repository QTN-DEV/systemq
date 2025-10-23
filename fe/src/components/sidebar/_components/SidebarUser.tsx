import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarUserProps {
  isCollapsed: boolean;
  displayName: string;
  userTitle: string;
  initials: string;
  avatarUrl: string | null;
  roleColor: string;
}

export function SidebarUser({
  isCollapsed,
  displayName,
  userTitle,
  initials,
  avatarUrl,
  roleColor,
}: SidebarUserProps) {
  const colorClass = cn(
    roleColor === "red" && "bg-red-500",
    roleColor === "pink" && "bg-pink-500",
    roleColor === "blue" && "bg-blue-500",
    roleColor === "green" && "bg-green-500",
    roleColor === "purple" && "bg-purple-500"
  );

  if (isCollapsed) {
    return (
      <div className="p-2 border-b flex justify-center">
        <Avatar className="w-8 h-8">
          <AvatarImage
            src={avatarUrl || undefined}
            alt={displayName}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="p-4 border-b">
      <div className="flex items-center space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage
            src={avatarUrl || undefined}
            alt={displayName}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{userTitle}</p>
        </div>
      </div>
    </div>
  );
}
