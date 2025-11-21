import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { logger } from "@/lib/logger";
import { authService, type AuthSession } from "@/lib/shared/services/authService";
import { useAuthStore } from "@/stores/authStore";

export interface LoginFormData {
  email: string;
  password: string;
}

export function useLogin() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: async (credentials: LoginFormData) => {
      return await authService.login({
        email: credentials.email,
        password: credentials.password,
      });
    },
    onSuccess: (session: AuthSession) => {
      setUser(session.user);
      logger.log("Login successful");
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      const message =
        error.message || "Failed to sign in. Please try again.";
      logger.error("Login failed:", error);

      Swal.fire({
        title: "Login Failed",
        text: message,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
      }).catch((err) => {
        logger.error("Swal error:", err);
      });
    },
  });

  return {
    login: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
