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
      <div className="flex h-screen w-full overflow-hidden">
        <div className="flex flex-col h-full flex-1 min-w-0">
          <DynamicDashboard.MenuBar />
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* <div className="flex-1 min-w-0 overflow-auto bg-red-300">
              <div style={{ width: "10000px", height: "100%" }}>dd</div>
            </div> */}
            <DynamicDashboard.Canvas className="h-full flex-1 min-w-0 overflow-auto" />
            <DynamicDashboard.Chat className="h-full w-96 flex-shrink-0" />
          </div>
        </div>
      </div>
    </DynamicDashboard.Root>
  );
}

export default Dashboard;
