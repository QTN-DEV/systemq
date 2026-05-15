import { useMemo } from "react";

import { getAvatarUrl } from "@/components/Avatar";
import menuConfig from "@/config/menuConfig.json";
import type { AuthenticatedUser } from "@/lib/shared/services/authService";
import { useAuthStore } from "@/stores/authStore";

const emptyProfile: {
  id: null;
  name: string;
  email: string;
  title: string;
  division: string;
  level: string;
  position: AuthenticatedUser["position"];
  subordinates: string[];
  projects: string[];
  avatar: string;
  role: AuthenticatedUser["role"];
} = {
  id: null,
  name: "",
  email: "",
  title: "",
  division: "",
  level: "",
  position: "Team Member",
  subordinates: [],
  projects: [],
  avatar: "",
  role: "employee",
};

export type UseMeReturn = Omit<typeof emptyProfile, "id"> & {
  id: string | null;
  displayName: string;
  userTitle: string;
  initials: string;
  avatarUrl: string | null;
  roleColor: string;
};

export function useMe(): UseMeReturn {
  const user = useAuthStore((state) => state.user);

  const rawName = user?.name?.trim();
  const displayName =
    rawName && rawName.length > 0 ? rawName : "Employee User";
  const userTitle = user?.title?.trim() ? user.title : "Employee";

  const initials = useMemo(() => {
    const computed = displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
    return computed.length > 0 ? computed : "EU";
  }, [displayName]);

  const avatarUrl = user ? getAvatarUrl(user.avatar, user.name) : null;

  const role = user?.role ?? emptyProfile.role;

  const roleColor = useMemo(() => {
    const roles = menuConfig.roles as
      | Record<string, { name: string; color: string }>
      | undefined;
    return roles?.[role]?.color ?? "blue";
  }, [role]);

  return {
    ...(user ?? emptyProfile),
    id: user?.id ?? null,
    displayName,
    userTitle,
    initials,
    avatarUrl,
    roleColor,
  };
}
