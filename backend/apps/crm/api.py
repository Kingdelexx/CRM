from typing import List, Optional
from uuid import UUID
import json
from django.utils import timezone
from datetime import date, datetime, timedelta
from django.db import transaction
from django.db.models import Q, Sum
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate, LimitOffsetPagination
from ninja_jwt.authentication import JWTAuth

from apps.accounts.models import User, Organization
from apps.planning.models import Task, Activity
from .models import (
    Company, Stage, Contact, Deal, Project, LeadLifecycleRule, CustomerList, CustomModule, CustomModuleRecord,
    Pipeline, CustomFieldDefinition, Report, EmailAccount, WhatsAppAccount, WhatsAppConversation, WhatsAppMessage,
    AutomationRule, Notification, NotificationPreference, ApprovalWorkflow, ApprovalRequest, Document, Invoice, Receipt, Shipment, ShipmentEscalation,
    CSRReport
)
from .schemas import (
    CompanySchema, CompanyCreateSchema,
    StageSchema, StageCreateSchema,
    ContactSchema, ContactCreateSchema,
    DealSchema, DealCreateSchema,
    ProjectSchema, ProjectCreateSchema,
    OrganizationLifecycleSettingsSchema,
    LeadLifecycleRuleSchema, LeadLifecycleRuleCreateSchema,
    CustomerListSchema, CustomerListCreateSchema,
    CustomModuleSchema, CustomModuleCreateSchema,
    CustomModuleRecordSchema,
    PipelineSchema, PipelineCreateSchema,
    CustomFieldDefinitionSchema, CustomFieldDefinitionCreateSchema,
    ReportSchema, ReportCreateSchema,
    EmailAccountSchema, EmailAccountCreateSchema,
    WhatsAppAccountSchema, WhatsAppAccountCreateSchema,
    WhatsAppConversationSchema, WhatsAppMessageSchema,
    AutomationRuleSchema, AutomationRuleCreateSchema,
    NotificationSchema, NotificationPreferenceSchema,
    ApprovalWorkflowSchema, ApprovalWorkflowCreateSchema,
    ApprovalRequestSchema, ApprovalRequestCreateSchema,
    DocumentSchema, DocumentCreateSchema,
    InvoiceSchema, InvoiceCreateSchema,
    ReceiptSchema, ReceiptCreateSchema,
    ShipmentSchema, ShipmentCreateSchema,
    ShipmentEscalationSchema, ShipmentEscalationCreateSchema,
    CSRReportSchema, CSRReportCreateSchema
)

# Route instances initialized with JWT Auth
companies_router = Router(auth=JWTAuth())
stages_router = Router(auth=JWTAuth())
contacts_router = Router(auth=JWTAuth())
deals_router = Router(auth=JWTAuth())
projects_router = Router(auth=JWTAuth())
settings_router = Router(auth=JWTAuth())
customer_lists_router = Router(auth=JWTAuth())
custom_modules_router = Router(auth=JWTAuth())
pipelines_router = Router(auth=JWTAuth())
reports_router = Router(auth=JWTAuth())
emails_router = Router(auth=JWTAuth())
whatsapp_router = Router(auth=JWTAuth())
automations_router = Router(auth=JWTAuth())
notifications_router = Router(auth=JWTAuth())
approvals_router = Router(auth=JWTAuth())
calendar_router = Router(auth=JWTAuth())
documents_router = Router(auth=JWTAuth())
invoices_router = Router(auth=JWTAuth())
receipts_router = Router(auth=JWTAuth())
shipments_router = Router(auth=JWTAuth())
shipment_escalations_router = Router(auth=JWTAuth())
csr_reports_router = Router(auth=JWTAuth())
search_router = Router(auth=JWTAuth())


# Helper: check user belongs to organization
def check_tenant(request_user, obj):
    if obj.organization_id != request_user.organization_id:
        raise HttpError(403, "Access Denied: Object belongs to a different organization.")

# ----------------- COMPANIES API -----------------

@companies_router.get("", response=List[CompanySchema])
@paginate(LimitOffsetPagination)
def list_companies(request, search: Optional[str] = None, industry: Optional[str] = None, ordering: str = '-created_at'):
    qs = Company.objects.filter(organization=request.user.organization)
    
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(domain__icontains=search))
    if industry:
        qs = qs.filter(industry__iexact=industry)
        
    # Ordering validation
    allowed_orderings = ['name', '-name', 'created_at', '-created_at', 'annual_revenue', '-annual_revenue']
    if ordering in allowed_orderings:
        qs = qs.order_by(ordering)
    return qs

@companies_router.get("/{id}", response=CompanySchema)
def get_company(request, id: UUID):
    company = Company.objects.filter(id=id, organization=request.user.organization).first()
    if not company:
        raise HttpError(404, "Company not found.")
    return company

@companies_router.post("", response={201: CompanySchema})
def create_company(request, data: CompanyCreateSchema):
    company = Company.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, company

@companies_router.put("/{id}", response=CompanySchema)
def update_company(request, id: UUID, data: CompanyCreateSchema):
    company = Company.objects.filter(id=id, organization=request.user.organization).first()
    if not company:
        raise HttpError(404, "Company not found.")
        
    for attr, val in data.dict().items():
        setattr(company, attr, val)
    company.save()
    return company

@companies_router.delete("/{id}", response={204: None})
def delete_company(request, id: UUID):
    company = Company.objects.filter(id=id, organization=request.user.organization).first()
    if not company:
        raise HttpError(404, "Company not found.")
    company.delete()
    return 204, None


# ----------------- STAGES API -----------------

@stages_router.get("", response=List[StageSchema])
def list_stages(request, pipeline_type: Optional[str] = 'SALES'):
    return Stage.objects.filter(organization=request.user.organization, pipeline_type=pipeline_type)

@stages_router.get("/{id}", response=StageSchema)
def get_stage(request, id: UUID):
    stage = Stage.objects.filter(id=id, organization=request.user.organization).first()
    if not stage:
        raise HttpError(404, "Stage not found.")
    return stage

@stages_router.post("", response={201: StageSchema})
def create_stage(request, data: StageCreateSchema):
    # Only Admin can create pipeline stages
    if request.user.role != User.ADMIN:
        raise HttpError(403, "Permission Denied: Only Administrators can create stages.")
        
    stage = Stage.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, stage

@stages_router.put("/{id}", response=StageSchema)
def update_stage(request, id: UUID, data: StageCreateSchema):
    if request.user.role != User.ADMIN:
        raise HttpError(403, "Permission Denied: Only Administrators can edit stages.")
        
    stage = Stage.objects.filter(id=id, organization=request.user.organization).first()
    if not stage:
        raise HttpError(404, "Stage not found.")
        
    for attr, val in data.dict().items():
        setattr(stage, attr, val)
    stage.save()
    return stage

@stages_router.delete("/{id}", response={204: None})
def delete_stage(request, id: UUID):
    if request.user.role != User.ADMIN:
        raise HttpError(403, "Permission Denied: Only Administrators can delete stages.")
        
    stage = Stage.objects.filter(id=id, organization=request.user.organization).first()
    if not stage:
        raise HttpError(404, "Stage not found.")
        
    # Prevent deletion if active deals are in this stage
    if Deal.objects.filter(stage=stage).exists():
        raise HttpError(400, "Cannot delete stage because it contains active deals.")
        
    stage.delete()
    return 204, None


# ----------------- CONTACTS API -----------------

@contacts_router.get("", response=List[ContactSchema])
@paginate(LimitOffsetPagination)
def list_contacts(
    request, 
    search: Optional[str] = None, 
    company_id: Optional[UUID] = None,
    status: Optional[str] = None, 
    assigned_to_id: Optional[UUID] = None,
    ordering: str = '-created_at'
):
    qs = Contact.objects.filter(organization=request.user.organization).select_related('company', 'assigned_to')
    
    if search:
        qs = qs.filter(
            Q(first_name__icontains=search) | 
            Q(last_name__icontains=search) | 
            Q(email__icontains=search) |
            Q(phone__icontains=search) |
            Q(address__icontains=search)
        )
    if company_id:
        qs = qs.filter(company_id=company_id)
    if status:
        qs = qs.filter(status=status)
    if assigned_to_id:
        qs = qs.filter(assigned_to_id=assigned_to_id)
        
    allowed_orderings = ['first_name', '-first_name', 'last_name', '-last_name', 'created_at', '-created_at']
    if ordering in allowed_orderings:
        qs = qs.order_by(ordering)
    return qs

@contacts_router.get("/{id}", response=ContactSchema)
def get_contact(request, id: UUID):
    contact = Contact.objects.filter(id=id, organization=request.user.organization).select_related('company', 'assigned_to').first()
    if not contact:
        raise HttpError(404, "Contact not found.")
    return contact

@contacts_router.post("", response={201: ContactSchema})
def create_contact(request, data: ContactCreateSchema, bypass_duplicate_check: Optional[bool] = False):
    payload = data.dict()
    company_id = payload.pop('company_id', None)
    assigned_to_id = payload.pop('assigned_to_id', None)
    custom_fields = payload.pop('custom_fields', None) or {}

    if not bypass_duplicate_check:
        first_name = payload.get('first_name')
        last_name = payload.get('last_name')
        email = payload.get('email')
        phone = payload.get('phone')
        
        dup_query = Q(first_name__iexact=first_name, last_name__iexact=last_name)
        if email:
            dup_query |= Q(email__iexact=email)
        if phone:
            dup_query |= Q(phone=phone)
            
        candidates = Contact.objects.filter(dup_query, organization=request.user.organization)
        if candidates.exists():
            candidates_list = [
                {
                    "id": str(c.id),
                    "first_name": c.first_name,
                    "last_name": c.last_name,
                    "email": c.email,
                    "phone": c.phone,
                    "status": c.status
                }
                for c in candidates
            ]
            raise HttpError(409, f"DUPLICATE_DETECTED|{json.dumps(candidates_list)}")
    
    # Verify relations belong to same org if provided
    company = None
    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
        if not company:
            raise HttpError(400, "Invalid Company ID.")
            
    assigned_to = None
    if assigned_to_id:
        assigned_to = User.objects.filter(id=assigned_to_id, organization=request.user.organization).first()
        if not assigned_to:
            raise HttpError(400, "Invalid Assigned User ID.")

    contact = Contact.objects.create(
        organization=request.user.organization,
        company=company,
        assigned_to=assigned_to,
        custom_fields=custom_fields,
        **payload
    )
    return 201, contact

