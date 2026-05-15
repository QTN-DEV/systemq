import type { ReactElement } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AppSidebarUserProps {
  displayName: string;
  userTitle: string;
  initials: string;
  avatarUrl: string | null;
  roleColor: string;
}

export function AppSidebarUser({
  displayName,
  userTitle,
  initials,
  avatarUrl,
  roleColor,
}: AppSidebarUserProps): ReactElement {
  const colorClass = cn(
    roleColor === "red" && "bg-red-500",
    roleColor === "pink" && "bg-pink-500",
    roleColor === "blue" && "bg-blue-500",
    roleColor === "green" && "bg-green-500",
    roleColor === "purple" && "bg-purple-500"
  );

  return (
    <SidebarMenu className="border-b px-2 py-2">
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
          <Avatar className="size-8 rounded-lg">
            <AvatarImage
              src={avatarUrl ?? undefined}
              alt={displayName}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className={cn("rounded-lg", colorClass)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {userTitle}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
