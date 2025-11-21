import { useEffect, useMemo, useState, type ReactElement } from "react";

import type { EmployeeListItem } from "@/lib/shared/services/EmployeeService";

import {
  EmployeeManagementHeader,
  NotificationBanner,
} from "./_components";
import type { EmployeeFormValues } from "./_forms/EmployeeFormSheet";
import { useEmployeeActions } from "./_hooks/useEmployeeActions";
import { useEmployeeData } from "./_hooks/useEmployeeData";
import { EmployeeListSection, EmployeeModalsSection } from "./_sections";

const DEFAULT_ROWS_PER_PAGE = 10;

export default function EmployeeManagementPage(): ReactElement {
  const {
    employees,
    inactiveEmployees,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    refetchEmployees,
  } = useEmployeeData();

  const {
    notification,
    setNotification,
    handleCreateEmployee,
    handleUpdateEmployee,
    handleDeactivateEmployee,
    handleActivateEmployee,
    handleUpdateSubordinates,
  } = useEmployeeActions(refetchEmployees);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const [employeeSheetOpen, setEmployeeSheetOpen] = useState(false);
  const [employeeFormMode, setEmployeeFormMode] =
    useState<"create" | "edit">("create");
  const [employeeInitialValues, setEmployeeInitialValues] = useState<
    Partial<EmployeeFormValues> | undefined
  >(undefined);

  const [subordinateSheetOpen, setSubordinateSheetOpen] = useState(false);
  const [subordinateEmployee, setSubordinateEmployee] =
    useState<EmployeeListItem | null>(null);

  const [pendingDeactivate, setPendingDeactivate] =
    useState<EmployeeListItem | null>(null);
  const [pendingActivate, setPendingActivate] =
    useState<EmployeeListItem | null>(null);

  useEffect(() => {
    if (!employeeSheetOpen) {
      setEmployeeInitialValues(undefined);
      setEmployeeFormMode("create");
    }
  }, [employeeSheetOpen]);

  useEffect(() => {
    if (!subordinateSheetOpen) {
      setSubordinateEmployee(null);
    }
  }, [subordinateSheetOpen]);

  useEffect(() => {
    if (!notification) return;
    const timeout = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [notification, setNotification]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, activeTab, searchTerm]);

  const filteredEmployees = useMemo(() => {
    const source =
      activeTab === "active" ? employees : inactiveEmployees;
    if (activeTab === "active") {
      const query = searchTerm.trim().toLowerCase();
      if (!query) {
        return source;
      }
      return source.filter((employee) => {
        const haystack = [
          employee.name,
          employee.email,
          employee.title ?? "",
          employee.id,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return source;
  }, [activeTab, employees, inactiveEmployees, searchTerm]);

  const totalEntries = filteredEmployees.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalEntries / Math.max(rowsPerPage, 1))
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const subordinateMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((manager) => {
      (manager.subordinates ?? []).forEach((subordinateId) => {
        if (!map.has(subordinateId)) {
          map.set(subordinateId, manager.id);
        }
      });
    });
    return map;
  }, [employees]);

  const employeesDirectory = useMemo(() => {
    const directory = new Map<string, EmployeeListItem>();
    [...employees, ...inactiveEmployees].forEach((item) =>
      directory.set(item.id, item)
    );
    return directory;
  }, [employees, inactiveEmployees]);

  const handleCreate = () => {
    setEmployeeFormMode("create");
    setEmployeeInitialValues(undefined);
    setEmployeeSheetOpen(true);
  };

  const handleEdit = (employee: EmployeeListItem) => {
    setEmployeeFormMode("edit");
    setEmployeeInitialValues({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      division: employee.division ?? "",
      title: employee.title ?? "",
      position: employee.position ?? "",
      level: employee.level ?? "",
      employment_type: employee.employment_type ?? "full-time",
    });
    setEmployeeSheetOpen(true);
  };

  const handleSubmitEmployee = async (
    values: EmployeeFormValues
  ): Promise<boolean> => {
    if (employeeFormMode === "edit") {
      return handleUpdateEmployee(values.id, {
        name: values.name,
        email: values.email,
        title: values.title || null,
        division: values.division || null,
        position: values.position || null,
        level: values.level || null,
        employment_type: values.employment_type,
      });
    }

    return handleCreateEmployee({
      id: values.id || undefined,
      name: values.name,
      email: values.email,
      title: values.title || null,
      division: values.division || null,
      position: values.position || null,
      level: values.level || null,
      employment_type: values.employment_type,
      subordinates: [],
      projects: [],
    });
  };

  const handleManageSubordinates = (employee: EmployeeListItem) => {
    setSubordinateEmployee(employee);
    setSubordinateSheetOpen(true);
  };

  const handleSaveSubordinates = async (
    employeeId: string,
    subordinates: string[]
  ): Promise<boolean> => handleUpdateSubordinates(employeeId, subordinates);

  const handleDeactivate = (employee: EmployeeListItem) => {
    setPendingDeactivate(employee);
  };

  const handleActivate = (employee: EmployeeListItem) => {
    setPendingActivate(employee);
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    await handleDeactivateEmployee(pendingDeactivate);
    setPendingDeactivate(null);
  };

  const confirmActivate = async () => {
    if (!pendingActivate) return;
    await handleActivateEmployee(pendingActivate);
    setPendingActivate(null);
  };

  return (
    <div className="space-y-6 p-8">
      {notification && (
        <NotificationBanner
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <EmployeeManagementHeader
        activeTab={activeTab}
        activeCount={employees.length}
        inactiveCount={inactiveEmployees.length}
        searchTerm={searchTerm}
        onSearchTermChange={(value) => setSearchTerm(value)}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
        onCreateEmployee={handleCreate}
        onExport={() => {
          // Export employees is not implemented yet.
        }}
      />

      <EmployeeListSection
        entries={paginatedEmployees}
        employeesDirectory={employeesDirectory}
        activeTab={activeTab}
        onEdit={handleEdit}
        onManageSubordinates={handleManageSubordinates}
        onDeactivate={handleDeactivate}
        onActivate={handleActivate}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(value) => setRowsPerPage(value)}
        totalEntries={totalEntries}
        startIndex={startIndex}
      />

      <EmployeeModalsSection
        employeeSheetOpen={employeeSheetOpen}
        onEmployeeSheetOpenChange={setEmployeeSheetOpen}
        employeeFormMode={employeeFormMode}
        employeeInitialValues={employeeInitialValues}
        onSubmitEmployee={handleSubmitEmployee}
        subordinateSheetOpen={subordinateSheetOpen}
        onSubordinateSheetOpenChange={setSubordinateSheetOpen}
        subordinateEmployee={subordinateEmployee}
        employees={employees}
        subordinateMap={subordinateMap}
        onSaveSubordinates={handleSaveSubordinates}
        pendingDeactivate={pendingDeactivate}
        onCancelDeactivate={() => setPendingDeactivate(null)}
        onConfirmDeactivate={confirmDeactivate}
        pendingActivate={pendingActivate}
        onCancelActivate={() => setPendingActivate(null)}
        onConfirmActivate={confirmActivate}
      />
    </div>
  );
}
