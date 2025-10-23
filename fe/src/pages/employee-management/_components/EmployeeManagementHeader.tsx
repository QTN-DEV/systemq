import { DownloadIcon, PlusIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmployeeManagementHeaderProps {
  activeTab: "active" | "inactive";
  activeCount: number;
  inactiveCount: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onTabChange: (value: "active" | "inactive") => void;
  onCreateEmployee: () => void;
  onExport?: () => void;
}

export function EmployeeManagementHeader({
  activeTab,
  activeCount,
  inactiveCount,
  searchTerm,
  onSearchTermChange,
  onTabChange,
  onCreateEmployee,
  onExport,
}: EmployeeManagementHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Employee Management
            </h1>
            <p className="text-muted-foreground">
              Manage employee lifecycle, reporting lines, and access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onExport?.();
              }}
            >
              <DownloadIcon className="mr-2 size-4" />
              Export Data
            </Button>
            <Button onClick={onCreateEmployee}>
              <PlusIcon className="mr-2 size-4" />
              Add Employee
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={activeTab}
            onValueChange={(value) => onTabChange(value as "active" | "inactive")}
          >
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                Active
                <Badge variant="secondary">{activeCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="inactive" className="gap-2">
                Inactive
                <Badge variant="secondary">{inactiveCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search by name, email, or ID"
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