@contacts_router.put("/{id}", response=ContactSchema)
def update_contact(request, id: UUID, data: ContactCreateSchema):
    contact = Contact.objects.filter(id=id, organization=request.user.organization).first()
    if not contact:
        raise HttpError(404, "Contact not found.")
        
    # Role checking: Sales Reps can only edit contacts assigned to them (or unassigned contacts)
    if request.user.role == User.SALES_REP:
        if contact.assigned_to and contact.assigned_to_id != request.user.id:
            raise HttpError(403, "Permission Denied: You can only edit contacts assigned to you.")

    payload = data.dict()
    company_id = payload.pop('company_id', None)
    assigned_to_id = payload.pop('assigned_to_id', None)
    custom_fields = payload.pop('custom_fields', None)

    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
        if not company:
            raise HttpError(400, "Invalid Company ID.")
        contact.company = company
    else:
        contact.company = None

    if assigned_to_id:
        assigned_to = User.objects.filter(id=assigned_to_id, organization=request.user.organization).first()
        if not assigned_to:
            raise HttpError(400, "Invalid Assigned User ID.")
        contact.assigned_to = assigned_to
    else:
        contact.assigned_to = None

    if custom_fields is not None:
        contact.custom_fields = custom_fields
    elif contact.custom_fields is None:
        contact.custom_fields = {}

    for attr, val in payload.items():
        setattr(contact, attr, val)
    contact.save()
    return contact

@contacts_router.delete("/{id}", response={204: None})
def delete_contact(request, id: UUID):
    contact = Contact.objects.filter(id=id, organization=request.user.organization).first()
    if not contact:
        raise HttpError(404, "Contact not found.")
        
    if request.user.role == User.SALES_REP:
        if contact.assigned_to and contact.assigned_to_id != request.user.id:
            raise HttpError(403, "Permission Denied: You can only delete contacts assigned to you.")
            
    contact.delete()
    return 204, None

@contacts_router.post("/{id}/merge", response=ContactSchema)
def merge_contact(request, id: UUID, candidate_id: UUID):
    primary = Contact.objects.filter(id=id, organization=request.user.organization).first()
    if not primary:
        raise HttpError(404, "Primary contact not found.")
    duplicate = Contact.objects.filter(id=candidate_id, organization=request.user.organization).first()
    if not duplicate:
        raise HttpError(404, "Duplicate contact not found.")
    if primary.id == duplicate.id:
        raise HttpError(400, "Cannot merge a contact into itself.")

    with transaction.atomic():
        # Merge basic fields if primary's field is empty
        for field in ['phone', 'job_title', 'notes', 'source', 'lifecycle_status']:
            if not getattr(primary, field) and getattr(duplicate, field):
                setattr(primary, field, getattr(duplicate, field))
        
        # Merge custom fields dict
        p_cf = primary.custom_fields or {}
        d_cf = duplicate.custom_fields or {}
        for k, v in d_cf.items():
            if k not in p_cf or not p_cf[k]:
                p_cf[k] = v
        primary.custom_fields = p_cf
        primary.save()

        # Update dependent associations
        Deal.objects.filter(contact=duplicate, organization=request.user.organization).update(contact=primary)
        Activity.objects.filter(contact=duplicate, organization=request.user.organization).update(contact=primary)
        Task.objects.filter(contact=duplicate, organization=request.user.organization).update(contact=primary)

        # Merge CustomerList memberships
        for cust_list in duplicate.customer_lists.all():
            cust_list.contacts.add(primary)
            cust_list.contacts.remove(duplicate)

        # Delete duplicate contact
        duplicate.delete()

    primary = Contact.objects.filter(id=id, organization=request.user.organization).select_related('company', 'assigned_to').first()
    return primary

@contacts_router.post("/{id}/extend", response=ContactSchema)
def extend_lead_lifecycle(request, id: UUID, days: int):
    contact = Contact.objects.filter(id=id, organization=request.user.organization).first()
    if not contact:
        raise HttpError(404, "Contact not found.")
    contact.lifecycle_extension_days += days
    contact.lifecycle_status = 'ACTIVE'
    contact.is_active_lead = True
    contact.save()
    return contact


# ----------------- DEALS API -----------------

@deals_router.get("", response=List[DealSchema])
@paginate(LimitOffsetPagination)
def list_deals(
    request, 
    search: Optional[str] = None, 
    stage_id: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    status: Optional[str] = None,
    ordering: str = '-created_at'
):
    qs = Deal.objects.filter(organization=request.user.organization).select_related('stage', 'contact', 'company')
    
    if search:
        qs = qs.filter(title__icontains=search)
    if stage_id:
        qs = qs.filter(stage_id=stage_id)
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
    if company_id:
        qs = qs.filter(company_id=company_id)
    if status:
        qs = qs.filter(status=status)
        
    allowed_orderings = ['title', '-title', 'value', '-value', 'expected_close_date', '-expected_close_date', 'created_at', '-created_at']
    if ordering in allowed_orderings:
        qs = qs.order_by(ordering)
    return qs

@deals_router.get("/{id}", response=DealSchema)
def get_deal(request, id: UUID):
    deal = Deal.objects.filter(id=id, organization=request.user.organization).select_related('stage', 'contact', 'company').first()
    if not deal:
        raise HttpError(404, "Deal not found.")
    return deal

@deals_router.post("", response={201: DealSchema})
def create_deal(request, data: DealCreateSchema):
    payload = data.dict()
    stage_id = payload.pop('stage_id')
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)
    
    # Verify relations belong to organization
    stage = Stage.objects.filter(id=stage_id, organization=request.user.organization).first()
    if not stage:
        raise HttpError(400, "Invalid Stage ID.")
        
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

    deal = Deal.objects.create(
        organization=request.user.organization,
        stage=stage,
        contact=contact,
        company=company,
        **payload
    )
    return 201, deal

@deals_router.put("/{id}", response=DealSchema)
def update_deal(request, id: UUID, data: DealCreateSchema):
    deal = Deal.objects.filter(id=id, organization=request.user.organization).first()
    if not deal:
        raise HttpError(404, "Deal not found.")
        
    # Role checking: Sales Reps can only edit deals if they are the assignee of the associated contact
    if request.user.role == User.SALES_REP:
        if deal.contact and deal.contact.assigned_to and deal.contact.assigned_to_id != request.user.id:
            raise HttpError(403, "Permission Denied: You can only edit deals associated with contacts assigned to you.")

    payload = data.dict()
    stage_id = payload.pop('stage_id')
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)

    stage = Stage.objects.filter(id=stage_id, organization=request.user.organization).first()
    if not stage:
        raise HttpError(400, "Invalid Stage ID.")
    deal.stage = stage

    if contact_id:
        contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
        if not contact:
            raise HttpError(400, "Invalid Contact ID.")
        deal.contact = contact
    else:
        deal.contact = None

    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
        if not company:
            raise HttpError(400, "Invalid Company ID.")
        deal.company = company
    else:
        deal.company = None

    for attr, val in payload.items():
        setattr(deal, attr, val)
    deal.save()
    return deal

@deals_router.delete("/{id}", response={204: None})
def delete_deal(request, id: UUID):
    deal = Deal.objects.filter(id=id, organization=request.user.organization).first()
    if not deal:
        raise HttpError(404, "Deal not found.")
        
    if request.user.role == User.SALES_REP:
        if deal.contact and deal.contact.assigned_to and deal.contact.assigned_to_id != request.user.id:
            raise HttpError(403, "Permission Denied: You can only delete deals associated with contacts assigned to you.")
            
    deal.delete()
    return 204, None


# Projects API Endpoints
@projects_router.get("", response=List[ProjectSchema])
@paginate(LimitOffsetPagination)
def list_projects(request, search: Optional[str] = None, contact_id: Optional[UUID] = None, deal_id: Optional[UUID] = None):
    qs = Project.objects.filter(organization=request.user.organization).select_related('manager', 'deal').prefetch_related('members')
    if search:
        qs = qs.filter(name__icontains=search)
    if contact_id:
        qs = qs.filter(deal__contact_id=contact_id)
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    return qs

@projects_router.get("/{id}", response=ProjectSchema)
def get_project(request, id: UUID):
    project = Project.objects.filter(id=id, organization=request.user.organization).select_related('manager', 'deal').prefetch_related('members').first()
    if not project:
        raise HttpError(404, "Project not found.")
    return project

@projects_router.post("", response={201: ProjectSchema})
def create_project(request, data: ProjectCreateSchema):
    payload = data.dict()
    manager_id = payload.pop('manager_id', None)
    deal_id = payload.pop('deal_id', None)
    members_ids = payload.pop('members_ids', None) or []
    
    # Ensure attachments list is not Null
    if payload.get('attachments') is None:
        payload['attachments'] = []
        
    manager = None
    if manager_id:
        manager = User.objects.filter(id=manager_id, organization=request.user.organization).first()
        if not manager:
            raise HttpError(400, "Invalid manager ID.")
            
    deal = None
    if deal_id:
        deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
        if not deal:
            raise HttpError(400, "Invalid deal ID.")
            
    project = Project.objects.create(
        organization=request.user.organization,
        manager=manager,
        deal=deal,
        **payload
    )
    if members_ids:
        members = User.objects.filter(id__in=members_ids, organization=request.user.organization)
        project.members.set(members)
    return 201, project

@projects_router.put("/{id}", response=ProjectSchema)
def update_project(request, id: UUID, data: ProjectCreateSchema):
    project = Project.objects.filter(id=id, organization=request.user.organization).first()
    if not project:
        raise HttpError(404, "Project not found.")
        
    # Use exclude_unset=True to avoid overwriting omitted fields like attachments
    payload = data.dict(exclude_unset=True)
    
    if 'manager_id' in payload:
        manager_id = payload.pop('manager_id')
        if manager_id:
            manager = User.objects.filter(id=manager_id, organization=request.user.organization).first()
            project.manager = manager
        else:
            project.manager = None
            
    if 'deal_id' in payload:
        deal_id = payload.pop('deal_id')
        if deal_id:
            deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
            project.deal = deal
        else:
            project.deal = None
            
    if 'members_ids' in payload:
        members_ids = payload.pop('members_ids')
        if members_ids is not None:
            members = User.objects.filter(id__in=members_ids, organization=request.user.organization)
            project.members.set(members)
            
    if 'attachments' in payload and payload['attachments'] is None:
        payload['attachments'] = []
        
    for k, v in payload.items():
        setattr(project, k, v)
    project.save()
    return project

