import { useState, type JSX } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

import { logger } from "@/lib/logger";
import { authService } from "@/lib/shared/services/authService";

import logo from "../assets/logo.png";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function ForgotPassword(): JSX.Element {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setIsLoading(true);

    const handleAsyncSubmit = async (): Promise<void> => {
      try {
        const message = await authService.forgotPassword({ email });
        logger.log("Password reset request:", { email });

        await Swal.fire({
          title: "Email Sent!",
          text:
            message ||
            "If an account with that email exists, we’ve sent you a password reset link.",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3B82F6",
        });

        setEmail("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";
        logger.error("Password reset failed:", error);
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/10 to-gray-700/10 pointer-events-none" />

      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center space-x-2 text-white">
          <img src={logo} alt="Internal Ops" className="w-6 h-6" />
          <span className="text-sm font-medium">Internal Ops</span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl mb-2">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className={cn(
                    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                  )}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;
