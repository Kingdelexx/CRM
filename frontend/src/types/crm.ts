export type UserRole = 'ADMIN' | 'SALES_REP';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Organization extends BaseEntity {
  name: string;
  domain?: string;
}

export interface User extends BaseEntity {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  organization?: Organization;
}

export interface Company extends BaseEntity {
  name: string;
  domain?: string;
  industry?: string;
  about?: string;
  annual_revenue?: number;
  phone?: string;
}

export interface Stage extends BaseEntity {
  name: string;
  order: number;
  win_probability: number;
  pipeline_type: string;
}

export interface Contact extends BaseEntity {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  status: 'LEAD' | 'CONTACT' | 'CUSTOMER';
  company?: Company;
  assigned_to?: User;
  custom_fields?: Record<string, any>;
}

export interface Deal extends BaseEntity {
  title: string;
  value: number;
  currency: string;
  expected_close_date?: string;
  probability?: number;
  status: 'OPEN' | 'WON' | 'LOST';
  contact?: Contact;
  company?: Company;
  stage: Stage;
}

export interface Activity extends BaseEntity {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  content: string;
  activity_date: string;
  performed_by?: User;
  deal?: Deal;
  contact?: Contact;
  company?: Company;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  due_date?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee?: User;
  deal?: Deal;
  contact?: Contact;
  company?: Company;
}
