import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EmployeeListItem } from "@/lib/shared/services/EmployeeService";

import {
  getAvatarFallbackColor,
  getInitials,
} from "../_components/employee-utils";

interface ManageSubordinatesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeListItem | null;
  employees: EmployeeListItem[];
  subordinateMap: Map<string, string>;
  onSave: (employeeId: string, subordinates: string[]) => Promise<boolean>;
}

export function ManageSubordinatesSheet({
  open,
  onOpenChange,
  employee,
  employees,
  subordinateMap,
  onSave,
}: ManageSubordinatesSheetProps): React.ReactElement {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && employee) {
      setSelectedIds(employee.subordinates ?? []);
      setSearchTerm("");
    } else if (!open) {
      setSelectedIds([]);
      setSearchTerm("");
    }
  }, [open, employee]);

  const selectedSubordinates = useMemo(
    () =>
      employees.filter((candidate) => selectedIds.includes(candidate.id)),
    [employees, selectedIds]
  );

  const availableEmployees = useMemo(() => {
    if (!employee) {
      return [];
    }

    const query = searchTerm.trim().toLowerCase();

    return employees.filter((candidate) => {
      if (candidate.id === employee.id) return false;
      if (candidate.position === "CEO") return false;
      if (selectedIds.includes(candidate.id)) return false;

      const managerId = subordinateMap.get(candidate.id);
      if (managerId && managerId !== employee.id) {
        return false;
      }

      if (!query) return true;

      return (
        candidate.name.toLowerCase().includes(query) ||
        candidate.email.toLowerCase().includes(query) ||
        candidate.id.toLowerCase().includes(query)
      );
    });
  }, [employees, employee, subordinateMap, searchTerm, selectedIds]);

  const handleRemoveSubordinate = (id: string): void => {
    setSelectedIds((prev) => prev.filter((candidateId) => candidateId !== id));
  };

  const handleAddSubordinate = (id: string): void => {
    setSelectedIds((prev) => [...prev, id]);
  };

  const handleSave = async (): Promise<void> => {
    if (!employee) return;
    setIsSaving(true);
    try {
      const success = await onSave(employee.id, selectedIds);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Subordinates</SheetTitle>
          <SheetDescription>
            Assign or remove direct reports for {employee?.name ?? "the employee"}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-1">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Current subordinates
            </h3>
            {selectedSubordinates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This employee has no direct reports.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedSubordinates.map((subordinate) => (
              <div
                key={subordinate.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={subordinate.avatar ?? undefined}
                      alt={subordinate.name}
                    />
                    <AvatarFallback
                      className={getAvatarFallbackColor(subordinate.name)}
                    >
                      {getInitials(subordinate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{subordinate.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {subordinate.id} · {subordinate.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[subordinate.title, subordinate.division]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSubordinate(subordinate.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Add subordinate
              </h3>
              <div className="relative">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, email, or ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              {availableEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No employees available. Try a different search.
                </p>
              ) : (
                availableEmployees.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={candidate.avatar ?? undefined}
                          alt={candidate.name}
                        />
                        <AvatarFallback
                          className={getAvatarFallbackColor(candidate.name)}
                        >
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.id} · {candidate.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[candidate.title, candidate.division]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSubordinate(candidate.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <SheetFooter className="px-0">
          <Button type="button" onClick={() => { void handleSave(); }} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
