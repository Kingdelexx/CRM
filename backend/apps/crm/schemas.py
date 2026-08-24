from typing import Optional
from uuid import UUID
from datetime import date
from ninja import ModelSchema, Schema
from apps.accounts.schemas import UserSchema
from .models import Company, Stage, Contact, Deal

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
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'job_title', 'status', 'custom_fields', 'created_at', 'updated_at']

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
