import { useState } from 'react';

import { logger } from '@/lib/logger';
import {
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  activateEmployee,
  type CreateUserPayload,
  type UpdateEmployeePayload,
  type EmployeeListItem,
} from '@/lib/shared/services/EmployeeService';

export type NotificationType = {
  type: 'success' | 'error';
  message: string;
} | null;

export function useEmployeeActions(refetchEmployees: () => Promise<void>): {
  notification: NotificationType;
  setNotification: (notification: NotificationType) => void;
  handleCreateEmployee: (payload: CreateUserPayload) => Promise<boolean>;
  handleUpdateEmployee: (id: string, payload: UpdateEmployeePayload) => Promise<boolean>;
  handleDeactivateEmployee: (employee: EmployeeListItem) => Promise<void>;
  handleActivateEmployee: (employee: EmployeeListItem) => Promise<void>;
  handleUpdateSubordinates: (employeeId: string, subordinates: string[]) => Promise<boolean>;
} {
  const [notification, setNotification] = useState<NotificationType>(null);

  const handleCreateEmployee = async (payload: CreateUserPayload): Promise<boolean> => {
    try {
      await createEmployee(payload);
      setNotification({ type: 'success', message: 'Employee created successfully' });
      await refetchEmployees();
      return true;
    } catch (error) {
      logger.error('Failed to create employee', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setNotification({ type: 'error', message: 'Employee ID or Email already exists' });
      } else {
        setNotification({ type: 'error', message: 'Failed to save employee' });
      }
      return false;
    }
  };

  const handleUpdateEmployee = async (id: string, payload: UpdateEmployeePayload): Promise<boolean> => {
    try {
      await updateEmployee(id, payload);
      setNotification({ type: 'success', message: 'Employee updated successfully' });
      await refetchEmployees();
      return true;
    } catch (error) {
      logger.error('Failed to update employee', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setNotification({ type: 'error', message: 'Employee ID or Email already exists' });
      } else {
        setNotification({ type: 'error', message: 'Failed to save employee' });
      }
      return false;
    }
  };

  const handleDeactivateEmployee = async (employee: EmployeeListItem): Promise<void> => {
    try {
      await deactivateEmployee(employee.id);
      await refetchEmployees();
      setNotification({ type: 'success', message: 'Employee deactivated successfully.' });
    } catch (error) {
      logger.error('Failed to deactivate employee', error);
      setNotification({ type: 'error', message: 'Failed to deactivate employee.' });
    }
  };

  const handleActivateEmployee = async (employee: EmployeeListItem): Promise<void> => {
    try {
      await activateEmployee(employee.id);
      await refetchEmployees();
      setNotification({ type: 'success', message: 'Employee activated successfully.' });
    } catch (error) {
      logger.error('Failed to activate employee', error);
      setNotification({ type: 'error', message: 'Failed to activate employee.' });
    }
  };

  const handleUpdateSubordinates = async (
    employeeId: string,
    subordinates: string[]
  ): Promise<boolean> => {
    try {
      await updateEmployee(employeeId, { subordinates });
      await refetchEmployees();
      setNotification({ type: 'success', message: 'Subordinates updated successfully.' });
      return true;
    } catch (error) {
      logger.error('Failed to update subordinates', error);
      setNotification({ type: 'error', message: 'Failed to update subordinates.' });
      return false;
    }
  };

  return {
    notification,
    setNotification,
    handleCreateEmployee,
    handleUpdateEmployee,
    handleDeactivateEmployee,
    handleActivateEmployee,
    handleUpdateSubordinates,
  };
}
