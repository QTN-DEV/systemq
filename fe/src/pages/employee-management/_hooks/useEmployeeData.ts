import { useState, useEffect } from 'react';

import { logger } from '@/lib/logger';
import {
  getEmployees,
  getInactiveEmployees,
  type EmployeeListItem,
} from '@/lib/shared/services/EmployeeService';

export function useEmployeeData(): {
  employees: EmployeeListItem[];
  inactiveEmployees: EmployeeListItem[];
  activeTab: 'active' | 'inactive';
  setActiveTab: (tab: 'active' | 'inactive') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setEmployees: (employees: EmployeeListItem[]) => void;
  setInactiveEmployees: (employees: EmployeeListItem[]) => void;
  refetchEmployees: () => Promise<void>;
} {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [inactiveEmployees, setInactiveEmployees] = useState<EmployeeListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch active employees
  useEffect(() => {
    void (async () => {
      try {
        const data = await getEmployees();
        setEmployees(data);
      } catch (error) {
        logger.error('Failed to load employees', error);
      }
    })();
  }, []);

  // Fetch inactive employees when inactive tab is selected
  useEffect(() => {
    if (activeTab === 'inactive') {
      void (async () => {
        try {
          const data = await getInactiveEmployees(searchTerm || undefined);
          setInactiveEmployees(data);
        } catch (error) {
          logger.error('Failed to fetch inactive employees', error);
        }
      })();
    }
  }, [activeTab, searchTerm]);

  const refetchEmployees = async (): Promise<void> => {
    try {
      const [activeData, inactiveData] = await Promise.all([
        getEmployees(),
        getInactiveEmployees(),
      ]);
      setEmployees(activeData);
      setInactiveEmployees(inactiveData);
    } catch (error) {
      logger.error('Failed to refetch employees', error);
    }
  };

  return {
    employees,
    inactiveEmployees,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    setEmployees,
    setInactiveEmployees,
    refetchEmployees,
  };
}