@projects_router.delete("/{id}", response={204: None})
def delete_project(request, id: UUID):
    project = Project.objects.filter(id=id, organization=request.user.organization).first()
    if not project:
        raise HttpError(404, "Project not found.")
    project.delete()
    return 204, None


# ----------------- SETTINGS / LIFECYCLE API -----------------

@settings_router.get("/lifecycle", response=OrganizationLifecycleSettingsSchema)
def get_lifecycle_settings(request):
    org = request.user.organization
    return {
        "lead_lifecycle_timer_enabled": org.lead_lifecycle_timer_enabled,
        "default_lead_lifecycle_days": org.default_lead_lifecycle_days
    }

@settings_router.put("/lifecycle", response=OrganizationLifecycleSettingsSchema)
def update_lifecycle_settings(request, data: OrganizationLifecycleSettingsSchema):
    org = request.user.organization
    org.lead_lifecycle_timer_enabled = data.lead_lifecycle_timer_enabled
    org.default_lead_lifecycle_days = data.default_lead_lifecycle_days
    org.save()
    return {
        "lead_lifecycle_timer_enabled": org.lead_lifecycle_timer_enabled,
        "default_lead_lifecycle_days": org.default_lead_lifecycle_days
    }

@settings_router.get("/lifecycle-rules", response=List[LeadLifecycleRuleSchema])
def list_lifecycle_rules(request):
    return LeadLifecycleRule.objects.filter(organization=request.user.organization)

@settings_router.post("/lifecycle-rules", response={201: LeadLifecycleRuleSchema})
def create_lifecycle_rule(request, data: LeadLifecycleRuleCreateSchema):
    rule = LeadLifecycleRule.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, rule

@settings_router.put("/lifecycle-rules/{id}", response=LeadLifecycleRuleSchema)
def update_lifecycle_rule(request, id: UUID, data: LeadLifecycleRuleCreateSchema):
    rule = LeadLifecycleRule.objects.filter(id=id, organization=request.user.organization).first()
    if not rule:
        raise HttpError(404, "Rule not found.")
    for k, v in data.dict().items():
        setattr(rule, k, v)
    rule.save()
    return rule

@settings_router.delete("/lifecycle-rules/{id}", response={204: None})
def delete_lifecycle_rule(request, id: UUID):
    rule = LeadLifecycleRule.objects.filter(id=id, organization=request.user.organization).first()
    if not rule:
        raise HttpError(404, "Rule not found.")
    rule.delete()
    return 204, None


# ----------------- ADDITIONAL CONTACTS OPERATIONS -----------------

@contacts_router.post("/{id}/extend", response={200: ContactSchema})
def extend_lead_lifecycle(request, id: UUID, days: int):
    contact = Contact.objects.filter(id=id, organization=request.user.organization).first()
    if not contact:
        raise HttpError(404, "Contact not found.")
    contact.lifecycle_extension_days += days
    contact.save()
    return contact

@contacts_router.post("/{id}/merge", response={200: ContactSchema})
def merge_contacts(request, id: UUID, candidate_id: UUID):
    contact = Contact.objects.filter(id=id, organization=request.user.organization).first()
    duplicate = Contact.objects.filter(id=candidate_id, organization=request.user.organization).first()
    if not contact or not duplicate:
        raise HttpError(404, "One or both contacts not found.")
    
    with transaction.atomic():
        # Merge basic fields on contact
        if not contact.phone and duplicate.phone:
            contact.phone = duplicate.phone
        if not contact.job_title and duplicate.job_title:
            contact.job_title = duplicate.job_title
        if not contact.company and duplicate.company:
            contact.company = duplicate.company
        if not contact.assigned_to and duplicate.assigned_to:
            contact.assigned_to = duplicate.assigned_to
            
        # Merge custom fields
        target_fields = contact.custom_fields or {}
        duplicate_fields = duplicate.custom_fields or {}
        for k, v in duplicate_fields.items():
            if k not in target_fields:
                target_fields[k] = v
        contact.custom_fields = target_fields
        contact.save()
        
        # Merge related entities
        # 1. Activities
        from apps.planning.models import Activity as PlanningActivity
        PlanningActivity.objects.filter(contact=duplicate).update(contact=contact)
        
        # 2. Tasks
        from apps.planning.models import Task as PlanningTask
        PlanningTask.objects.filter(contact=duplicate).update(contact=contact)
        
        # 3. Deals
        Deal.objects.filter(contact=duplicate).update(contact=contact)
        
        # Delete duplicate contact
        duplicate.delete()
        
    return contact


# ----------------- CUSTOMER LISTS / SEGMENTS API -----------------

@customer_lists_router.get("", response=List[CustomerListSchema])
def list_customer_lists(request):
    lists = CustomerList.objects.filter(organization=request.user.organization)
    res = []
    for l in lists:
        if l.list_type == CustomerList.STATIC:
            count = l.contacts.count()
        else:
            count = count_smart_list_contacts(request.user.organization, l.rules)
        res.append({
            "id": l.id,
            "name": l.name,
            "list_type": l.list_type,
            "rules": l.rules,
            "contacts_count": count
        })
    return res

@customer_lists_router.post("", response={201: CustomerListSchema})
def create_customer_list(request, data: CustomerListCreateSchema):
    cl = CustomerList.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, {
        "id": cl.id,
        "name": cl.name,
        "list_type": cl.list_type,
        "rules": cl.rules,
        "contacts_count": 0
    }

@customer_lists_router.delete("/{id}", response={204: None})
def delete_customer_list(request, id: UUID):
    cl = CustomerList.objects.filter(id=id, organization=request.user.organization).first()
    if not cl:
        raise HttpError(404, "Customer list not found.")
    cl.delete()
    return 204, None

def evaluate_smart_list_query(organization, rules):
    qs = Contact.objects.filter(organization=organization).select_related('company', 'assigned_to')
    if not rules:
        return qs
    
    # rule: purchased_product
    purchased_product = rules.get('purchased_product')
    if purchased_product:
        qs = qs.filter(deals__title__icontains=purchased_product, deals__status=Deal.WON)
        
    # rule: last_purchase_month
    last_purchase_month = rules.get('last_purchase_month')
    if last_purchase_month is not None:
        try:
            m = int(last_purchase_month)
            qs = qs.filter(deals__expected_close_date__month=m, deals__status=Deal.WON)
        except ValueError:
            pass
            
    # rule: inactive_days
    inactive_days = rules.get('inactive_days')
    if inactive_days is not None:
        try:
            days = int(inactive_days)
            cutoff = timezone.now() - timedelta(days=days)
            active_contacts = Contact.objects.filter(
                organization=organization,
                deals__status=Deal.WON,
                deals__updated_at__gte=cutoff
            ).values_list('id', flat=True)
            qs = qs.exclude(id__in=active_contacts)
        except ValueError:
            pass
            
    return qs.distinct()

def count_smart_list_contacts(organization, rules):
    return evaluate_smart_list_query(organization, rules).count()

@customer_lists_router.get("/{id}/contacts", response=List[ContactSchema])
def get_customer_list_contacts(request, id: UUID):
    cl = CustomerList.objects.filter(id=id, organization=request.user.organization).first()
    if not cl:
        raise HttpError(404, "Customer list not found.")
    if cl.list_type == CustomerList.STATIC:
        return cl.contacts.all()
    else:
        return evaluate_smart_list_query(request.user.organization, cl.rules)

@customer_lists_router.post("/{id}/add-contact", response={200: bool})
def add_contact_to_static_list(request, id: UUID, contact_id: UUID):
    cl = CustomerList.objects.filter(id=id, organization=request.user.organization, list_type=CustomerList.STATIC).first()
    if not cl:
        raise HttpError(404, "Static customer list not found.")
    contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
    if not contact:
        raise HttpError(404, "Contact not found.")
    cl.contacts.add(contact)
    return True

@customer_lists_router.post("/{id}/remove-contact", response={200: bool})
def remove_contact_from_static_list(request, id: UUID, contact_id: UUID):
    cl = CustomerList.objects.filter(id=id, organization=request.user.organization, list_type=CustomerList.STATIC).first()
    if not cl:
        raise HttpError(404, "Static customer list not found.")
    contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
    if not contact:
        raise HttpError(404, "Contact not found.")
    cl.contacts.remove(contact)
    return True


# ----------------- CUSTOM MODULES API -----------------

@custom_modules_router.get("", response=List[CustomModuleSchema])
def list_custom_modules(request):
    return CustomModule.objects.filter(organization=request.user.organization)

@custom_modules_router.post("", response={201: CustomModuleSchema})
def create_custom_module(request, data: CustomModuleCreateSchema):
    try:
        cm = CustomModule.objects.create(
            organization=request.user.organization,
            **data.dict()
        )
        return 201, cm
    except Exception as e:
        raise HttpError(400, f"Error creating custom module: {str(e)}")

@custom_modules_router.get("/{id}", response=CustomModuleSchema)
def get_custom_module(request, id: UUID):
    cm = CustomModule.objects.filter(id=id, organization=request.user.organization).first()
    if not cm:
        raise HttpError(404, "Custom module not found.")
    return cm

@custom_modules_router.delete("/{id}", response={204: None})
def delete_custom_module(request, id: UUID):
    cm = CustomModule.objects.filter(id=id, organization=request.user.organization).first()
    if not cm:
        raise HttpError(404, "Custom module not found.")
    cm.delete()
    return 204, None

@custom_modules_router.get("/{id}/records", response=List[CustomModuleRecordSchema])
def list_custom_records(request, id: UUID):
    cm = CustomModule.objects.filter(id=id, organization=request.user.organization).first()
    if not cm:
        raise HttpError(404, "Custom module not found.")
    return CustomModuleRecord.objects.filter(custom_module=cm, organization=request.user.organization).order_by('-created_at')

