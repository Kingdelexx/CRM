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
  gbp_to_ngn_rate?: number;
  parcel_rate?: number;
  doorstep_rate?: number;
  per_kg_price?: number;
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
  whatsapp_number?: string;
  lead_acquisition_cost?: number;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  job_title?: string;
  status: 'LEAD' | 'CONTACT' | 'CUSTOMER' | 'PARTNER';
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
  progress: number;
  attachments?: string[];
  members?: User[];
}

export interface Pipeline extends BaseEntity {
  name: string;
  description?: string;
  is_default: boolean;
}

export interface CustomFieldDefinition extends BaseEntity {
  name: string;
  label: string;
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'CHECKBOX';
  model_name: 'CONTACT' | 'COMPANY' | 'DEAL';
  required: boolean;
  options?: string[];
}

export interface Report extends BaseEntity {
  name: string;
  description?: string;
  base_module: 'LEADS' | 'CUSTOMERS' | 'DEALS' | 'PROJECTS' | 'TASKS' | 'ACTIVITIES' | 'EMPLOYEES';
  display_type: 'TABLE' | 'BAR_CHART' | 'LINE_CHART' | 'PIE_CHART' | 'SUMMARY_CARDS';
  filters?: Record<string, any>;
  created_by?: User;
}

export interface EmailAccount extends BaseEntity {
  email_address: string;
  provider: string; // 'GMAIL' | 'MICROSOFT' | 'SMTP'
  is_connected: boolean;
}

export interface WhatsAppAccount extends BaseEntity {
  phone_number: string;
  display_name: string;
  is_connected: boolean;
}

export interface WhatsAppConversation extends BaseEntity {
  whatsapp_account: WhatsAppAccount;
  contact?: Contact;
  assigned_to?: User;
  unread_count: number;
}

export interface WhatsAppMessage extends BaseEntity {
  conversation: WhatsAppConversation;
  sender_type: 'CUSTOMER' | 'AGENT';
  sender_name: string;
  text: string;
}

export interface AutomationRule extends BaseEntity {
  name: string;
  event_trigger: 'NEW_LEAD' | 'DEAL_STAGE_CHANGE' | 'DEAL_VALUE_LARGE' | 'WHATSAPP_RECEIVED';
  conditions: Record<string, any>;
  actions: Array<{
    type: 'CREATE_TASK' | 'CREATE_NOTIFICATION';
    config: Record<string, any>;
  }>;
  is_active: boolean;
}

export interface Notification extends BaseEntity {
  user: User;
  title: string;
  message: string;
  notification_type: 'SYSTEM' | 'ASSIGNMENT' | 'ALERT';
  is_read: boolean;
}

export interface NotificationPreference extends BaseEntity {
  email_deal_closed: boolean;
  email_contact_assigned: boolean;
  email_task_assigned: boolean;
  system_alert: boolean;
}

export interface ApprovalWorkflow extends BaseEntity {
  name: string;
  steps: Array<{
    name: string;
    approver_roles: string[];
  }>;
}

export interface ApprovalRequest extends BaseEntity {
  workflow: ApprovalWorkflow;
  title: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by: User;
  current_step_index: number;
  history: Array<{
    step: number;
    user_id: string;
    user_name: string;
    decision: 'APPROVED' | 'REJECTED';
    comments?: string;
    timestamp: string;
  }>;
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
  partner?: Contact;
  company?: Company;
  attachments?: string[];
  checklist?: ChecklistItem[];
  comments?: TaskComment[];
}

export interface Activity extends BaseEntity {
  performed_by?: User;
  type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING';
  content: string;
  activity_date: string;
  contact?: Contact;
  company?: Company;
}

export interface LogisticsItem {
  dos?: string;
  nature_of_item: string;
  weight_kg?: number;
  price_ngn?: number;
  price_gbp?: number;
  total_ngn?: number;
  total_gbp?: number;
}

export interface LogisticsService {
  sn?: string | number;
  service_name: string;
  price_ngn?: number;
  price_gbp?: number;
}

export interface Invoice extends BaseEntity {
  invoice_number: string;
  contact?: Contact;
  company?: Company;
  deal?: Deal;
  issue_date: string;
  due_date?: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  receiver_name?: string;
  receiver_tel?: string;
  receiver_email?: string;
  receiver_address?: string;
  total_value_items?: number;
  expected_parcel_no?: string;
  parcel_handler?: string;
  items?: LogisticsItem[];
  services?: LogisticsService[];
  total_ngn: number;
  total_gbp: number;
  amount_paid: number;
  currency: string;
  sla_terms_url?: string;
  notes?: string;
}

