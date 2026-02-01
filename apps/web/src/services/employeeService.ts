import apiClient from './api';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '../types/employee';

export const employeeService = {
  // Get all employees
  async getAll(): Promise<Employee[]> {
    const response = await apiClient.get('/employees');
    return response.data.data;
  },

  // Get employee by ID
  async getById(id: string): Promise<Employee> {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data.data;
  },

  // Create employee
  async create(input: CreateEmployeeInput): Promise<Employee> {
    const response = await apiClient.post('/employees', input);
    return response.data.data;
  },

  // Update employee
  async update(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const response = await apiClient.put(`/employees/${id}`, input);
    return response.data.data;
  },

  // Delete employee (soft delete)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },
};
