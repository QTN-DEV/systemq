import { useMemo } from "react";

import type { AuthenticatedUser } from "@/lib/shared/services/authService";
import { useAuthStore } from "@/stores/authStore";

import { getAvatarUrl } from "../../Avatar";

export function useSidebarUser(): {
  user: AuthenticatedUser | null
  userRole: string
  userTitle: string
  displayName: string
  initials: string
  avatarUrl: string | null
} {
  const user = useAuthStore((state) => state.user);

  const userData = useMemo(() => {
    const userRole = user?.role ?? "employee";
    const userTitle = user?.title ?? "Employee";
    const rawName = user?.name?.trim();
    const displayName =
      rawName && rawName.length > 0 ? rawName : "Employee User";

    const computedInitials = displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");

    const initials = computedInitials.length > 0 ? computedInitials : "EU";
    const avatarUrl = user ? getAvatarUrl(user.avatar, user.name) : null;

    return {
      user,
      userRole,
      userTitle,
      displayName,
      initials,
      avatarUrl,
    };
  }, [user]);

  return userData;
}
