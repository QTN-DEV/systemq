import { type ReactElement } from "react";

import { useAuthStore } from "@/stores/authStore";

import { DynamicDashboard } from "./_components/dynamic-dashboard/DynamicDashboard";

function Dashboard(): ReactElement {
  const userId = useAuthStore((state) => state.user?.id);

  if (userId === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <DynamicDashboard.Root userId={userId}>
      <div className="flex h-screen">
        <div className="flex flex-col h-screen flex-1 flex-shrink-0">
          <DynamicDashboard.MenuBar />
          <div className="flex-1 flex-shrink-0 flex min-h-0 overflow-auto">
            <DynamicDashboard.Canvas className="h-screen flex-2 flex-shrink-0" />
            <DynamicDashboard.Chat className="h-screen flex-1 flex-shrink-0" />
          </div>
        </div>
      </div>
    </DynamicDashboard.Root>
  );
}

export default Dashboard;
