import { type JSX } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

import { LoginHeader } from "./_components";

export default function LoginPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/10 to-gray-700/10" />
      <LoginHeader />
      <LoginForm />
    </div>
  );
}