export interface Receipt extends BaseEntity {
  receipt_number: string;
  invoice?: Invoice;
  contact?: Contact;
  payment_date: string;
  amount_paid_ngn: number;
  amount_paid_gbp: number;
  payment_method: string;
  reference_number?: string;
  items_summary?: Record<string, any>;
  notes?: string;
}

export interface DashboardActivity {
  id: string;
  type: string;
  content: string;
  performed_by: string;
  time: string;
}

export interface EmployeeDashboardMetrics {
  mode: 'EMPLOYEE';
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    completed: number;
    due_today: number;
    overdue: number;
  };
  leads: {
    total_leads: number;
    total_customers: number;
    pipeline_value: number;
    win_rate: number;
  };
  activities: DashboardActivity[];
}

export interface ManagerDashboardMetrics {
  mode: 'MANAGER';
  stats: {
    total_revenue: number;
    pipeline_value: number;
    active_deals: number;
    win_rate: number;
  };
  tasks: {
    todo: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  members: Array<{
    id: string;
    name: string;
    role: string;
    tasks_completed: number;
    tasks_pending: number;
    deals_won: number;
    pipeline_value: number;
  }>;
  activities: DashboardActivity[];
}

export interface BossDashboardMetrics {
  mode: 'BOSS';
  stats: {
    total_revenue: number;
    pipeline_value: number;
    active_deals: number;
    win_rate: number;
  };
  tasks: {
    todo: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  departments: Array<{
    id: string;
    name: string;
    revenue: number;
    pipeline: number;
    deals_won: number;
    members_count: number;
  }>;
  projects: {
    total: number;
    planning: number;
    in_progress: number;
    ready: number;
    delivered: number;
  };
  activities: DashboardActivity[];
}

export type DashboardMetrics = EmployeeDashboardMetrics | ManagerDashboardMetrics | BossDashboardMetrics;

export interface Shipment extends BaseEntity {
  sender?: Contact;
  sender_name?: string;
  sender_phone?: string;
  sender_email?: string;
  sender_address?: string;
  receiver?: Contact;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_email?: string;
  receiver_address?: string;
  date?: string;
  shipment_date?: string;
  shipment_status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CUSTOMS_HOLD' | 'CANCELLED';
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  shipping_type?: 'AIR' | 'SEA';
  currency: 'NGN' | 'USD' | 'GBP';
  conversion_rate: number;
  amount: number;
  discount_percentage?: number;
  invoice_number?: string;
  number_of_carton: number;
  has_doorstep_delivery?: boolean;
  partner?: Contact;
  partner_name?: string;
  item_received?: string;
  items_shipped?: string;
  items_recieved?: string;
  weight_kg: number;
  tracking_id: string;
  value: number;
  note?: string;
  recorded_by?: User;
}

export type EscalationType = 'DELAY' | 'DAMAGED_GOODS' | 'MISSING_ITEM' | 'BILLING_ISSUE' | 'CUSTOMS_HOLD' | 'WRONG_DELIVERY' | 'OTHER';
export type EscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EscalationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface ShipmentEscalation extends BaseEntity {
  date?: string;
  shipment?: Shipment;
  customer?: Contact;
  customer_name?: string;
  escalation_type: EscalationType;
  priority: EscalationPriority;
  complaint_summary: string;
  status: EscalationStatus;
  internal?: string;
  escalation_to?: User;
  resolution?: string;
  resolution_date?: string;
  created_by?: User;
}

export type CSRReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface CSRReport extends BaseEntity {
  date?: string;
  report_type: CSRReportType;
  staff?: User;
  reported_to?: User;

  // Daily Report Metrics
  new_enquiries: number;
  packages_expected: number;
  quotation_sent: number;
  shipment_booked: number;
  outstanding_follow_up: number;
  customer_complaint_resolved: number;
  returning_customers: number;
  packages_received: number;
  customer_converted_paid: number;
  follow_up_completed: number;
  customer_complaint_received: number;
  customer_escalated_to_manager: number;

  // Weekly Report Qualitative Details
  shipment_delays_and_reason?: string;
  biggest_challenge_week?: string;
  support_needed?: string;
  biggest_achievement_week?: string;
  suggestion_for_improvement?: string;

  // Monthly Report Specific & Qualitative Details
  month_name?: string;
  social_media_follows_encouraged: number;
  video_testimonial_received: number;
  biggest_challenge_month?: string;
  biggest_achievement_month?: string;
}

export interface CSRAggregationResult {
  new_enquiries: number;
  packages_expected: number;
  quotation_sent: number;
  shipment_booked: number;
  outstanding_follow_up: number;
  customer_complaint_resolved: number;
  returning_customers: number;
  packages_received: number;
  customer_converted_paid: number;
  follow_up_completed: number;
  customer_complaint_received: number;
  customer_escalated_to_manager: number;
  count_daily_reports: number;
}






