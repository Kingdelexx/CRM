from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from ninja import ModelSchema, Schema
from .models import (
    Company, Stage, Contact, Deal, Project, Pipeline, CustomFieldDefinition,
    Report, EmailAccount, WhatsAppAccount, WhatsAppConversation, WhatsAppMessage,
    AutomationRule, Notification, NotificationPreference, ApprovalWorkflow, ApprovalRequest,
    Document, CustomModuleRecord, Invoice, Receipt, Shipment, ShipmentEscalation,
    CSRReport
)
from apps.accounts.schemas import UserSchema, OrganizationSchema



class CompanySchema(ModelSchema):
    class Meta:
        model = Company
        fields = ['id', 'name', 'domain', 'industry', 'about', 'annual_revenue', 'phone', 'custom_fields', 'created_at', 'updated_at']

class CompanyCreateSchema(Schema):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    about: Optional[str] = None
    annual_revenue: Optional[float] = None
    phone: Optional[str] = None
    custom_fields: Optional[dict] = None

class StageSchema(ModelSchema):
    class Meta:
        model = Stage
        fields = ['id', 'name', 'order', 'win_probability', 'pipeline_type', 'created_at', 'updated_at']

class StageCreateSchema(Schema):
    name: str
    order: int
    win_probability: Optional[int] = 0
    pipeline_type: Optional[str] = 'SALES'

class ContactSchema(ModelSchema):
    company: Optional[CompanySchema] = None
    assigned_to: Optional[UserSchema] = None
    
    class Meta:
        model = Contact
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'whatsapp_number',
            'lead_acquisition_cost', 'city', 'state', 'address', 'job_title', 'status',
            'custom_fields', 'lifecycle_started_at', 'lifecycle_extension_days',
            'lifecycle_status', 'is_active_lead', 'country', 'created_at', 'updated_at'
        ]

class ContactCreateSchema(Schema):
    first_name: str
    last_name: str
    email: Optional[str] = ""
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    lead_acquisition_cost: Optional[float] = 0.0
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = 'LEAD'
    company_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    custom_fields: Optional[dict] = None
    country: Optional[str] = None

class BulkContactImportItem(Schema):
    first_name: str
    last_name: Optional[str] = "."
    email: Optional[str] = ""
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    status: Optional[str] = "LEAD"
    assigned_to_id: Optional[UUID] = None

class BulkContactImportSchema(Schema):
    contacts: List[BulkContactImportItem]
    status: Optional[str] = "LEAD"
    assigned_to_id: Optional[UUID] = None
    bypass_duplicates: Optional[bool] = True

class DealSchema(ModelSchema):
    stage: StageSchema
    contact: Optional[ContactSchema] = None
    company: Optional[CompanySchema] = None
    
    class Meta:
        model = Deal
        fields = ['id', 'title', 'value', 'currency', 'expected_close_date', 'probability', 'status', 'custom_fields', 'created_at', 'updated_at']

class DealCreateSchema(Schema):
    title: str
    value: float
    currency: Optional[str] = 'USD'
    stage_id: UUID
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    expected_close_date: Optional[date] = None
    probability: Optional[int] = 0
    status: Optional[str] = 'OPEN'
    custom_fields: Optional[dict] = None

class ProjectSchema(ModelSchema):
    manager: Optional[UserSchema] = None
    deal: Optional[DealSchema] = None
    members: Optional[List[UserSchema]] = None

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'start_date', 'end_date', 'attachments', 'progress', 'custom_fields', 'created_at', 'updated_at']

