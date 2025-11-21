import { useNavigate } from "react-router-dom";

import { logger } from "@/lib/logger";
import { authService } from "@/lib/shared/services/authService";

export function useSidebarActions(): {
  handleLogout: () => Promise<void>
} {
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      logger.error("Logout failed", error);
    } finally {
      navigate("/");
      logger.log("Logout successful");
    }
  };

  return {
    handleLogout,
  };
}
