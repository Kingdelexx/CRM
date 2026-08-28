export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_REP';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Organization extends BaseEntity {
  name: string;
  domain?: string;
  logo?: string;
  industry?: string;
  currency?: string;
  primary_color?: string;
  timezone?: string;
  address?: string;
  billing_emails?: string;
}

export interface CustomRole extends BaseEntity {
  name: string;
  permissions: Record<string, any>;
}

export interface Department extends BaseEntity {
  name: string;
  manager?: User;
}

export interface Team extends BaseEntity {
  name: string;
  department: Department;
  manager?: User;
}

export interface User extends BaseEntity {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  organization?: Organization;
  department?: Department;
  team?: Team;
  manager?: User;
  custom_role?: CustomRole;
  is_active: boolean;
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
  lifecycle_started_at?: string;
  lifecycle_extension_days?: number;
  lifecycle_status?: string;
  is_active_lead?: boolean;
}

export interface OrganizationLifecycleSettings {
  lead_lifecycle_timer_enabled: boolean;
  default_lead_lifecycle_days: number;
}

export interface LeadLifecycleRule extends BaseEntity {
  day: number;
  action_type: 'CREATE_TASK' | 'NOTIFY_EMPLOYEE' | 'NOTIFY_MANAGER' | 'CHANGE_STAGE' | 'MARK_INACTIVE';
  config: Record<string, any>;
}

export interface CustomerList extends BaseEntity {
  name: string;
  list_type: 'STATIC' | 'SMART';
  rules: Record<string, any>;
  contacts_count?: number;
}

export interface CustomModuleField {
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'CHECKBOX';
  required: boolean;
}

export interface CustomModule extends BaseEntity {
  name: string;
  singular_name: string;
  icon: string;
  fields: CustomModuleField[];
}

export interface CustomModuleRecord extends BaseEntity {
  custom_module_id: string;
  data: Record<string, any>;
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

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED';
  start_date?: string;
  end_date?: string;
  manager?: User;
  deal?: Deal;
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

export interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface TaskComment {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee?: User;
  task_team?: Team;
  deal?: Deal;
  contact?: Contact;
  company?: Company;
  attachments?: string[];
  checklist?: ChecklistItem[];
  comments?: TaskComment[];
}
