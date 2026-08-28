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
    assignee_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,
    status: Optional[str] = None,
    overdue: Optional[bool] = None
):
    from django.utils import timezone
    qs = Task.objects.filter(organization=request.user.organization).select_related('assignee', 'task_team', 'deal', 'contact', 'company')
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
    if company_id:
        qs = qs.filter(company_id=company_id)
    if assignee_id:
        qs = qs.filter(assignee_id=assignee_id)
    if team_id:
        qs = qs.filter(task_team_id=team_id)
    if status:
        qs = qs.filter(status=status)
    if overdue is not None:
        if overdue:
            qs = qs.filter(due_date__lt=timezone.now()).exclude(status='DONE')
        else:
            qs = qs.filter(Q(due_date__gte=timezone.now()) | Q(status='DONE'))
    return qs

@tasks_router.get("/{id}", response=TaskSchema)
def get_task(request, id: UUID):
    task = Task.objects.filter(id=id, organization=request.user.organization).select_related('assignee', 'task_team', 'deal', 'contact', 'company').first()
    if not task:
        raise HttpError(404, "Task not found.")
    return task

@tasks_router.post("", response={201: TaskSchema})
def create_task(request, data: TaskCreateSchema):
    payload = data.dict()
    assignee_id = payload.pop('assignee_id', None)
    task_team_id = payload.pop('task_team_id', None)
    deal_id = payload.pop('deal_id', None)
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)

    assignee = None
    if assignee_id:
        assignee = User.objects.filter(id=assignee_id, organization=request.user.organization).first()
        if not assignee:
            raise HttpError(400, "Invalid Assignee ID.")

    task_team = None
    if task_team_id:
        from apps.accounts.models import Team
        task_team = Team.objects.filter(id=task_team_id, organization=request.user.organization).first()
        if not task_team:
            raise HttpError(400, "Invalid Team ID.")

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

    # Filter out None values for default fields
    for field in ['attachments', 'checklist', 'comments']:
        if field in payload and payload[field] is None:
            payload[field] = []

    task = Task.objects.create(
        organization=request.user.organization,
        assignee=assignee,
        task_team=task_team,
        deal=deal,
        contact=contact,
        company=company,
        **payload
    )

    # Log task creation activity
    Activity.objects.create(
        organization=request.user.organization,
        performed_by=request.user,
        type='NOTE',
        content=f"Created Task '{task.title}'",
        deal=deal,
        contact=contact,
        company=company
    )

    return 201, task

@tasks_router.put("/{id}", response=TaskSchema)
def update_task(request, id: UUID, data: TaskCreateSchema):
    task = Task.objects.filter(id=id, organization=request.user.organization).first()
    if not task:
        raise HttpError(404, "Task not found.")

    payload = data.dict()
    assignee_id = payload.pop('assignee_id', None)
    task_team_id = payload.pop('task_team_id', None)
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

    if task_team_id:
        from apps.accounts.models import Team
        task_team = Team.objects.filter(id=task_team_id, organization=request.user.organization).first()
        if not task_team:
            raise HttpError(400, "Invalid Team ID.")
        task.task_team = task_team
    else:
        task.task_team = None

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

    # Handle status change logging
    old_status = task.status
    new_status = payload.get('status', old_status)

    for field in ['attachments', 'checklist', 'comments']:
        if field in payload and payload[field] is None:
            payload[field] = []

    for attr, val in payload.items():
        setattr(task, attr, val)
    task.save()

    if old_status != new_status:
        Activity.objects.create(
            organization=request.user.organization,
            performed_by=request.user,
            type='NOTE',
            content=f"Updated Task '{task.title}' status from {old_status} to {new_status}",
            deal=task.deal,
            contact=task.contact,
            company=task.company
        )

    return task

@tasks_router.delete("/{id}", response={204: None})
def delete_task(request, id: UUID):
    task = Task.objects.filter(id=id, organization=request.user.organization).first()
    if not task:
        raise HttpError(404, "Task not found.")
    task.delete()
    return 204, None