class ProjectCreateSchema(Schema):
    name: str
    description: Optional[str] = None
    status: Optional[str] = 'PLANNING'
    manager_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    members_ids: Optional[List[UUID]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    attachments: Optional[list] = None
    progress: Optional[int] = 0
    custom_fields: Optional[dict] = None

class PipelineSchema(ModelSchema):
    class Meta:
        model = Pipeline
        fields = ['id', 'name', 'code', 'created_at', 'updated_at']

class PipelineCreateSchema(Schema):
    name: str
    code: str

class CustomFieldDefinitionSchema(ModelSchema):
    class Meta:
        model = CustomFieldDefinition
        fields = ['id', 'model_name', 'name', 'label', 'type', 'config', 'required', 'created_at', 'updated_at']

class CustomFieldDefinitionCreateSchema(Schema):
    model_name: str
    name: str
    label: str
    type: str
    config: Optional[dict] = None
    required: Optional[bool] = False

class ReportSchema(ModelSchema):
    created_by: Optional[UserSchema] = None
    class Meta:
        model = Report
        fields = ['id', 'name', 'base_module', 'filters', 'display_type', 'scheduled_cron', 'recipients', 'created_at', 'updated_at']

class ReportCreateSchema(Schema):
    name: str
    base_module: str
    filters: Optional[dict] = None
    display_type: Optional[str] = 'TABLE'
    scheduled_cron: Optional[str] = None
    recipients: Optional[list] = None

class EmailAccountSchema(ModelSchema):
    class Meta:
        model = EmailAccount
        fields = ['id', 'email_address', 'provider', 'is_connected', 'created_at', 'updated_at']

class EmailAccountCreateSchema(Schema):
    email_address: str
    provider: str

class WhatsAppAccountSchema(ModelSchema):
    class Meta:
        model = WhatsAppAccount
        fields = ['id', 'phone_number', 'display_name', 'is_connected', 'created_at']

class WhatsAppAccountCreateSchema(Schema):
    phone_number: str
    display_name: str

class WhatsAppConversationSchema(ModelSchema):
    whatsapp_account: WhatsAppAccountSchema
    contact: Optional[ContactSchema] = None
    assigned_to: Optional[UserSchema] = None

    class Meta:
        model = WhatsAppConversation
        fields = ['id', 'contact', 'assigned_to', 'status', 'created_at', 'updated_at']

class WhatsAppMessageSchema(ModelSchema):
    class Meta:
        model = WhatsAppMessage
        fields = ['id', 'sender_type', 'sender_name', 'text', 'created_at']

class AutomationRuleSchema(ModelSchema):
    class Meta:
        model = AutomationRule
        fields = ['id', 'name', 'is_active', 'event_trigger', 'conditions', 'actions', 'created_at', 'updated_at']

class AutomationRuleCreateSchema(Schema):
    name: str
    is_active: Optional[bool] = True
    event_trigger: str
    conditions: Optional[dict] = None
    actions: list

class NotificationSchema(ModelSchema):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'created_at']

class NotificationPreferenceSchema(ModelSchema):
    class Meta:
        model = NotificationPreference
        fields = [
            'email_new_task', 'in_app_new_task', 'email_task_assigned', 'in_app_task_assigned',
            'email_task_overdue', 'in_app_task_overdue', 'email_new_lead', 'in_app_new_lead',
            'email_new_customer', 'in_app_new_customer', 'email_new_message', 'in_app_new_message',
            'email_new_email', 'in_app_new_email', 'email_mention', 'in_app_mention',
            'email_approval_request', 'in_app_approval_request', 'email_automation', 'in_app_automation',
            'email_upcoming_deadline', 'in_app_upcoming_deadline'
        ]

class ApprovalWorkflowSchema(ModelSchema):
    class Meta:
        model = ApprovalWorkflow
        fields = ['id', 'name', 'steps', 'created_at', 'updated_at']

class ApprovalWorkflowCreateSchema(Schema):
    name: str
    steps: list

class ApprovalRequestSchema(ModelSchema):
    workflow: ApprovalWorkflowSchema
    requested_by: UserSchema
    class Meta:
        model = ApprovalRequest
        fields = ['id', 'title', 'description', 'status', 'current_step_index', 'history', 'created_at', 'updated_at']

class ApprovalRequestCreateSchema(Schema):
    workflow_id: UUID
    title: str
    description: Optional[str] = None

# Lead Lifecycle and organization settings schemas
class OrganizationLifecycleSettingsSchema(Schema):
    lead_lifecycle_timer_enabled: bool
    default_lead_lifecycle_days: int

class LeadLifecycleRuleSchema(Schema):
    id: UUID
    day: int
    action_type: str
    config: dict

class LeadLifecycleRuleCreateSchema(Schema):
    day: int
    action_type: str
    config: dict

class CustomerListSchema(Schema):
    id: UUID
    name: str
    list_type: str
    rules: dict
    contacts_count: Optional[int] = None

