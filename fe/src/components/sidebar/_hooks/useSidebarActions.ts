import { logger } from "@/lib/logger";
import { authService } from "@/lib/shared/services/authService";

export function useSidebarActions(): {
  handleLogout: () => Promise<void>
} {
  const handleLogout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      logger.error("Logout failed", error);
    } finally {
      logger.log("Logout successful");
      window.location.href = "/";
    }
  };

  return {
    handleLogout,
  };
}
