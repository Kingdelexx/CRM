from typing import List, Optional
from uuid import UUID
from django.db import transaction
from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate, LimitOffsetPagination
from ninja_jwt.authentication import JWTAuth

from apps.accounts.models import User
from .models import Company, Stage, Contact, Deal
from .schemas import (
    CompanySchema, CompanyCreateSchema,
    StageSchema, StageCreateSchema,
    ContactSchema, ContactCreateSchema,
    DealSchema, DealCreateSchema
)

# Route instances initialized with JWT Auth
companies_router = Router(auth=JWTAuth())
stages_router = Router(auth=JWTAuth())
contacts_router = Router(auth=JWTAuth())
deals_router = Router(auth=JWTAuth())

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
def create_contact(request, data: ContactCreateSchema):
    payload = data.dict()
    company_id = payload.pop('company_id', None)
    assigned_to_id = payload.pop('assigned_to_id', None)
    custom_fields = payload.pop('custom_fields', None) or {}
    
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
