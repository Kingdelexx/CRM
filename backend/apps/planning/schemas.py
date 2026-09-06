from typing import Optional
from uuid import UUID
from datetime import datetime
from ninja import ModelSchema, Schema
from apps.accounts.schemas import UserSchema
from apps.crm.schemas import DealSchema, ContactSchema, CompanySchema
from .models import Activity, Task

class ActivitySchema(ModelSchema):
    performed_by: Optional[UserSchema] = None
    deal: Optional[DealSchema] = None
    contact: Optional[ContactSchema] = None
    company: Optional[CompanySchema] = None
    
    class Meta:
        model = Activity
        fields = ['id', 'type', 'content', 'activity_date', 'created_at', 'updated_at']

class ActivityCreateSchema(Schema):
    type: str  # call/email/meeting/note (will be normalized to uppercase)
    content: str
    activity_date: Optional[datetime] = None  # defaults to now if null
    deal_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None

from apps.accounts.schemas import UserSchema, TeamSchema
from typing import List

class TaskSchema(ModelSchema):
    assignee: Optional[UserSchema] = None
    task_team: Optional[TeamSchema] = None
    deal: Optional[DealSchema] = None
    contact: Optional[ContactSchema] = None
    partner: Optional[ContactSchema] = None
    company: Optional[CompanySchema] = None
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'start_date', 'due_date', 'priority', 'status', 'attachments', 'checklist', 'comments', 'created_at', 'updated_at']

class TaskCreateSchema(Schema):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = 'MEDIUM'
    status: Optional[str] = 'TODO'
    assignee_id: Optional[str] = None
    task_team_id: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    partner_id: Optional[str] = None
    company_id: Optional[str] = None
    attachments: Optional[List[str]] = None
    checklist: Optional[List[dict]] = None
    comments: Optional[List[dict]] = None