@custom_modules_router.post("/{id}/records", response={201: CustomModuleRecordSchema})
def create_custom_record(request, id: UUID, data: dict):
    cm = CustomModule.objects.filter(id=id, organization=request.user.organization).first()
    if not cm:
        raise HttpError(404, "Custom module not found.")
    
    # Optional field validation
    for field in cm.fields:
        fname = field.get('name')
        freq = field.get('required')
        if fname and freq and fname not in data:
            raise HttpError(400, f"Field '{fname}' is required.")
            
    rec = CustomModuleRecord.objects.create(
        custom_module=cm,
        organization=request.user.organization,
        data=data
    )
    return 201, rec

@custom_modules_router.put("/{id}/records/{record_id}", response=CustomModuleRecordSchema)
def update_custom_record(request, id: UUID, record_id: UUID, data: dict):
    cm = CustomModule.objects.filter(id=id, organization=request.user.organization).first()
    if not cm:
        raise HttpError(404, "Custom module not found.")
    rec = CustomModuleRecord.objects.filter(id=record_id, custom_module=cm, organization=request.user.organization).first()
    if not rec:
        raise HttpError(404, "Record not found.")
        
    for field in cm.fields:
        fname = field.get('name')
        freq = field.get('required')
        if fname and freq and fname not in data:
            raise HttpError(400, f"Field '{fname}' is required.")
            
    rec.data = data
    rec.save()
    return rec

@custom_modules_router.delete("/{id}/records/{record_id}", response={204: None})
def delete_custom_record(request, id: UUID, record_id: UUID):
    cm = CustomModule.objects.filter(id=id, organization=request.user.organization).first()
    if not cm:
        raise HttpError(404, "Custom module not found.")
    rec = CustomModuleRecord.objects.filter(id=record_id, custom_module=cm, organization=request.user.organization).first()
    if not rec:
        raise HttpError(404, "Record not found.")
    rec.delete()
    return 204, None


# ----------------- PIPELINES API -----------------
@pipelines_router.get("", response=List[PipelineSchema])
def list_pipelines(request):
    return Pipeline.objects.filter(organization=request.user.organization)

@pipelines_router.get("/{id}", response=PipelineSchema)
def get_pipeline(request, id: UUID):
    p = Pipeline.objects.filter(id=id, organization=request.user.organization).first()
    if not p:
        raise HttpError(404, "Pipeline not found.")
    return p

@pipelines_router.post("", response={201: PipelineSchema})
def create_pipeline(request, data: PipelineCreateSchema):
    p = Pipeline.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, p

@pipelines_router.put("/{id}", response=PipelineSchema)
def update_pipeline(request, id: UUID, data: PipelineCreateSchema):
    p = Pipeline.objects.filter(id=id, organization=request.user.organization).first()
    if not p:
        raise HttpError(404, "Pipeline not found.")
    for k, v in data.dict().items():
        setattr(p, k, v)
    p.save()
    return p

@pipelines_router.delete("/{id}", response={204: None})
def delete_pipeline(request, id: UUID):
    p = Pipeline.objects.filter(id=id, organization=request.user.organization).first()
    if not p:
        raise HttpError(404, "Pipeline not found.")
    p.delete()
    return 204, None


# ----------------- CUSTOM FIELD DEFINITIONS API -----------------
@settings_router.get("/custom-fields", response=List[CustomFieldDefinitionSchema])
def list_custom_fields(request, model_name: Optional[str] = None):
    qs = CustomFieldDefinition.objects.filter(organization=request.user.organization)
    if model_name:
        qs = qs.filter(model_name=model_name.upper())
    return qs

@settings_router.post("/custom-fields", response={201: CustomFieldDefinitionSchema})
def create_custom_field(request, data: CustomFieldDefinitionCreateSchema):
    payload = data.dict()
    payload['model_name'] = payload['model_name'].upper()
    cf = CustomFieldDefinition.objects.create(
        organization=request.user.organization,
        **payload
    )
    return 201, cf

@settings_router.delete("/custom-fields/{id}", response={204: None})
def delete_custom_field(request, id: UUID):
    cf = CustomFieldDefinition.objects.filter(id=id, organization=request.user.organization).first()
    if not cf:
        raise HttpError(404, "Custom field definition not found.")
    cf.delete()
    return 204, None


# ----------------- REPORTS API -----------------
@reports_router.get("", response=List[ReportSchema])
def list_reports(request):
    return Report.objects.filter(organization=request.user.organization)

@reports_router.post("", response={201: ReportSchema})
def create_report(request, data: ReportCreateSchema):
    r = Report.objects.create(
        organization=request.user.organization,
        created_by=request.user,
        **data.dict()
    )
    return 201, r

@reports_router.delete("/{id}", response={204: None})
def delete_report(request, id: UUID):
    r = Report.objects.filter(id=id, organization=request.user.organization).first()
    if not r:
        raise HttpError(404, "Report not found.")
    r.delete()
    return 204, None

@reports_router.get("/{id}/data")
def evaluate_report_data(request, id: UUID):
    r = Report.objects.filter(id=id, organization=request.user.organization).first()
    if not r:
        raise HttpError(404, "Report not found.")
        
    org = request.user.organization
    module = r.base_module.upper()
    filters = r.filters or {}
    
    rows = []
    summary = {}
    
    if module == 'EMPLOYEES':
        qs = User.objects.filter(organization=org)
        for u in qs:
            rows.append({
                "id": str(u.id),
                "name": f"{u.first_name} {u.last_name}",
                "email": u.email,
                "role": u.role,
                "created_at": u.date_joined.isoformat() if u.date_joined else ""
            })
        summary = {"total_employees": qs.count()}
    elif module == 'TASKS':
        qs = Task.objects.filter(organization=org)
        if filters.get('status'):
            qs = qs.filter(status=filters['status'])
        for t in qs:
            rows.append({
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else ""
            })
        summary = {
            "total_tasks": qs.count(),
            "todo": qs.filter(status='TODO').count(),
            "in_progress": qs.filter(status='IN_PROGRESS').count(),
            "done": qs.filter(status='DONE').count(),
        }
    elif module in ['LEADS', 'CUSTOMERS']:
        qs = Contact.objects.filter(organization=org)
        if module == 'LEADS':
            qs = qs.filter(status='LEAD')
        else:
            qs = qs.filter(status='CUSTOMER')
        for c in qs:
            rows.append({
                "id": str(c.id),
                "name": f"{c.first_name} {c.last_name}",
                "email": c.email,
                "phone": c.phone,
                "created_at": c.created_at.isoformat()
            })
        summary = {"total_count": qs.count()}
    elif module == 'DEALS':
        qs = Deal.objects.filter(organization=org)
        if filters.get('status'):
            qs = qs.filter(status=filters['status'])
        total_value = 0
        for d in qs:
            total_value += float(d.value)
            rows.append({
                "id": str(d.id),
                "title": d.title,
                "value": float(d.value),
                "status": d.status,
                "probability": d.probability
            })
        summary = {
            "total_deals": qs.count(),
            "total_value": total_value,
            "won": qs.filter(status='WON').count(),
            "open": qs.filter(status='OPEN').count(),
            "lost": qs.filter(status='LOST').count(),
        }
    elif module == 'PROJECTS':
        qs = Project.objects.filter(organization=org)
        if filters.get('status'):
            qs = qs.filter(status=filters['status'])
        for p in qs:
            rows.append({
                "id": str(p.id),
                "name": p.name,
                "status": p.status,
                "progress": p.progress
            })
        summary = {
            "total_projects": qs.count(),
            "planning": qs.filter(status='PLANNING').count(),
            "in_progress": qs.filter(status='IN_PROGRESS').count(),
            "ready": qs.filter(status='READY').count(),
            "delivered": qs.filter(status='DELIVERED').count(),
        }
    elif module == 'ACTIVITIES':
        qs = Activity.objects.filter(organization=org)
        for act in qs:
            rows.append({
                "id": str(act.id),
                "type": act.type,
                "content": act.content,
                "date": act.activity_date.isoformat()
            })
        summary = {"total_activities": qs.count()}
    else:
        summary = {"status": "Empty or unrecognized module"}
        
    return {"rows": rows, "summary": summary, "display_type": r.display_type}


# ----------------- EMAILS INTEGRATION API -----------------
@emails_router.get("/accounts", response=List[EmailAccountSchema])
def list_email_accounts(request):
    return EmailAccount.objects.filter(organization=request.user.organization, user=request.user)

@emails_router.post("/accounts", response={201: EmailAccountSchema})
def connect_email_account(request, data: EmailAccountCreateSchema):
    acc, created = EmailAccount.objects.update_or_create(
        organization=request.user.organization,
        user=request.user,
        email_address=data.email_address,
        defaults={"provider": data.provider, "is_connected": True}
    )
    return 201, acc

@emails_router.delete("/accounts/{id}", response={204: None})
def disconnect_email_account(request, id: UUID):
    acc = EmailAccount.objects.filter(id=id, organization=request.user.organization, user=request.user).first()
    if not acc:
        raise HttpError(404, "Email account not found.")
    acc.delete()
    return 204, None

@emails_router.post("/simulate-receive")
def simulate_receive_email(request, sender: str, recipient: str, subject: str, body: str):
    org = request.user.organization
    contact = Contact.objects.filter(organization=org, email=sender).first()
    if contact:
        Activity.objects.create(
            organization=org,
            performed_by=request.user,
            type=Activity.EMAIL,
            content=f"Received Email\nSubject: {subject}\n\n{body}",
            activity_date=timezone.now(),
            contact=contact,
            company=contact.company
        )
        return {"status": "success", "linked_contact": f"{contact.first_name} {contact.last_name}"}
    return {"status": "success", "linked_contact": None, "message": "Logged, but no contact found with email"}


# ----------------- WHATSAPP API -----------------
@whatsapp_router.get("/accounts", response=List[WhatsAppAccountSchema])
def list_whatsapp_accounts(request):
    return WhatsAppAccount.objects.filter(organization=request.user.organization)

@whatsapp_router.post("/accounts", response={201: WhatsAppAccountSchema})
def connect_whatsapp_account(request, data: WhatsAppAccountCreateSchema):
    acc = WhatsAppAccount.objects.create(
        organization=request.user.organization,
        phone_number=data.phone_number,
        display_name=data.display_name,
        is_connected=True
    )
    return 201, acc