class CustomerListCreateSchema(Schema):
    name: str
    list_type: str
    rules: Optional[dict] = None

class CustomModuleSchema(Schema):
    id: UUID
    name: str
    singular_name: str
    icon: str
    fields: list

class CustomModuleCreateSchema(Schema):
    name: str
    singular_name: str
    icon: Optional[str] = 'Grid'
    fields: list

class CustomModuleRecordSchema(Schema):
    id: UUID
    custom_module_id: UUID
    data: dict
    created_at: datetime
    updated_at: datetime


class DocumentSchema(ModelSchema):
    uploaded_by: Optional[UserSchema] = None
    class Meta:
        model = Document
        fields = [
            'id', 'name', 'file_url', 'file_type', 'file_size',
            'contact', 'company', 'task', 'project', 'deal',
            'custom_record', 'created_at', 'updated_at'
        ]


class DocumentCreateSchema(Schema):
    name: str
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    custom_record_id: Optional[UUID] = None


class InvoiceSchema(ModelSchema):
    contact: Optional[ContactSchema] = None
    company: Optional[CompanySchema] = None
    deal: Optional[DealSchema] = None

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'issue_date', 'due_date', 'status',
            'receiver_name', 'receiver_tel', 'receiver_email', 'receiver_address',
            'total_value_items', 'expected_parcel_no', 'parcel_handler',
            'items', 'services', 'total_ngn', 'total_gbp', 'amount_paid',
            'currency', 'sla_terms_url', 'notes', 'created_at', 'updated_at'
        ]


class InvoiceCreateSchema(Schema):
    invoice_number: Optional[str] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    issue_date: date
    due_date: Optional[date] = None
    status: Optional[str] = 'DRAFT'
    receiver_name: Optional[str] = None
    receiver_tel: Optional[str] = None
    receiver_email: Optional[str] = None
    receiver_address: Optional[str] = None
    total_value_items: Optional[float] = 0.0
    expected_parcel_no: Optional[str] = None
    parcel_handler: Optional[str] = None
    items: Optional[list] = None
    services: Optional[list] = None
    total_ngn: Optional[float] = 0.0
    total_gbp: Optional[float] = 0.0
    amount_paid: Optional[float] = 0.0
    currency: Optional[str] = 'NGN'
    sla_terms_url: Optional[str] = 'https://www.mintana.co.uk/terms-and-conditions'
    notes: Optional[str] = None


class ReceiptSchema(ModelSchema):
    invoice: Optional[InvoiceSchema] = None
    contact: Optional[ContactSchema] = None

    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'payment_date', 'amount_paid_ngn', 'amount_paid_gbp',
            'payment_method', 'reference_number', 'items_summary', 'notes', 'created_at', 'updated_at'
        ]


class ReceiptCreateSchema(Schema):
    invoice_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    receipt_number: Optional[str] = None
    amount_paid_ngn: Optional[float] = 0.0
    amount_paid_gbp: Optional[float] = 0.0
    payment_method: Optional[str] = 'BANK_TRANSFER'
    reference_number: Optional[str] = None
    items_summary: Optional[dict] = None
    notes: Optional[str] = None


class ShipmentSchema(ModelSchema):
    sender: Optional[ContactSchema] = None
    receiver: Optional[ContactSchema] = None
    partner: Optional[ContactSchema] = None
    recorded_by: Optional[UserSchema] = None

    class Meta:
        model = Shipment
        fields = [
            'id', 'sender_name', 'sender_phone', 'sender_email', 'sender_address',
            'receiver_name', 'receiver_phone', 'receiver_email', 'receiver_address',
            'date', 'shipment_date', 'shipment_status', 'payment_status', 'shipping_type', 'currency', 'conversion_rate', 'amount',
            'discount_percentage', 'invoice_number', 'number_of_carton', 'has_doorstep_delivery', 'partner_name', 'item_received', 'items_shipped',
            'items_recieved', 'weight_kg', 'tracking_id', 'value', 'note', 'created_at', 'updated_at'
        ]


