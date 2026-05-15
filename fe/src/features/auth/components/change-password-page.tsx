import { useMutation } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePasswordMutation } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/authStore";

type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

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
  return "Failed to change password. Please check your current password and try again.";
}

function ChangePassword(): ReactElement {
  const user = useAuthStore((state) => state.user);
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
  } = useForm<ChangePasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    ...changePasswordMutation(),
    onSuccess: (response) => {
      logger.log("Password change request:", { userId: user?.id });
      toast.success(response.message ?? "Your password has been updated.");
      reset();
    },
    onError: (error) => {
      const message = getErrorMessage(error);

      logger.error("Password change failed:", error);
      toast.error(message);
    },
  });

  const onSubmit = (values: ChangePasswordFormData): void => {
    if (!user) {
      toast.error("Please sign in again to update your password.");
      return;
    }

    mutation.mutate({
      body: {
        user_id: user.id,
        current_password: values.currentPassword,
        new_password: values.newPassword,
      },
    });
  };

  const isLoading = mutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Change Password
          </h1>
          <p className="text-gray-600">Update your account password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Details</CardTitle>
            <CardDescription>
              Use a strong, unique password you do not use elsewhere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                void handleSubmit(onSubmit)(event);
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.currentPassword)}
                  {...register("currentPassword", {
                    required: "Current password is required",
                  })}
                />
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.newPassword)}
                  {...register("newPassword", {
                    required: "New password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters long",
                    },
                    validate: (value) =>
                      value !== getValues("currentPassword") ||
                      "New password must be different from your current password",
                  })}
                />
                {errors.newPassword ? (
                  <p className="text-sm text-destructive">
                    {errors.newPassword.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  {...register("confirmPassword", {
                    required: "Please confirm your new password",
                    validate: (value) =>
                      value === getValues("newPassword") ||
                      "The new passwords you entered do not match",
                  })}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                  size="lg"
                >
                  {isLoading ? "Changing Password..." : "Change Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => reset()}
                  disabled={isLoading}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ChangePassword;
