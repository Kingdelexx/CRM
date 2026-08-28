from typing import List, Optional
from uuid import UUID
import json
from django.utils import timezone
from datetime import date, datetime, timedelta
from django.db import transaction
from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate, LimitOffsetPagination
from ninja_jwt.authentication import JWTAuth

from apps.accounts.models import User, Organization
from apps.planning.models import Task, Activity
from .models import Company, Stage, Contact, Deal, Project, LeadLifecycleRule, CustomerList, CustomModule, CustomModuleRecord
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
    CustomModuleRecordSchema
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
            Q(phone__icontains=search)
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
    qs = Project.objects.filter(organization=request.user.organization).select_related('manager', 'deal')
    if search:
        qs = qs.filter(name__icontains=search)
    if contact_id:
        qs = qs.filter(deal__contact_id=contact_id)
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    return qs

@projects_router.get("/{id}", response=ProjectSchema)
def get_project(request, id: UUID):
    project = Project.objects.filter(id=id, organization=request.user.organization).select_related('manager', 'deal').first()
    if not project:
        raise HttpError(404, "Project not found.")
    return project

@projects_router.post("", response={201: ProjectSchema})
def create_project(request, data: ProjectCreateSchema):
    payload = data.dict()
    manager_id = payload.pop('manager_id', None)
    deal_id = payload.pop('deal_id', None)
    
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
    return 201, project

@projects_router.put("/{id}", response=ProjectSchema)
def update_project(request, id: UUID, data: ProjectCreateSchema):
    project = Project.objects.filter(id=id, organization=request.user.organization).first()
    if not project:
        raise HttpError(404, "Project not found.")
        
    payload = data.dict()
    manager_id = payload.pop('manager_id', None)
    deal_id = payload.pop('deal_id', None)
    
    if manager_id:
        manager = User.objects.filter(id=manager_id, organization=request.user.organization).first()
        project.manager = manager
    else:
        project.manager = None
        
    if deal_id:
        deal = Deal.objects.filter(id=deal_id, organization=request.user.organization).first()
        project.deal = deal
    else:
        project.deal = None
        
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
