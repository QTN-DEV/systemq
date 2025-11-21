import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { EmployeeListItem } from "@/lib/shared/services/EmployeeService";

import {
  EmployeeFormSheet,
  type EmployeeFormValues,
} from "../_forms/EmployeeFormSheet";
import { ManageSubordinatesSheet } from "../_forms/ManageSubordinatesSheet";

interface EmployeeModalsSectionProps {
  employeeSheetOpen: boolean;
  onEmployeeSheetOpenChange: (open: boolean) => void;
  employeeFormMode: "create" | "edit";
  employeeInitialValues?: Partial<EmployeeFormValues>;
  onSubmitEmployee: (values: EmployeeFormValues) => Promise<boolean>;
  subordinateSheetOpen: boolean;
  onSubordinateSheetOpenChange: (open: boolean) => void;
  subordinateEmployee: EmployeeListItem | null;
  employees: EmployeeListItem[];
  subordinateMap: Map<string, string>;
  onSaveSubordinates: (
    employeeId: string,
    subordinates: string[]
  ) => Promise<boolean>;
  pendingDeactivate: EmployeeListItem | null;
  onCancelDeactivate: () => void;
  onConfirmDeactivate: () => Promise<void>;
  pendingActivate: EmployeeListItem | null;
  onCancelActivate: () => void;
  onConfirmActivate: () => Promise<void>;
}

export function EmployeeModalsSection({
  employeeSheetOpen,
  onEmployeeSheetOpenChange,
  employeeFormMode,
  employeeInitialValues,
  onSubmitEmployee,
  subordinateSheetOpen,
  onSubordinateSheetOpenChange,
  subordinateEmployee,
  employees,
  subordinateMap,
  onSaveSubordinates,
  pendingDeactivate,
  onCancelDeactivate,
  onConfirmDeactivate,
  pendingActivate,
  onCancelActivate,
  onConfirmActivate,
}: EmployeeModalsSectionProps) {
  return (
    <>
      <EmployeeFormSheet
        open={employeeSheetOpen}
        onOpenChange={onEmployeeSheetOpenChange}
        mode={employeeFormMode}
        initialValues={employeeInitialValues}
        onSubmit={onSubmitEmployee}
      />

      <ManageSubordinatesSheet
        open={subordinateSheetOpen}
        onOpenChange={onSubordinateSheetOpenChange}
        employee={subordinateEmployee}
        employees={employees}
        subordinateMap={subordinateMap}
        onSave={onSaveSubordinates}
      />

      <AlertDialog
        open={Boolean(pendingDeactivate)}
        onOpenChange={(open) => {
          if (!open) {
            onCancelDeactivate();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <span className="font-medium text-foreground">
                {pendingDeactivate?.name}
              </span>{" "}
              ({pendingDeactivate?.id})? They will lose access to the platform
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button onClick={onCancelDeactivate} variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={async () => {
                  await onConfirmDeactivate();
                }}
              >
                Deactivate
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingActivate)}
        onOpenChange={(open) => {
          if (!open) {
            onCancelActivate();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate employee</AlertDialogTitle>
            <AlertDialogDescription>
              Bring{" "}
              <span className="font-medium text-foreground">
                {pendingActivate?.name}
              </span>{" "}
              ({pendingActivate?.id}) back to an active state and restore their
              platform access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button onClick={onCancelActivate} variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={async () => {
                  await onConfirmActivate();
                }}
              >
                Activate
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