class ShipmentCreateSchema(Schema):
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    sender_email: Optional[str] = None
    sender_address: Optional[str] = None
    receiver_id: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    receiver_email: Optional[str] = None
    receiver_address: Optional[str] = None
    date: Optional[str] = None
    shipment_date: Optional[str] = None
    shipment_status: Optional[str] = 'PENDING'
    payment_status: Optional[str] = 'UNPAID'
    shipping_type: Optional[str] = 'AIR'
    currency: Optional[str] = 'NGN'
    conversion_rate: Optional[float] = 1.0000
    amount: Optional[float] = 0.00
    discount_percentage: Optional[float] = 0.00
    invoice_number: Optional[str] = None
    number_of_carton: Optional[int] = 1
    has_doorstep_delivery: Optional[bool] = False
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    item_received: Optional[str] = None
    items_shipped: Optional[str] = None
    items_recieved: Optional[str] = None
    weight_kg: Optional[float] = 0.00
    tracking_id: Optional[str] = None
    value: Optional[float] = 0.00
    note: Optional[str] = None
    recorded_by_id: Optional[str] = None


class ShipmentEscalationSchema(ModelSchema):
    shipment: Optional[ShipmentSchema] = None
    customer: Optional[ContactSchema] = None
    escalation_to: Optional[UserSchema] = None
    created_by: Optional[UserSchema] = None

    class Meta:
        model = ShipmentEscalation
        fields = [
            'id', 'date', 'customer_name', 'escalation_type', 'priority',
            'complaint_summary', 'status', 'internal', 'resolution',
            'resolution_date', 'created_at', 'updated_at'
        ]


class ShipmentEscalationCreateSchema(Schema):
    date: Optional[str] = None
    shipment_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    escalation_type: Optional[str] = 'DELAY'
    priority: Optional[str] = 'MEDIUM'
    complaint_summary: str
    status: Optional[str] = 'OPEN'
    internal: Optional[str] = None
    escalation_to_id: Optional[str] = None
    resolution: Optional[str] = None
    resolution_date: Optional[str] = None


class CSRReportSchema(ModelSchema):
    staff: Optional[UserSchema] = None
    reported_to: Optional[UserSchema] = None

    class Meta:
        model = CSRReport
        fields = [
            'id', 'date', 'report_type',
            'new_enquiries', 'packages_expected', 'quotation_sent', 'shipment_booked',
            'outstanding_follow_up', 'customer_complaint_resolved', 'returning_customers',
            'packages_received', 'customer_converted_paid', 'follow_up_completed',
            'customer_complaint_received', 'customer_escalated_to_manager',
            'shipment_delays_and_reason', 'biggest_challenge_week', 'support_needed',
            'biggest_achievement_week', 'suggestion_for_improvement',
            'social_media_follows_encouraged', 'video_testimonial_received',
            'biggest_challenge_month', 'biggest_achievement_month', 'month_name',
            'created_at', 'updated_at'
        ]


class CSRReportCreateSchema(Schema):
    date: Optional[str] = None
    report_type: Optional[str] = 'DAILY'
    staff_id: Optional[str] = None
    reported_to_id: Optional[str] = None
    month_name: Optional[str] = None

    # Daily Report Metrics
    new_enquiries: Optional[int] = 0
    packages_expected: Optional[int] = 0
    quotation_sent: Optional[int] = 0
    shipment_booked: Optional[int] = 0
    outstanding_follow_up: Optional[int] = 0
    customer_complaint_resolved: Optional[int] = 0
    returning_customers: Optional[int] = 0
    packages_received: Optional[int] = 0
    customer_converted_paid: Optional[int] = 0
    follow_up_completed: Optional[int] = 0
    customer_complaint_received: Optional[int] = 0
    customer_escalated_to_manager: Optional[int] = 0

    # Weekly Report Qualitative Details
    shipment_delays_and_reason: Optional[str] = None
    biggest_challenge_week: Optional[str] = None
    support_needed: Optional[str] = None
    biggest_achievement_week: Optional[str] = None
    suggestion_for_improvement: Optional[str] = None

    # Monthly Report Specific & Qualitative Details
    social_media_follows_encouraged: Optional[int] = 0
    video_testimonial_received: Optional[int] = 0
    biggest_challenge_month: Optional[str] = None
    biggest_achievement_month: Optional[str] = None





