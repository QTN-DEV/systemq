import type { EmployeeListItem } from "@/lib/shared/services/EmployeeService";

import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EmployeeTable } from "../_components/EmployeeTable";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50] as const;

interface EmployeeListSectionProps {
  entries: EmployeeListItem[];
  employeesDirectory: Map<string, EmployeeListItem>;
  activeTab: "active" | "inactive";
  onEdit: (employee: EmployeeListItem) => void;
  onManageSubordinates: (employee: EmployeeListItem) => void;
  onDeactivate: (employee: EmployeeListItem) => void;
  onActivate: (employee: EmployeeListItem) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (value: number) => void;
  totalEntries: number;
  startIndex: number;
}

export function EmployeeListSection({
  entries,
  employeesDirectory,
  activeTab,
  onEdit,
  onManageSubordinates,
  onDeactivate,
  onActivate,
  currentPage,
  totalPages,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalEntries,
  startIndex,
}: EmployeeListSectionProps) {
  const endIndex = Math.min(startIndex + entries.length, totalEntries);
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <h3 className="text-lg font-semibold">No employees found</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Try adjusting your search or switch tabs to view employees in a
            different lifecycle state.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <EmployeeTable
            entries={entries}
            employeesDirectory={employeesDirectory}
            activeTab={activeTab}
            onEdit={onEdit}
            onManageSubordinates={onManageSubordinates}
            onDeactivate={onDeactivate}
            onActivate={onActivate}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={(value) => onRowsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {ROWS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1} - {endIndex} of {totalEntries}
          </span>
        </div>

        <Pagination className="justify-end sm:justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(Math.max(1, currentPage - 1));
                }}
              />
            </PaginationItem>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(Math.min(totalPages, currentPage + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

function buildPaginationItems(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 1) {
    return [1];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(currentPage);
  pages.add(currentPage - 1);
  pages.add(currentPage + 1);

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];
  let lastPage = 0;

  for (const page of sortedPages) {
    if (page - lastPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    lastPage = page;
  }

  return result;
}
