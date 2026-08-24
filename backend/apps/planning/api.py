from typing import List, Optional
from uuid import UUID
from datetime import datetime
from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate, LimitOffsetPagination
from ninja_jwt.authentication import JWTAuth

from apps.accounts.models import User
from apps.crm.models import Deal, Contact, Company
from .models import Activity, Task
from .schemas import (
    ActivitySchema, ActivityCreateSchema,
    TaskSchema, TaskCreateSchema
)

activities_router = Router(auth=JWTAuth())

@activities_router.get("", response=List[ActivitySchema])
@paginate(LimitOffsetPagination)
def list_activities(
    request,
    type: Optional[str] = None,
    deal_id: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    ordering: str = '-activity_date'
):
    qs = Activity.objects.filter(organization=request.user.organization).select_related('performed_by', 'deal', 'contact', 'company')
    
    if type:
        qs = qs.filter(type=type.upper())
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
    if company_id:
        qs = qs.filter(company_id=company_id)
        
    allowed_orderings = ['activity_date', '-activity_date', 'created_at', '-created_at']
    if ordering in allowed_orderings:
        qs = qs.order_by(ordering)
    return qs

@activities_router.get("/{id}", response=ActivitySchema)
def get_activity(request, id: UUID):
    activity = Activity.objects.filter(id=id, organization=request.user.organization).select_related('performed_by', 'deal', 'contact', 'company').first()
    if not activity:
        raise HttpError(404, "Activity not found.")
    return activity

@activities_router.post("", response={201: ActivitySchema})
def create_activity(request, data: ActivityCreateSchema):
    payload = data.dict()
    deal_id = payload.pop('deal_id', None)
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)
    
    deal = None
    if deal_id:
        deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
        if not deal:
            raise HttpError(400, "Invalid Deal ID.")
            
    contact = None
    if contact_id:
        contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
        if not contact:
            raise HttpError(400, "Invalid Contact ID.")
            
    company = None
    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
        if not company:
            raise HttpError(400, "Invalid Company ID.")

    activity_date = payload.pop('activity_date', None) or datetime.utcnow()
    type_upper = payload.pop('type').upper()
    
    allowed_types = ['CALL', 'EMAIL', 'MEETING', 'NOTE']
    if type_upper not in allowed_types:
        raise HttpError(400, f"Invalid activity type. Allowed: {allowed_types}")

    activity = Activity.objects.create(
        organization=request.user.organization,
        performed_by=request.user,
        type=type_upper,
        activity_date=activity_date,
        deal=deal,
        contact=contact,
        company=company,
        **payload
    )
    return 201, activity

@activities_router.delete("/{id}", response={204: None})
def delete_activity(request, id: UUID):
    activity = Activity.objects.filter(id=id, organization=request.user.organization).first()
    if not activity:
        raise HttpError(404, "Activity not found.")
        
    # Only Admin or the User who performed the activity can delete it
    if request.user.role != User.ADMIN and activity.performed_by_id != request.user.id:
        raise HttpError(403, "Permission Denied: You cannot delete activities logged by other users.")
        
    activity.delete()
    return 204, None

# ----------------- TASKS API -----------------

tasks_router = Router(auth=JWTAuth())

@tasks_router.get("", response=List[TaskSchema])
@paginate(LimitOffsetPagination)
def list_tasks(
    request,
    deal_id: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    status: Optional[str] = None
):
    qs = Task.objects.filter(organization=request.user.organization).select_related('assignee', 'deal', 'contact', 'company')
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
    if company_id:
        qs = qs.filter(company_id=company_id)
    if status:
        qs = qs.filter(status=status)
    return qs

@tasks_router.get("/{id}", response=TaskSchema)
def get_task(request, id: UUID):
    task = Task.objects.filter(id=id, organization=request.user.organization).select_related('assignee', 'deal', 'contact', 'company').first()
    if not task:
        raise HttpError(404, "Task not found.")
    return task

@tasks_router.post("", response={201: TaskSchema})
def create_task(request, data: TaskCreateSchema):
    payload = data.dict()
    assignee_id = payload.pop('assignee_id', None)
    deal_id = payload.pop('deal_id', None)
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)

    assignee = None
    if assignee_id:
        assignee = User.objects.filter(id=assignee_id, organization=request.user.organization).first()
        if not assignee:
            raise HttpError(400, "Invalid Assignee ID.")

    deal = None
    if deal_id:
        deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
        if not deal:
            raise HttpError(400, "Invalid Deal ID.")

    contact = None
    if contact_id:
        contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
        if not contact:
            raise HttpError(400, "Invalid Contact ID.")

    company = None
    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
        if not company:
            raise HttpError(400, "Invalid Company ID.")

    task = Task.objects.create(
        organization=request.user.organization,
        assignee=assignee,
        deal=deal,
        contact=contact,
        company=company,
        **payload
    )
    return 201, task

@tasks_router.put("/{id}", response=TaskSchema)
def update_task(request, id: UUID, data: TaskCreateSchema):
    task = Task.objects.filter(id=id, organization=request.user.organization).first()
    if not task:
        raise HttpError(404, "Task not found.")

    payload = data.dict()
    assignee_id = payload.pop('assignee_id', None)
    deal_id = payload.pop('deal_id', None)
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)

    if assignee_id:
        assignee = User.objects.filter(id=assignee_id, organization=request.user.organization).first()
        if not assignee:
            raise HttpError(400, "Invalid Assignee ID.")
        task.assignee = assignee
    else:
        task.assignee = None

    if deal_id:
        deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
        if not deal:
            raise HttpError(400, "Invalid Deal ID.")
        task.deal = deal
    else:
        task.deal = None

    if contact_id:
        contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
        if not contact:
            raise HttpError(400, "Invalid Contact ID.")
        task.contact = contact
    else:
        task.contact = None

    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
        if not company:
            raise HttpError(400, "Invalid Company ID.")
        task.company = company
    else:
        task.company = None

    for attr, val in payload.items():
        setattr(task, attr, val)
    task.save()
    return task

@tasks_router.delete("/{id}", response={204: None})
def delete_task(request, id: UUID):
    task = Task.objects.filter(id=id, organization=request.user.organization).first()
    if not task:
        raise HttpError(404, "Task not found.")
    task.delete()
    return 204, None

