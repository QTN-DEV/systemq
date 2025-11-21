import { useState } from "react";
import Swal from "sweetalert2";

import { logger } from "@/lib/logger";
import { authService } from "@/lib/shared/services/authService";
import { useAuthStore } from "@/stores/authStore";

function useChangePassword() {
  // TODO : Simplify into single form state
  // Example : const [form, setForm] = useState({email : "",password : ""})

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const handleAsyncSubmit = async (): Promise<void> => {
      if (!user) {
        await Swal.fire({
          title: "Not Authenticated",
          text: "Please sign in again to update your password.",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        await Swal.fire({
          title: "Password Mismatch",
          text: "The new passwords you entered do not match.",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      if (newPassword.length < 8) {
        await Swal.fire({
          title: "Password Too Short",
          text: "New password must be at least 8 characters long.",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      if (oldPassword === newPassword) {
        await Swal.fire({
          title: "Same Password",
          text: "New password must be different from your current password.",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      setIsLoading(true);

      try {
        // TODO: Use Tanstack UseQuery or UseMutation for better code
        const message = await authService.changePassword({
          userId: user.id,
          currentPassword: oldPassword,
          newPassword,
        });
        logger.log("Password change request:", { userId: user.id });

        await Swal.fire({
          title: "Password Changed!",
          text: message || "Your password has been successfully updated.",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });

        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to change password. Please check your current password and try again.";
        logger.error("Password change failed:", error);
        await Swal.fire({
          title: "Error",
          text: message,
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void handleAsyncSubmit();
  };
  return {
    handleSubmit,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
  };
}

export default useChangePassword;
