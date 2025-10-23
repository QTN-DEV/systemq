import { type JSX } from "react";

import { LoginHeader, LoginCard } from "./_components";
import { LoginForm } from "./_forms/LoginForm";

export default function LoginPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background overlay with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/10 to-gray-700/10" />

      {/* Header */}
      <LoginHeader />

      {/* Login Card */}
      <LoginCard>
        <LoginForm />
      </LoginCard>
    </div>
  );
}
