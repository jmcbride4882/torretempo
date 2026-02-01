export interface Employee {
  id: string;
  tenantId: string;
  userId: string;
  nationalId: string;
  socialSecurity: string;
  phone?: string;
  emergencyContact?: string;
  employeeNumber?: string;
  departmentId?: string;
  position?: string;
  contractType: 'indefinido' | 'temporal' | 'practicas' | 'formacion';
  hireDate: string;
  terminationDate?: string;
  workSchedule: string;
  status: 'active' | 'on_leave' | 'terminated';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'PLATFORM_ADMIN' | 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    status: string;
  };
}

export interface CreateEmployeeInput {
  // User fields
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role?: 'owner' | 'admin' | 'manager' | 'employee';
  
  // Employee fields
  nationalId: string;
  socialSecurity: string;
  phone?: string;
  emergencyContact?: string;
  employeeNumber?: string;
  departmentId?: string;
  position?: string;
  contractType: 'indefinido' | 'temporal' | 'practicas' | 'formacion';
  hireDate: string;
  workSchedule?: string;
}

export interface UpdateEmployeeInput {
  phone?: string;
  emergencyContact?: string;
  position?: string;
  contractType?: 'indefinido' | 'temporal' | 'practicas' | 'formacion';
  workSchedule?: string;
  status?: 'active' | 'on_leave' | 'terminated';
}