@whatsapp_router.get("/conversations", response=List[WhatsAppConversationSchema])
def list_whatsapp_conversations(request):
    return WhatsAppConversation.objects.filter(whatsapp_account__organization=request.user.organization).select_related('contact', 'assigned_to', 'whatsapp_account')

@whatsapp_router.get("/conversations/{id}/messages", response=List[WhatsAppMessageSchema])
def get_whatsapp_messages(request, id: UUID):
    conv = WhatsAppConversation.objects.filter(id=id, whatsapp_account__organization=request.user.organization).first()
    if not conv:
        raise HttpError(404, "Conversation not found.")
    return WhatsAppMessage.objects.filter(conversation=conv).order_by('created_at')

@whatsapp_router.post("/conversations/{id}/messages", response={201: WhatsAppMessageSchema})
def send_whatsapp_message(request, id: UUID, text: str):
    conv = WhatsAppConversation.objects.filter(id=id, whatsapp_account__organization=request.user.organization).first()
    if not conv:
        raise HttpError(404, "Conversation not found.")
        
    msg = WhatsAppMessage.objects.create(
        conversation=conv,
        sender_type='AGENT',
        sender_name=f"{request.user.first_name} {request.user.last_name}",
        text=text
    )
    return 201, msg

@whatsapp_router.put("/conversations/{id}/assign")
def assign_whatsapp_conversation(request, id: UUID, user_id: Optional[UUID] = None):
    conv = WhatsAppConversation.objects.filter(id=id, whatsapp_account__organization=request.user.organization).first()
    if not conv:
        raise HttpError(404, "Conversation not found.")
        
    if user_id:
        u = User.objects.filter(id=user_id, organization=request.user.organization).first()
        conv.assigned_to = u
    else:
        conv.assigned_to = None
    conv.save()
    return {"status": "assigned"}

@whatsapp_router.post("/conversations/{id}/create-task")
def create_task_from_whatsapp(request, id: UUID, title: str, description: Optional[str] = None):
    conv = WhatsAppConversation.objects.filter(id=id, whatsapp_account__organization=request.user.organization).first()
    if not conv:
        raise HttpError(404, "Conversation not found.")
        
    t = Task.objects.create(
        organization=request.user.organization,
        assignee=request.user,
        title=title,
        description=description or f"WhatsApp follow up chat id: {conv.id}",
        contact=conv.contact,
        company=conv.contact.company if conv.contact else None,
        due_date=timezone.now() + timedelta(days=2)
    )
    return {"status": "success", "task_id": str(t.id)}

@whatsapp_router.post("/simulate-incoming-whatsapps")
def simulate_whatsapp(request, account_id: UUID, sender_phone: str, sender_name: str, message_text: str):
    account = WhatsAppAccount.objects.filter(id=account_id, organization=request.user.organization).first()
    if not account:
        raise HttpError(404, "WhatsApp account not found.")
        
    contact = Contact.objects.filter(organization=request.user.organization, phone=sender_phone).first()
    if not contact:
        contact = Contact.objects.create(
            organization=request.user.organization,
            first_name=sender_name,
            last_name="WhatsApp User",
            phone=sender_phone,
            email=f"{sender_phone}@whatsapp.simulated"
        )
        
    conv, _ = WhatsAppConversation.objects.get_or_create(
        whatsapp_account=account,
        contact=contact,
        defaults={"assigned_to": request.user}
    )
    
    msg = WhatsAppMessage.objects.create(
        conversation=conv,
        sender_type='CUSTOMER',
        sender_name=sender_name,
        text=message_text
    )
    
    return {"status": "success", "conversation_id": str(conv.id), "message_id": str(msg.id)}


# ----------------- AUTOMATIONS API -----------------
@automations_router.get("", response=List[AutomationRuleSchema])
def list_automations(request):
    return AutomationRule.objects.filter(organization=request.user.organization)

@automations_router.post("", response={201: AutomationRuleSchema})
def create_automation(request, data: AutomationRuleCreateSchema):
    rule = AutomationRule.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, rule

@automations_router.put("/{id}", response=AutomationRuleSchema)
def update_automation(request, id: UUID, data: AutomationRuleCreateSchema):
    rule = AutomationRule.objects.filter(id=id, organization=request.user.organization).first()
    if not rule:
        raise HttpError(404, "Rule not found.")
    for k, v in data.dict().items():
        setattr(rule, k, v)
    rule.save()
    return rule

@automations_router.delete("/{id}", response={204: None})
def delete_automation(request, id: UUID):
    rule = AutomationRule.objects.filter(id=id, organization=request.user.organization).first()
    if not rule:
        raise HttpError(404, "Rule not found.")
    rule.delete()
    return 204, None


# ----------------- NOTIFICATIONS API -----------------
@notifications_router.get("", response=List[NotificationSchema])
def list_notifications(request):
    return Notification.objects.filter(organization=request.user.organization, user=request.user).order_by('-created_at')

@notifications_router.post("/{id}/read")
def mark_notification_read(request, id: UUID):
    n = Notification.objects.filter(id=id, organization=request.user.organization, user=request.user).first()
    if not n:
        raise HttpError(404, "Notification not found.")
    n.is_read = True
    n.save()
    return {"status": "success"}

@notifications_router.post("/read-all")
def mark_all_notifications_read(request):
    Notification.objects.filter(organization=request.user.organization, user=request.user, is_read=False).update(is_read=True)
    return {"status": "success"}

@settings_router.get("/notifications-preference", response=NotificationPreferenceSchema)
def get_notification_preference(request):
    pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
    return pref

@settings_router.put("/notifications-preference", response=NotificationPreferenceSchema)
def update_notification_preference(request, data: NotificationPreferenceSchema):
    pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
    for k, v in data.dict().items():
        setattr(pref, k, v)
    pref.save()
    return pref


# ----------------- APPROVALS API -----------------
@approvals_router.get("/workflows", response=List[ApprovalWorkflowSchema])
def list_approval_workflows(request):
    return ApprovalWorkflow.objects.filter(organization=request.user.organization)

@approvals_router.post("/workflows", response={201: ApprovalWorkflowSchema})
def create_approval_workflow(request, data: ApprovalWorkflowCreateSchema):
    wf = ApprovalWorkflow.objects.create(
        organization=request.user.organization,
        **data.dict()
    )
    return 201, wf

@approvals_router.delete("/workflows/{id}", response={204: None})
def delete_approval_workflow(request, id: UUID):
    wf = ApprovalWorkflow.objects.filter(id=id, organization=request.user.organization).first()
    if not wf:
        raise HttpError(404, "Workflow not found.")
    wf.delete()
    return 204, None

@approvals_router.get("/requests", response=List[ApprovalRequestSchema])
def list_approval_requests(request):
    return ApprovalRequest.objects.filter(organization=request.user.organization)

@approvals_router.post("/requests", response={201: ApprovalRequestSchema})
def create_approval_request(request, data: ApprovalRequestCreateSchema):
    wf = ApprovalWorkflow.objects.filter(id=data.workflow_id, organization=request.user.organization).first()
    if not wf:
        raise HttpError(400, "Invalid approval workflow.")
        
    req = ApprovalRequest.objects.create(
        organization=request.user.organization,
        workflow=wf,
        title=data.title,
        description=data.description,
        requested_by=request.user,
        status='PENDING',
        current_step_index=0,
        history=[]
    )
    return 201, req

@approvals_router.post("/requests/{id}/action")
def update_approval_status(request, id: UUID, decision: str, comments: Optional[str] = None):
    req = ApprovalRequest.objects.filter(id=id, organization=request.user.organization).first()
    if not req:
        raise HttpError(404, "Approval request not found.")
        
    if decision not in ['APPROVED', 'REJECTED']:
        raise HttpError(400, "Invalid decision type.")
        
    steps = req.workflow.steps
    total_steps = len(steps)
    
    current_history = req.history or []
    current_history.append({
        "step": req.current_step_index,
        "user_id": str(request.user.id),
        "user_name": f"{request.user.first_name} {request.user.last_name}",
        "decision": decision,
        "comments": comments,
        "timestamp": timezone.now().isoformat()
    })
    req.history = current_history
    
    if decision == 'REJECTED':
        req.status = 'REJECTED'
    else: # APPROVED
        if req.current_step_index + 1 >= total_steps:
            req.status = 'APPROVED'
        else:
            req.current_step_index += 1
            
    req.save()
    return {"status": req.status, "current_step_index": req.current_step_index}


