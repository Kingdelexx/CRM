from typing import Optional
from uuid import UUID
from datetime import date
from ninja import ModelSchema, Schema
# Import Project model
from .models import Company, Stage, Contact, Deal, Project
from apps.accounts.schemas import UserSchema, OrganizationSchema

class CompanySchema(ModelSchema):
    class Meta:
        model = Company
        fields = ['id', 'name', 'domain', 'industry', 'about', 'annual_revenue', 'phone', 'created_at', 'updated_at']

class CompanyCreateSchema(Schema):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    about: Optional[str] = None
    annual_revenue: Optional[float] = None
    phone: Optional[str] = None

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
            'id', 'first_name', 'last_name', 'email', 'phone', 'job_title', 'status',
            'custom_fields', 'lifecycle_started_at', 'lifecycle_extension_days',
            'lifecycle_status', 'is_active_lead', 'created_at', 'updated_at'
        ]

class ContactCreateSchema(Schema):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = 'LEAD'
    company_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    custom_fields: Optional[dict] = None

class DealSchema(ModelSchema):
    stage: StageSchema
    contact: Optional[ContactSchema] = None
    company: Optional[CompanySchema] = None
    
    class Meta:
        model = Deal
        fields = ['id', 'title', 'value', 'currency', 'expected_close_date', 'probability', 'status', 'created_at', 'updated_at']

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

class ProjectSchema(ModelSchema):
    manager: Optional[UserSchema] = None
    deal: Optional[DealSchema] = None

    class Meta:
        model = Project
        fields = ['id', 'name', 'status', 'start_date', 'end_date', 'created_at', 'updated_at']

class ProjectCreateSchema(Schema):
    name: str
    status: Optional[str] = 'PLANNING'
    manager_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

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
    created_at: date
    updated_at: date

