import type { AxiosRequestConfig } from "axios";

import { config } from "@/lib/config";
import { useAuthStore } from "@/stores/authStore";
import type { Position, User } from "@/types/user-type";

import { ApiClient } from "../api/client";

const API_URL = config.apiBaseUrl;

// Types
export interface AuthenticatedUser extends User {
  role: "admin" | "employee" | "internalops" | "pm" | "ceo";
}

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
  expiresAt: number; // epoch ms
}

interface LoginResponse {
  token: string;
  expires_at: number;
  user: ApiUserProfile;
}

interface MessageResponse {
  message: string;
}

interface ApiUserProfile {
  id: string;
  name: string;
  email: string;
  title?: string | null;
  division?: string | null;
  level?: string | null;
  position?: string | null;
  subordinates?: string[] | null;
  projects?: string[] | null;
  avatar?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

// Error Class
export class AuthServiceError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class AuthServiceAPI {
  // Private Fields
  private client: ApiClient;
  // End Private Fields

  // CTOR
  constructor() {
    this.client = new ApiClient({
      baseURL: API_URL,
    });

    this.setupAuthInterceptor();
  }
  // End CTOR

  // Private Methods
  private setupAuthInterceptor(): void {
    // Add auth header to all requests
    const originalGet = this.client.get.bind(this.client);
    const originalPost = this.client.post.bind(this.client);

    this.client.get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
      const session = this.getCurrentSession();
      if (session?.token) {
        this.client.setAuthHeader(session.token);
      }
      return originalGet<T>(url, config);
    };

    this.client.post = async <T>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const session = this.getCurrentSession();
      if (session?.token) {
        this.client.setAuthHeader(session.token);
      }
      return originalPost<T>(url, data, config);
    };
  }

  private saveSession(session: AuthSession): void {
    useAuthStore.getState().setSession(session);
  }

  private clearSession(): void {
    useAuthStore.getState().clearSession();
  }

  private mapApiUserToUser(profile: ApiUserProfile): AuthenticatedUser {
    const position = this.derivePosition(profile.position);
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      title: this.sanitizeNullable(profile.title),
      division: this.sanitizeNullable(profile.division),
      level: this.sanitizeNullable(profile.level),
      position,
      subordinates: Array.isArray(profile.subordinates)
        ? profile.subordinates
        : [],
      projects: Array.isArray(profile.projects) ? profile.projects : [],
      avatar: this.sanitizeNullable(profile.avatar),
    };

    return {
      ...user,
      role: this.deriveRole(position),
    };
  }

  private sanitizeNullable(value: string | null | undefined): string {
    return value?.trim() ?? "";
  }

  private derivePosition(value: string | null | undefined): Position {
    const normalized = value?.toLowerCase() ?? "";
    if (normalized.includes("admin")) return "Admin";
    if (normalized.includes("ceo")) return "CEO";
    if (normalized.includes("internal") || normalized.includes("operation"))
      return "Internal Ops";
    if (normalized.includes("project") || normalized.includes("pm"))
      return "PM";
    if (normalized.includes("lead") || normalized.includes("head"))
      return "Div Lead";
    return "Team Member";
  }

  private deriveRole(position: Position): AuthenticatedUser["role"] {
    switch (position) {
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

  private mapLoginResponse(data: LoginResponse): AuthSession {
    const expiresAt = this.normalizeExpiry(data.expires_at);
    const user = this.mapApiUserToUser(data.user);
    return {
      token: data.token,
      expiresAt,
      user,
    };
  }

  private normalizeExpiry(value: number): number {
    if (!Number.isFinite(value)) {
      return Date.now() + 2 * 60 * 60 * 1000;
    }
    // Treat values that look like seconds since epoch
    if (value < 1e12) {
      return value * 1000;
    }
    return value;
  }

  private persistUserToSession(user: AuthenticatedUser): void {
    const session = this.getCurrentSession();
    if (!session) return;
    this.saveSession({ ...session, user });
  }
  // End Private Methods

  // Public Methods
  getCurrentSession(): AuthSession | null {
    return useAuthStore.getState().getCurrentSession();
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const data = await this.client.post<LoginResponse>("/auth/login", {
        email: credentials.email,
        password: credentials.password,
      });
      const session = this.mapLoginResponse(data);
      this.saveSession(session);
      return session;
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Login failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    }
  }

  async forgotPassword(data: ForgotPasswordData): Promise<string> {
    try {
      const response = await this.client.post<MessageResponse>(
        "/auth/forgot-password",
        { email: data.email }
      );
      return response.message;
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Forgot password failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    }
  }

  async resetPassword(data: ResetPasswordData): Promise<string> {
    try {
      const response = await this.client.post<MessageResponse>(
        "/auth/reset-password",
        {
          token: data.token,
          new_password: data.newPassword,
        }
      );
      return response.message;
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Reset password failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    }
  }

  async changePassword(data: ChangePasswordData): Promise<string> {
    try {
      const response = await this.client.post<MessageResponse>(
        "/auth/change-password",
        {
          user_id: data.userId,
          current_password: data.currentPassword,
          new_password: data.newPassword,
        }
      );
      return response.message;
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Change password failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    }
  }

  async fetchCurrentUser(): Promise<AuthenticatedUser> {
    try {
      const data = await this.client.get<ApiUserProfile>("/auth/me");
      const user = this.mapApiUserToUser(data);
      this.persistUserToSession(user);
      return user;
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Fetch user failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    }
  }

  async renewSession(): Promise<AuthSession> {
    const existing = this.getCurrentSession();
    if (!existing) {
      throw new AuthServiceError("No active session to renew");
    }

    try {
      const data = await this.client.post<LoginResponse>("/auth/renew", {
        token: existing.token,
      });
      const session = this.mapLoginResponse(data);
      this.saveSession(session);
      return session;
    } catch (error) {
      if (error instanceof AuthServiceError && error.status === 401) {
        this.clearSession();
      }
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Renew session failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post("/auth/logout");
    } catch (error) {
      if (error instanceof AuthServiceError && error.status === 401) {
        return;
      }
      throw new AuthServiceError(
        error instanceof Error ? error.message : "Logout failed",
        error instanceof AuthServiceError ? error.status : undefined
      );
    } finally {
      this.clearSession();
    }
  }
  // End Public Methods
}

export const authService = new AuthServiceAPI();