# ----------------- CALENDAR API -----------------
@calendar_router.get("/events")
def list_calendar_events(request, start_date: str, end_date: str, scope: str = 'COMPANY'):
    try:
        sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except Exception:
        sd = timezone.now() - timedelta(days=30)
        ed = timezone.now() + timedelta(days=30)
        
    events = []
    org = request.user.organization
    user = request.user

    # Enforce scope permissions
    if scope in ['COMPANY', 'TEAM'] and user.role not in [User.ADMIN, User.MANAGER]:
        raise HttpError(403, f"Access denied: role {user.role} does not have permissions for {scope} calendar view.")

    # Initialize querysets
    deals = Deal.objects.filter(organization=org, expected_close_date__range=[sd.date(), ed.date()])
    projects = Project.objects.filter(organization=org).filter(
        Q(start_date__isnull=False) & (
            Q(start_date__range=[sd.date(), ed.date()]) | Q(end_date__range=[sd.date(), ed.date()])
        )
    )
    tasks = Task.objects.filter(organization=org, due_date__range=[sd, ed])
    activities = Activity.objects.filter(organization=org, activity_date__range=[sd, ed])

    # Filter querysets based on scope
    if scope == 'PERSONAL':
        deals = deals.filter(contact__assigned_to=user)
        projects = projects.filter(Q(manager=user) | Q(members=user)).distinct()
        tasks = tasks.filter(assignee=user)
        activities = activities.filter(performed_by=user)
    elif scope == 'TEAM':
        if user.team:
            deals = deals.filter(Q(contact__assigned_to__team=user.team) | Q(contact__assigned_team=user.team)).distinct()
            projects = projects.filter(Q(manager__team=user.team) | Q(members__team=user.team)).distinct()
            tasks = tasks.filter(assignee__team=user.team)
            activities = activities.filter(performed_by__team=user.team)
        else:
            deals = deals.filter(contact__assigned_to=user)
            projects = projects.filter(Q(manager=user) | Q(members=user)).distinct()
            tasks = tasks.filter(assignee=user)
            activities = activities.filter(performed_by=user)

    # 1. Deals: expected_close_date
    for d in deals:
        events.append({
            "id": f"deal-{d.id}",
            "type": "DEAL",
            "title": f"Deal: {d.title} (Est. Close)",
            "start": d.expected_close_date.isoformat(),
            "end": d.expected_close_date.isoformat(),
            "color": "#6366f1",
            "details": f"Value: {d.value} {d.currency}"
        })
        
    # 2. Projects: start_date, end_date
    for p in projects:
        if p.start_date and sd.date() <= p.start_date <= ed.date():
            events.append({
                "id": f"project-start-{p.id}",
                "type": "PROJECT_START",
                "title": f"Project: {p.name} (Start)",
                "start": p.start_date.isoformat(),
                "end": p.start_date.isoformat(),
                "color": "#10b981",
                "details": f"Status: {p.status}"
            })
        if p.end_date and sd.date() <= p.end_date <= ed.date():
            events.append({
                "id": f"project-end-{p.id}",
                "type": "PROJECT_END",
                "title": f"Project: {p.name} (End)",
                "start": p.end_date.isoformat(),
                "end": p.end_date.isoformat(),
                "color": "#ef4444",
                "details": f"Progress: {p.progress}%"
            })
            
    # 3. Tasks: due_date
    for t in tasks:
        events.append({
            "id": f"task-{t.id}",
            "type": "TASK",
            "title": f"Task: {t.title}",
            "start": t.due_date.isoformat(),
            "end": t.due_date.isoformat(),
            "color": "#f59e0b",
            "details": f"Priority: {t.priority} | Status: {t.status}"
        })
        
    # 4. Activities: activity_date
    for act in activities:
        events.append({
            "id": f"activity-{act.id}",
            "type": "ACTIVITY",
            "title": f"Activity: {act.type}",
            "start": act.activity_date.isoformat(),
            "end": act.activity_date.isoformat(),
            "color": "#a855f7",
            "details": act.content[:100]
        })
        
    return events



# ----------------- DOCUMENTS API -----------------
@documents_router.get("", response=List[DocumentSchema])
def list_documents(
    request,
    contact_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    task_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    deal_id: Optional[UUID] = None,
    custom_record_id: Optional[UUID] = None
):
    qs = Document.objects.filter(organization=request.user.organization)
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
    if company_id:
        qs = qs.filter(company_id=company_id)
    if task_id:
        qs = qs.filter(task_id=task_id)
    if project_id:
        qs = qs.filter(project_id=project_id)
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    if custom_record_id:
        qs = qs.filter(custom_record_id=custom_record_id)
    return qs


@documents_router.post("", response={201: DocumentSchema})
def create_document(request, data: DocumentCreateSchema):
    doc = Document.objects.create(
        organization=request.user.organization,
        uploaded_by=request.user,
        name=data.name,
        file_url=data.file_url,
        file_type=data.file_type,
        file_size=data.file_size,
        contact_id=data.contact_id,
        company_id=data.company_id,
        task_id=data.task_id,
        project_id=data.project_id,
        deal_id=data.deal_id,
        custom_record_id=data.custom_record_id
    )
    return 201, doc


@documents_router.delete("/{id}", response={204: None})
def delete_document(request, id: UUID):
    doc = Document.objects.filter(id=id, organization=request.user.organization).first()
    if not doc:
        raise HttpError(404, "Document not found")
    doc.delete()
    return 204, None


# ----------------- GLOBAL SEARCH API -----------------
@search_router.get("", response=dict)
def global_search(request, q: str):
    org = request.user.organization
    if not q or len(q.strip()) < 1:
        return {
            "contacts": [], "tasks": [], "projects": [], "deals": [],
            "emails": [], "whatsapp": [], "documents": [], "activities": []
        }
    
    q_str = q.strip()
    
    # 1. Contacts
    contacts = Contact.objects.filter(
        organization=org
    ).filter(
        Q(first_name__icontains=q_str) |
        Q(last_name__icontains=q_str) |
        Q(email__icontains=q_str) |
        Q(phone__icontains=q_str)
    )[:10]
    
    # 2. Tasks
    tasks = Task.objects.filter(
        organization=org
    ).filter(
        Q(title__icontains=q_str) |
        Q(description__icontains=q_str)
    )[:10]

    # 3. Projects
    projects = Project.objects.filter(
        organization=org
    ).filter(
        Q(name__icontains=q_str) |
        Q(description__icontains=q_str)
    )[:10]

    # 4. Deals
    deals = Deal.objects.filter(
        organization=org
    ).filter(
        Q(title__icontains=q_str)
    )[:10]

    # 5. Emails (Activities of type EMAIL containing q)
    emails = Activity.objects.filter(
        organization=org,
        type=Activity.EMAIL
    ).filter(
        Q(content__icontains=q_str)
    )[:10]

    # 6. WhatsApp Messages
    whatsapp = WhatsAppMessage.objects.filter(
        conversation__whatsapp_account__organization=org
    ).filter(
        Q(text__icontains=q_str) |
        Q(sender_name__icontains=q_str)
    ).select_related('conversation')[:10]

    # 7. Documents
    documents = Document.objects.filter(
        organization=org
    ).filter(
        Q(name__icontains=q_str) |
        Q(file_url__icontains=q_str)
    )[:10]

    # 8. Activities (all other types)
    activities = Activity.objects.filter(
        organization=org
    ).exclude(
        type=Activity.EMAIL
    ).filter(
        Q(content__icontains=q_str)
    )[:10]

    return {
        "contacts": [
            {"id": str(c.id), "title": f"{c.first_name} {c.last_name}", "subtitle": f"{c.email} | {c.job_title or 'No Title'}"}
            for c in contacts
        ],
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "subtitle": f"Status: {t.status} | Priority: {t.priority}",
                "contact_id": str(t.contact_id) if t.contact_id else None,
                "deal_id": str(t.deal_id) if t.deal_id else None
            }
            for t in tasks
        ],
        "projects": [
            {"id": str(p.id), "title": p.name, "subtitle": f"Status: {p.status} | Progress: {p.progress}%"}
            for p in projects
        ],
        "deals": [
            {"id": str(d.id), "title": d.title, "subtitle": f"Value: {d.value} {d.currency} | Status: {d.status}"}
            for d in deals
        ],
        "emails": [
            {"id": str(e.id), "title": "Email Message", "subtitle": e.content[:100]}
            for e in emails
        ],
        "whatsapp": [
            {"id": str(w.id), "title": f"WhatsApp Msg from {w.sender_name}", "subtitle": w.text[:100]}
            for w in whatsapp
        ],
        "documents": [
            {"id": str(d.id), "title": d.name, "subtitle": d.file_url, "file_url": d.file_url}
            for d in documents
        ],
        "activities": [
            {"id": str(a.id), "title": f"{a.type} Activity", "subtitle": a.content[:100]}
            for a in activities
        ]
    }


# ----------------- INVOICES API -----------------

@invoices_router.get("", response=List[InvoiceSchema])
@paginate(LimitOffsetPagination)
def list_invoices(request, search: Optional[str] = None, status: Optional[str] = None, contact_id: Optional[UUID] = None):
    qs = Invoice.objects.filter(organization=request.user.organization).select_related('contact', 'company', 'deal')
    if search:
        qs = qs.filter(
            Q(invoice_number__icontains=search) |
            Q(receiver_name__icontains=search) |
            Q(receiver_email__icontains=search) |
            Q(expected_parcel_no__icontains=search)
        )
    if status:
        qs = qs.filter(status=status)
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
    return qs.order_by('-created_at')

@invoices_router.get("/{id}", response=InvoiceSchema)
def get_invoice(request, id: UUID):
    inv = Invoice.objects.filter(id=id, organization=request.user.organization).select_related('contact', 'company', 'deal').first()
    if not inv:
        raise HttpError(404, "Invoice not found.")
    return inv

@invoices_router.post("", response={201: InvoiceSchema})
def create_invoice(request, data: InvoiceCreateSchema):
    payload = data.dict()
    contact_id = payload.pop('contact_id', None)
    company_id = payload.pop('company_id', None)
    deal_id = payload.pop('deal_id', None)
    
    if not payload.get('invoice_number'):
        count = Invoice.objects.filter(organization=request.user.organization).count() + 1
        payload['invoice_number'] = f"{count:08d}"

    # Recalculate total_ngn and total_gbp from items and services if present
    items = payload.get('items', []) or []
    services = payload.get('services', []) or []
    
    items_ngn = sum(float(i.get('total_ngn') or i.get('price_ngn') or 0) for i in items if isinstance(i, dict))
    items_gbp = sum(float(i.get('total_gbp') or i.get('price_gbp') or 0) for i in items if isinstance(i, dict))
    services_ngn = sum(float(s.get('price_ngn') or 0) for s in services if isinstance(s, dict))
    services_gbp = sum(float(s.get('price_gbp') or 0) for s in services if isinstance(s, dict))
    
    calc_ngn = items_ngn + services_ngn
    calc_gbp = items_gbp + services_gbp
    if calc_ngn > 0:
        payload['total_ngn'] = calc_ngn
    if calc_gbp > 0:
        payload['total_gbp'] = calc_gbp
        
    contact = None
    if contact_id:
        contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first()
    company = None
    if company_id:
        company = Company.objects.filter(id=company_id, organization=request.user.organization).first()
    deal = None
    if deal_id:
        deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
        
    inv = Invoice.objects.create(
        organization=request.user.organization,
        contact=contact,
        company=company,
        deal=deal,
        **payload
    )
    return 201, inv

