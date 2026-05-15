import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  loginMutation,
  type AuthSession as ApiAuthSession,
  type UserProfile,
} from "@/api";
import { logger } from "@/lib/logger";
import type {
  AuthenticatedUser,
  AuthSession,
} from "@/lib/shared/services/authService";
import { useAuthStore } from "@/stores/authStore";
import type { Position, User } from "@/types/user-type";

export interface LoginFormData {
  email: string;
  password: string;
}

function sanitizeNullable(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function derivePosition(value: UserProfile["position"]): Position {
  const normalized = value?.toLowerCase() ?? "";

  if (
    normalized.includes("superadmin") ||
    normalized.includes("system administrator")
  ) {
    return "Super Admin";
  }
  if (normalized.includes("admin")) return "Admin";
  if (normalized.includes("ceo")) return "CEO";
  if (normalized.includes("internal") || normalized.includes("operation")) {
    return "Internal Ops";
  }
  if (normalized.includes("project") || normalized.includes("pm")) return "PM";
  if (normalized.includes("lead") || normalized.includes("head")) {
    return "Div Lead";
  }
  return "Team Member";
}

function deriveRole(position: Position): AuthenticatedUser["role"] {
  switch (position) {
    case "Super Admin":
      return "superadmin";
    case "Admin":
      return "admin";
    case "CEO":
      return "ceo";
    case "Internal Ops":
      return "internalops";
    case "PM":
      return "pm";
    default:
      return "employee";
  }
}

function normalizeExpiry(value: number): number {
  if (!Number.isFinite(value)) {
    return Date.now() + 2 * 60 * 60 * 1000;
  }
  return value < 1e12 ? value * 1000 : value;
}

function mapApiUserToUser(profile: UserProfile): AuthenticatedUser {
  const position = derivePosition(profile.position);
  const user: User = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    title: sanitizeNullable(profile.title),
    division: sanitizeNullable(profile.division),
    level: sanitizeNullable(profile.level),
    position,
    subordinates: profile.subordinates ?? [],
    projects: profile.projects ?? [],
    avatar: sanitizeNullable(profile.avatar),
    employmentType: profile.employment_type,
  };

  return {
    ...user,
    role: deriveRole(position),
  };
}

function mapApiSessionToSession(apiSession: ApiAuthSession): AuthSession {
  return {
    token: apiSession.token,
    expiresAt: normalizeExpiry(apiSession.expires_at),
    user: mapApiUserToUser(apiSession.user),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail;
  }
  return "Failed to sign in. Please try again.";
}

export function useLogin(): {
  login: (credentials: LoginFormData) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
} {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const mutation = useMutation({
    ...loginMutation(),
    onSuccess: (apiSession) => {
      const session = mapApiSessionToSession(apiSession);

      setSession(session);
      logger.log("Login successful");
      navigate("/dashboard");
    },
    onError: (error) => {
      const message = getErrorMessage(error);

      logger.error("Login failed:", error);
      toast.error(message);
    },
  });

  return {
    login: (credentials) => {
      mutation.mutate({ body: credentials });
    },
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error instanceof Error ? mutation.error : null,
    isSuccess: mutation.isSuccess,
  };
}
