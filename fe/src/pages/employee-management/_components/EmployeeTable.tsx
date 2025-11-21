import {
  EditIcon,
  MoreVerticalIcon,
  NetworkIcon,
  UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeListItem } from "@/lib/shared/services/EmployeeService";
import { getProjectsByIds } from "@/lib/shared/services/ProjectService";

import {
  getAvatarFallbackColor,
  getInitials,
  getPositionBadgeColor,
} from "./employee-utils";

interface EmployeeTableProps {
  entries: EmployeeListItem[];
  employeesDirectory: Map<string, EmployeeListItem>;
  activeTab: "active" | "inactive";
  onEdit: (employee: EmployeeListItem) => void;
  onManageSubordinates: (employee: EmployeeListItem) => void;
  onDeactivate: (employee: EmployeeListItem) => void;
  onActivate: (employee: EmployeeListItem) => void;
}

export function EmployeeTable({
  entries,
  employeesDirectory,
  activeTab,
  onEdit,
  onManageSubordinates,
  onDeactivate,
  onActivate,
}: EmployeeTableProps): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[140px]">Employee ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Subordinates</TableHead>
          <TableHead>Projects</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((employee) => {
          const subordinateRecords = employee.subordinates
            .map((id) => employeesDirectory.get(id))
            .filter(Boolean) as EmployeeListItem[];

          const subordinateEntries: RelationEntry[] = subordinateRecords.map(
            (subordinate) => ({
              id: subordinate.id,
              name: subordinate.name,
              avatar: subordinate.avatar ?? null,
              email: subordinate.email,
              description: [subordinate.title, subordinate.division]
                .filter(Boolean)
                .join(" · "),
            })
          );

          const projectEntries: RelationEntry[] = getProjectsByIds(
            employee.projects ?? []
          ).map((project) => ({
            id: project.id,
            name: project.name,
            avatar: project.avatar ?? null,
          }));

          const canManageSubordinates =
            activeTab === "active" && employee.position !== "Team Member";

          return (
            <TableRow
              key={employee.id}
              className={
                activeTab === "inactive" ? "bg-muted/50 text-muted-foreground" : ""
              }
            >
              <TableCell className="font-medium">{employee.id}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={employee.avatar ?? undefined} alt={employee.name} />
                    <AvatarFallback
                      className={getAvatarFallbackColor(employee.name)}
                    >
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{employee.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {employee.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {employee.title ?? "Not set"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {employee.division ?? "Not set"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={getPositionBadgeColor(employee.position)}
                >
                  {employee.position ?? "Not set"}
                </Badge>
              </TableCell>
              <TableCell>
                <RelationCell
                  icon={<UsersIcon className="size-3.5" />}
                  label="Manage"
                  records={subordinateEntries}
                  emptyLabel="No subordinates"
                  canManage={canManageSubordinates}
                  manageAction={() => onManageSubordinates(employee)}
                />
              </TableCell>
              <TableCell>
                <RelationCell
                  icon={<NetworkIcon className="size-3.5" />}
                  label="View projects"
                  records={projectEntries}
                  emptyLabel="No projects"
                  canManage={false}
                />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreVerticalIcon className="size-4" />
                      <span className="sr-only">Open row actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {activeTab === "active" ? (
                      <>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            onEdit(employee);
                          }}
                        >
                          <EditIcon className="mr-2 size-4" />
                          Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            onDeactivate(employee);
                          }}
                        >
                          Deactivate Employee
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        className="text-emerald-600 focus:text-emerald-600"
                        onSelect={(event) => {
                          event.preventDefault();
                          onActivate(employee);
                        }}
                      >
                        Activate Account
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

interface RelationEntry {
  id: string;
  name: string;
  avatar?: string | null;
  email?: string | null;
  description?: string | null;
}

interface RelationCellProps {
  icon: ReactNode;
  label: string;
  records: RelationEntry[];
  emptyLabel: string;
  canManage: boolean;
  manageAction?: () => void;
}

function RelationCell({
  icon,
  label,
  records,
  emptyLabel,
  canManage,
  manageAction,
}: RelationCellProps): React.ReactElement {
  const preview = records.slice(0, 2);
  const remainder = records.slice(2);
  const hasRecords = records.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {preview.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
        >
          {record.avatar !== undefined ? (
            <Avatar className="size-6">
              <AvatarImage
                src={record.avatar ?? undefined}
                alt={record.name}
              />
              <AvatarFallback
                className={getAvatarFallbackColor(record.name)}
              >
                {getInitials(record.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            icon
          )}
          <span className="truncate font-medium leading-none">
            {record.name}
          </span>
        </div>
      ))}

      {remainder.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              +{remainder.length} more
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3 p-4 text-sm">
            {remainder.map((record) => (
              <div key={record.id} className="flex items-center gap-3">
                {record.avatar !== undefined ? (
                  <Avatar>
                    <AvatarImage
                      src={record.avatar ?? undefined}
                      alt={record.name}
                    />
                    <AvatarFallback
                      className={getAvatarFallbackColor(record.name)}
                    >
                      {getInitials(record.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-secondary">
                    {icon}
                  </div>
                )}
                <div className="space-y-0.5">
                  <p className="font-medium leading-none">{record.name}</p>
                  {record.description && (
                    <p className="text-xs text-muted-foreground">
                      {record.description}
                    </p>
                  )}
                  {record.email && (
                    <p className="text-xs text-muted-foreground">
                      {record.email}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {canManage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={manageAction}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          {label}
        </Button>
      ) : (
        !hasRecords && (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        )
      )}
    </div>
  );
}