@invoices_router.put("/{id}", response=InvoiceSchema)
def update_invoice(request, id: UUID, data: InvoiceCreateSchema):
    inv = Invoice.objects.filter(id=id, organization=request.user.organization).first()
    if not inv:
        raise HttpError(404, "Invoice not found.")
    payload = data.dict(exclude_unset=True)
    if 'contact_id' in payload:
        cid = payload.pop('contact_id')
        inv.contact = Contact.objects.filter(id=cid, organization=request.user.organization).first() if cid else None
    if 'company_id' in payload:
        cid = payload.pop('company_id')
        inv.company = Company.objects.filter(id=cid, organization=request.user.organization).first() if cid else None
    if 'deal_id' in payload:
        did = payload.pop('deal_id')
        inv.deal = Deal.objects.filter(id=did, organization=request.user.organization).first() if did else None

    items = payload.get('items', inv.items) or []
    services = payload.get('services', inv.services) or []
    items_ngn = sum(float(i.get('total_ngn') or i.get('price_ngn') or 0) for i in items if isinstance(i, dict))
    items_gbp = sum(float(i.get('total_gbp') or i.get('price_gbp') or 0) for i in items if isinstance(i, dict))
    services_ngn = sum(float(s.get('price_ngn') or 0) for s in services if isinstance(s, dict))
    services_gbp = sum(float(s.get('price_gbp') or 0) for s in services if isinstance(s, dict))
    calc_ngn = items_ngn + services_ngn
    calc_gbp = items_gbp + services_gbp
    if calc_ngn > 0:
        payload['total_ngn'] = calc_ngn
    if calc_gbp > 0:
        payload['total_gbp'] = calc_gbp

    for k, v in payload.items():
        setattr(inv, k, v)
    inv.save()
    return inv

@invoices_router.delete("/{id}", response={204: None})
def delete_invoice(request, id: UUID):
    inv = Invoice.objects.filter(id=id, organization=request.user.organization).first()
    if not inv:
        raise HttpError(404, "Invoice not found.")
    inv.delete()
    return 204, None

@invoices_router.post("/{id}/mark-paid", response=ReceiptSchema)
def mark_invoice_paid(request, id: UUID, payment_method: Optional[str] = 'BANK_TRANSFER', reference_number: Optional[str] = None):
    inv = Invoice.objects.filter(id=id, organization=request.user.organization).first()
    if not inv:
        raise HttpError(404, "Invoice not found.")
        
    inv.status = Invoice.PAID
    inv.amount_paid = inv.total_ngn if inv.total_ngn > 0 else inv.total_gbp
    inv.save()
    
    rcpt_count = Receipt.objects.filter(organization=request.user.organization).count() + 1
    receipt_no = f"REC-{rcpt_count:08d}"
    
    rcpt = Receipt.objects.create(
        organization=request.user.organization,
        receipt_number=receipt_no,
        invoice=inv,
        contact=inv.contact,
        amount_paid_ngn=inv.total_ngn,
        amount_paid_gbp=inv.total_gbp,
        payment_method=payment_method or 'BANK_TRANSFER',
        reference_number=reference_number or f"REF-{inv.invoice_number}",
        items_summary={
            "invoice_number": inv.invoice_number,
            "receiver_name": inv.receiver_name,
            "expected_parcel_no": inv.expected_parcel_no,
            "items_count": len(inv.items or []),
            "services_count": len(inv.services or [])
        },
        notes=f"Payment receipt for Invoice #{inv.invoice_number}"
    )
    return rcpt


# ----------------- RECEIPTS API -----------------

@receipts_router.get("", response=List[ReceiptSchema])
@paginate(LimitOffsetPagination)
def list_receipts(request, search: Optional[str] = None):
    qs = Receipt.objects.filter(organization=request.user.organization).select_related('invoice', 'contact')
    if search:
        qs = qs.filter(
            Q(receipt_number__icontains=search) |
            Q(reference_number__icontains=search) |
            Q(invoice__invoice_number__icontains=search) |
            Q(invoice__receiver_name__icontains=search)
        )
    return qs.order_by('-payment_date')

@receipts_router.get("/{id}", response=ReceiptSchema)
def get_receipt(request, id: UUID):
    rcpt = Receipt.objects.filter(id=id, organization=request.user.organization).select_related('invoice', 'contact').first()
    if not rcpt:
        raise HttpError(404, "Receipt not found.")
    return rcpt

@receipts_router.post("", response={201: ReceiptSchema})
def create_receipt(request, data: ReceiptCreateSchema):
    payload = data.dict()
    invoice_id = payload.pop('invoice_id', None)
    contact_id = payload.pop('contact_id', None)
    
    if not payload.get('receipt_number'):
        count = Receipt.objects.filter(organization=request.user.organization).count() + 1
        payload['receipt_number'] = f"REC-{count:08d}"
        
    inv = Invoice.objects.filter(id=invoice_id, organization=request.user.organization).first() if invoice_id else None
    contact = Contact.objects.filter(id=contact_id, organization=request.user.organization).first() if contact_id else None
    
    rcpt = Receipt.objects.create(
        organization=request.user.organization,
        invoice=inv,
        contact=contact,
        **payload
    )
    return 201, rcpt

@receipts_router.delete("/{id}", response={204: None})
def delete_receipt(request, id: UUID):
    rcpt = Receipt.objects.filter(id=id, organization=request.user.organization).first()
    if not rcpt:
        raise HttpError(404, "Receipt not found.")
    rcpt.delete()
    return 204, None


# ----------------- SHIPMENTS API -----------------

@shipments_router.get("", response=List[ShipmentSchema])
def list_shipments(
    request,
    search: Optional[str] = None,
    shipment_status: Optional[str] = None,
    payment_status: Optional[str] = None
):
    qs = Shipment.objects.filter(organization=request.user.organization).select_related(
        'sender', 'receiver', 'partner', 'recorded_by'
    )
    if search:
        qs = qs.filter(
            Q(tracking_id__icontains=search) |
            Q(invoice_number__icontains=search) |
            Q(sender_name__icontains=search) |
            Q(sender_email__icontains=search) |
            Q(sender_phone__icontains=search) |
            Q(receiver_name__icontains=search) |
            Q(receiver_email__icontains=search) |
            Q(receiver_phone__icontains=search)
        )
    if shipment_status:
        qs = qs.filter(shipment_status=shipment_status)
    if payment_status:
        qs = qs.filter(payment_status=payment_status)
    return qs.order_by('-created_at')

@shipments_router.post("", response={201: ShipmentSchema})
def create_shipment(request, data: ShipmentCreateSchema):
    payload = data.dict(exclude_unset=True)

    def parse_uuid(val):
        if val and str(val).strip():
            try:
                return UUID(str(val).strip())
            except (ValueError, TypeError):
                return None
        return None

    sender_id = parse_uuid(payload.pop('sender_id', None))
    receiver_id = parse_uuid(payload.pop('receiver_id', None))
    partner_id = parse_uuid(payload.pop('partner_id', None))
    recorded_by_id = parse_uuid(payload.pop('recorded_by_id', None))

    date_val = payload.pop('date', None)
    if date_val and str(date_val).strip():
        payload['date'] = str(date_val).strip()
    else:
        payload['date'] = None

    # Clean up empty strings for optional text fields
    for field in ['sender_name', 'sender_phone', 'sender_email', 'sender_address',
                  'receiver_name', 'receiver_phone', 'receiver_email', 'receiver_address',
                  'invoice_number', 'partner_name', 'item_received',
                  'items_shipped', 'items_recieved', 'tracking_id', 'note']:
        if field in payload and payload[field] is not None and str(payload[field]).strip() == '':
            payload[field] = None

    # Auto-generate tracking_id if not supplied
    if not payload.get('tracking_id'):
        count = Shipment.objects.filter(organization=request.user.organization).count() + 1001
        payload['tracking_id'] = f"TRK-{timezone.now().strftime('%Y%m%d')}-{count}"

    # Auto-generate invoice_number if not supplied
    if not payload.get('invoice_number'):
        count = Shipment.objects.filter(organization=request.user.organization).count() + 1001
        payload['invoice_number'] = f"INV-SHIP-{count}"

    shipment = Shipment.objects.create(
        organization=request.user.organization,
        sender_id=sender_id,
        receiver_id=receiver_id,
        partner_id=partner_id,
        recorded_by_id=recorded_by_id or request.user.id,
        **payload
    )
    return 201, shipment

@shipments_router.get("/{id}", response=ShipmentSchema)
def get_shipment(request, id: UUID):
    shipment = Shipment.objects.filter(id=id, organization=request.user.organization).first()
    if not shipment:
        raise HttpError(404, "Shipment not found.")
    return shipment

@shipments_router.put("/{id}", response=ShipmentSchema)
def update_shipment(request, id: UUID, data: ShipmentCreateSchema):
    shipment = Shipment.objects.filter(id=id, organization=request.user.organization).first()
    if not shipment:
        raise HttpError(404, "Shipment not found.")
    
    payload = data.dict(exclude_unset=True)
    for attr, val in payload.items():
        setattr(shipment, attr, val)
    shipment.save()
    return shipment

@shipments_router.delete("/{id}", response={204: None})
def delete_shipment(request, id: UUID):
    shipment = Shipment.objects.filter(id=id, organization=request.user.organization).first()
    if not shipment:
        raise HttpError(404, "Shipment not found.")
    shipment.delete()
    return 204, None


# ----------------- SHIPMENT ESCALATIONS API -----------------

@shipment_escalations_router.get("", response=List[ShipmentEscalationSchema])
def list_shipment_escalations(
    request,
    search: Optional[str] = None,
    shipment_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
    escalation_type: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    escalation_to_id: Optional[UUID] = None
):
    qs = ShipmentEscalation.objects.filter(organization=request.user.organization).select_related(
        'shipment', 'customer', 'escalation_to', 'created_by'
    )
    if search:
        qs = qs.filter(
            Q(customer_name__icontains=search) |
            Q(complaint_summary__icontains=search) |
            Q(internal__icontains=search) |
            Q(resolution__icontains=search) |
            Q(shipment__tracking_id__icontains=search)
        )
    if shipment_id:
        qs = qs.filter(shipment_id=shipment_id)
    if customer_id:
        qs = qs.filter(customer_id=customer_id)
    if escalation_type:
        qs = qs.filter(escalation_type=escalation_type)
    if priority:
        qs = qs.filter(priority=priority)
    if status:
        qs = qs.filter(status=status)
    if escalation_to_id:
        qs = qs.filter(escalation_to_id=escalation_to_id)

    return qs.order_by('-created_at')

