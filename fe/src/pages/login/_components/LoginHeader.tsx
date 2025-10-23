// To fix Vite "Failed to load url" errors due to asset import issues, 
// try using a relative path instead of an alias for the logo import.

import logo from "../../../assets/logo.png";

export function LoginHeader() {
  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
      <div className="flex items-center space-x-2 text-white">
        <img src={logo} alt="Internal Ops" className="w-6 h-6" />
        <span className="text-sm font-medium">Internal Ops</span>
      </div>
    </div>
  );
}
