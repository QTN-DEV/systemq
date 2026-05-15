import { type JSX } from "react";

import { LoginForm } from "@/features/auth/components";

import logo from "../../../assets/logo.png";

export default function LoginPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/10 to-gray-700/10" />
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-2 text-white">
          <img src={logo} alt="Internal Ops" className="w-6 h-6" />
          <span className="text-sm font-medium">Internal Ops</span>
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