@shipment_escalations_router.post("", response={201: ShipmentEscalationSchema})
def create_shipment_escalation(request, data: ShipmentEscalationCreateSchema):
    payload = data.dict(exclude_unset=True)

    def parse_uuid(val):
        if val and str(val).strip():
            try:
                return UUID(str(val).strip())
            except (ValueError, TypeError):
                return None
        return None

    shipment_id = parse_uuid(payload.pop('shipment_id', None))
    customer_id = parse_uuid(payload.pop('customer_id', None))
    escalation_to_id = parse_uuid(payload.pop('escalation_to_id', None))

    date_val = payload.pop('date', None)
    if date_val and str(date_val).strip():
        payload['date'] = str(date_val).strip()
    else:
        payload['date'] = timezone.localdate()

    res_date = payload.pop('resolution_date', None)
    if res_date and str(res_date).strip():
        payload['resolution_date'] = str(res_date).strip()
    else:
        payload['resolution_date'] = None

    shipment = Shipment.objects.filter(id=shipment_id, organization=request.user.organization).first() if shipment_id else None
    customer = Contact.objects.filter(id=customer_id, organization=request.user.organization).first() if customer_id else None
    escalation_to = User.objects.filter(id=escalation_to_id, organization=request.user.organization).first() if escalation_to_id else None

    # If customer object exists, set customer_name if not provided
    if customer and not payload.get('customer_name'):
        fullName = f"{customer.first_name} {customer.last_name if customer.last_name != '.' else ''}".strip()
        payload['customer_name'] = fullName
    elif shipment and not payload.get('customer_name'):
        payload['customer_name'] = shipment.receiver_name or shipment.sender_name

    escalation = ShipmentEscalation.objects.create(
        organization=request.user.organization,
        shipment=shipment,
        customer=customer,
        escalation_to=escalation_to,
        created_by=request.user,
        **payload
    )
    return 201, escalation

@shipment_escalations_router.get("/{id}", response=ShipmentEscalationSchema)
def get_shipment_escalation(request, id: UUID):
    escalation = ShipmentEscalation.objects.filter(
        id=id, organization=request.user.organization
    ).select_related('shipment', 'customer', 'escalation_to', 'created_by').first()
    if not escalation:
        raise HttpError(404, "Shipment escalation not found.")
    return escalation

@shipment_escalations_router.put("/{id}", response=ShipmentEscalationSchema)
def update_shipment_escalation(request, id: UUID, data: ShipmentEscalationCreateSchema):
    escalation = ShipmentEscalation.objects.filter(
        id=id, organization=request.user.organization
    ).first()
    if not escalation:
        raise HttpError(404, "Shipment escalation not found.")

    payload = data.dict(exclude_unset=True)

    def parse_uuid(val):
        if val and str(val).strip():
            try:
                return UUID(str(val).strip())
            except (ValueError, TypeError):
                return None
        return None

    if 'shipment_id' in payload:
        s_id = parse_uuid(payload.pop('shipment_id'))
        escalation.shipment = Shipment.objects.filter(id=s_id, organization=request.user.organization).first() if s_id else None

    if 'customer_id' in payload:
        c_id = parse_uuid(payload.pop('customer_id'))
        escalation.customer = Contact.objects.filter(id=c_id, organization=request.user.organization).first() if c_id else None

    if 'escalation_to_id' in payload:
        u_id = parse_uuid(payload.pop('escalation_to_id'))
        escalation.escalation_to = User.objects.filter(id=u_id, organization=request.user.organization).first() if u_id else None

    if 'date' in payload:
        d = payload.pop('date')
        escalation.date = str(d).strip() if d and str(d).strip() else None

    if 'resolution_date' in payload:
        rd = payload.pop('resolution_date')
        escalation.resolution_date = str(rd).strip() if rd and str(rd).strip() else None

    # Auto-fill resolution date if status changed to RESOLVED or CLOSED and resolution_date is missing
    new_status = payload.get('status')
    if new_status in ['RESOLVED', 'CLOSED'] and not escalation.resolution_date:
        escalation.resolution_date = timezone.localdate()

    for attr, val in payload.items():
        setattr(escalation, attr, val)

    escalation.save()
    return escalation

@shipment_escalations_router.delete("/{id}", response={204: None})
def delete_shipment_escalation(request, id: UUID):
    escalation = ShipmentEscalation.objects.filter(
        id=id, organization=request.user.organization
    ).first()
    if not escalation:
        raise HttpError(404, "Shipment escalation not found.")
    escalation.delete()
    return 204, None


# ----------------- CSR REPORTS API -----------------

@csr_reports_router.get("", response=List[CSRReportSchema])
def list_csr_reports(
    request,
    search: Optional[str] = None,
    report_type: Optional[str] = None,
    staff_id: Optional[UUID] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    qs = CSRReport.objects.filter(organization=request.user.organization).select_related('staff', 'reported_to')
    if search:
        qs = qs.filter(
            Q(staff__first_name__icontains=search) |
            Q(staff__last_name__icontains=search) |
            Q(reported_to__first_name__icontains=search) |
            Q(reported_to__last_name__icontains=search) |
            Q(shipment_delays_and_reason__icontains=search) |
            Q(biggest_challenge_week__icontains=search) |
            Q(biggest_achievement_week__icontains=search) |
            Q(biggest_challenge_month__icontains=search) |
            Q(biggest_achievement_month__icontains=search)
        )
    if report_type:
        qs = qs.filter(report_type=report_type)
    if staff_id:
        qs = qs.filter(staff_id=staff_id)
    if start_date:
        qs = qs.filter(date__gte=start_date)
    if end_date:
        qs = qs.filter(date__lte=end_date)

    return qs.order_by('-date', '-created_at')


@csr_reports_router.get("/aggregate", response=dict)
def aggregate_csr_daily_reports(
    request,
    start_date: str,
    end_date: str,
    staff_id: Optional[UUID] = None
):
    qs = CSRReport.objects.filter(
        organization=request.user.organization,
        report_type='DAILY',
        date__range=[start_date, end_date]
    )
    if staff_id:
        qs = qs.filter(staff_id=staff_id)

    aggregated = qs.aggregate(
        total_new_enquiries=Sum('new_enquiries'),
        total_packages_expected=Sum('packages_expected'),
        total_quotation_sent=Sum('quotation_sent'),
        total_shipment_booked=Sum('shipment_booked'),
        total_outstanding_follow_up=Sum('outstanding_follow_up'),
        total_customer_complaint_resolved=Sum('customer_complaint_resolved'),
        total_returning_customers=Sum('returning_customers'),
        total_packages_received=Sum('packages_received'),
        total_customer_converted_paid=Sum('customer_converted_paid'),
        total_follow_up_completed=Sum('follow_up_completed'),
        total_customer_complaint_received=Sum('customer_complaint_received'),
        total_customer_escalated_to_manager=Sum('customer_escalated_to_manager')
    )

    return {
        "new_enquiries": aggregated['total_new_enquiries'] or 0,
        "packages_expected": aggregated['total_packages_expected'] or 0,
        "quotation_sent": aggregated['total_quotation_sent'] or 0,
        "shipment_booked": aggregated['total_shipment_booked'] or 0,
        "outstanding_follow_up": aggregated['total_outstanding_follow_up'] or 0,
        "customer_complaint_resolved": aggregated['total_customer_complaint_resolved'] or 0,
        "returning_customers": aggregated['total_returning_customers'] or 0,
        "packages_received": aggregated['total_packages_received'] or 0,
        "customer_converted_paid": aggregated['total_customer_converted_paid'] or 0,
        "follow_up_completed": aggregated['total_follow_up_completed'] or 0,
        "customer_complaint_received": aggregated['total_customer_complaint_received'] or 0,
        "customer_escalated_to_manager": aggregated['total_customer_escalated_to_manager'] or 0,
        "count_daily_reports": qs.count()
    }


@csr_reports_router.post("", response={201: CSRReportSchema})
def create_csr_report(request, data: CSRReportCreateSchema):
    payload = data.dict(exclude_unset=True)

    def parse_uuid(val):
        if val and str(val).strip():
            try:
                return UUID(str(val).strip())
            except (ValueError, TypeError):
                return None
        return None

    staff_id = parse_uuid(payload.pop('staff_id', None))
    reported_to_id = parse_uuid(payload.pop('reported_to_id', None))

    date_val = payload.pop('date', None)
    if date_val and str(date_val).strip():
        payload['date'] = str(date_val).strip()
    else:
        payload['date'] = timezone.localdate()

    staff = User.objects.filter(id=staff_id, organization=request.user.organization).first() if staff_id else request.user
    reported_to = User.objects.filter(id=reported_to_id, organization=request.user.organization).first() if reported_to_id else None

    report = CSRReport.objects.create(
        organization=request.user.organization,
        staff=staff,
        reported_to=reported_to,
        **payload
    )
    return 201, report


@csr_reports_router.get("/{id}", response=CSRReportSchema)
def get_csr_report(request, id: UUID):
    report = CSRReport.objects.filter(
        id=id, organization=request.user.organization
    ).select_related('staff', 'reported_to').first()
    if not report:
        raise HttpError(404, "CSR report not found.")
    return report


@csr_reports_router.put("/{id}", response=CSRReportSchema)
def update_csr_report(request, id: UUID, data: CSRReportCreateSchema):
    report = CSRReport.objects.filter(
        id=id, organization=request.user.organization
    ).first()
    if not report:
        raise HttpError(404, "CSR report not found.")

    payload = data.dict(exclude_unset=True)

    def parse_uuid(val):
        if val and str(val).strip():
            try:
                return UUID(str(val).strip())
            except (ValueError, TypeError):
                return None
        return None

    if 'staff_id' in payload:
        s_id = parse_uuid(payload.pop('staff_id'))
        report.staff = User.objects.filter(id=s_id, organization=request.user.organization).first() if s_id else None

    if 'reported_to_id' in payload:
        r_id = parse_uuid(payload.pop('reported_to_id'))
        report.reported_to = User.objects.filter(id=r_id, organization=request.user.organization).first() if r_id else None

    if 'date' in payload:
        d = payload.pop('date')
        report.date = str(d).strip() if d and str(d).strip() else None

    for attr, val in payload.items():
        setattr(report, attr, val)

    report.save()
    return report


@csr_reports_router.delete("/{id}", response={204: None})
def delete_csr_report(request, id: UUID):
    report = CSRReport.objects.filter(
        id=id, organization=request.user.organization
    ).first()
    if not report:
        raise HttpError(404, "CSR report not found.")
    report.delete()
    return 204, None





