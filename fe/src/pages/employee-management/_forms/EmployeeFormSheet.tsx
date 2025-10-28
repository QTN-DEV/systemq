import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DIVISION_OPTIONS = [
  "Internal Ops",
  "Business Development",
  "Developer",
  "Finance",
  "Graphic Design",
  "Infrastructure",
  "Marketing",
  "UI/UX",
  "Product",
  "Ops Support",
] as const;

const POSITION_OPTIONS = [
  "Admin",
  "CEO",
  "Internal Ops",
  "Div Lead",
  "PM",
  "Team Member",
] as const;

const LEVEL_OPTIONS = [
  "Entry",
  "Junior",
  "Mid",
  "Senior",
  "Lead",
  "Principal",
] as const;

const EMPLOYMENT_OPTIONS = ["full-time", "part-time", "intern"] as const;

export interface EmployeeFormValues {
  id: string;
  name: string;
  email: string;
  division: string;
  title: string;
  position: string;
  level: string;
  employment_type: "full-time" | "part-time" | "intern";
}

interface EmployeeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues?: Partial<EmployeeFormValues>;
  onSubmit: (values: EmployeeFormValues) => Promise<boolean>;
}

const DEFAULT_VALUES: EmployeeFormValues = {
  id: "",
  name: "",
  email: "",
  division: "",
  title: "",
  position: "",
  level: "",
  employment_type: "full-time",
};

export function EmployeeFormSheet({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: EmployeeFormSheetProps) {
  const [formValues, setFormValues] = useState<EmployeeFormValues>(DEFAULT_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormValues({
        ...DEFAULT_VALUES,
        ...initialValues,
      });
    } else {
      setFormValues(DEFAULT_VALUES);
    }
  }, [open, initialValues]);

  const divisionOptions = useMemo(
    () => withCurrentValue(DIVISION_OPTIONS, formValues.division),
    [formValues.division]
  );
  const positionOptions = useMemo(
    () => withCurrentValue(POSITION_OPTIONS, formValues.position),
    [formValues.position]
  );
  const levelOptions = useMemo(
    () => withCurrentValue(LEVEL_OPTIONS, formValues.level),
    [formValues.level]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await onSubmit(formValues);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof EmployeeFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>
              {mode === "edit" ? "Edit Employee" : "Add New Employee"}
            </SheetTitle>
            <SheetDescription>
              {mode === "edit"
                ? "Update the core details of the employee profile."
                : "Provide employee details to create a new profile."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-1">
            <div className="grid gap-2">
              <Label htmlFor="employee-id">Employee ID</Label>
              <Input
                id="employee-id"
                value={formValues.id}
                onChange={(event) => handleChange("id", event.target.value)}
                placeholder="QTN-00012"
                required
                disabled={mode === "edit"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employee-name">Full Name</Label>
              <Input
                id="employee-name"
                value={formValues.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employee-email">Email Address</Label>
              <Input
                id="employee-email"
                type="email"
                value={formValues.email}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="john.doe@company.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use the employee&apos;s corporate email address.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Division</Label>
              <Select
                value={formValues.division || undefined}
                onValueChange={(value) => handleChange("division", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisionOptions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employee-title">Title</Label>
              <Input
                id="employee-title"
                value={formValues.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Product Designer"
              />
            </div>

            <div className="grid gap-2">
              <Label>Position</Label>
              <Select
                value={formValues.position || undefined}
                onValueChange={(value) => handleChange("position", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Level</Label>
              <Select
                value={formValues.level || undefined}
                onValueChange={(value) => handleChange("level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Employment Type</Label>
              <Select
                value={formValues.employment_type}
                onValueChange={(value) =>
                  handleChange(
                    "employment_type",
                    value as EmployeeFormValues["employment_type"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Add Employee"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function withCurrentValue<T extends readonly string[]>(
  options: T,
  currentValue: string
): string[] {
  const normalized = [...options];
  if (currentValue && !normalized.includes(currentValue)) {
    normalized.unshift(currentValue);
  }
  return Array.from(new Set(normalized));
}
