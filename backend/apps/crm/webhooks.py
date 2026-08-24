from ninja import Router, Schema
from ninja.errors import HttpError
from typing import Optional
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.crm.models import Contact, Deal, Company, Stage
from apps.planning.models import Activity
from apps.crm.webhooks_auth import WebhookApiKeyAuth

router = Router()

class LeadCaptureSchema(Schema):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    deal_title: Optional[str] = None
    deal_value: Optional[Decimal] = Decimal('0.00')
    notes: Optional[str] = None

@router.post("/lead-capture", auth=WebhookApiKeyAuth())
def lead_capture(request, data: LeadCaptureSchema):
    org = request.organization
    email = data.email.strip().lower()
    
    try:
        with transaction.atomic():
            # Check if contact already exists in this organization
            contact = Contact.objects.filter(organization=org, email__iexact=email).first()
            
            if contact:
                # Deduplication logic: If exists, append note to this contact
                note_content = (
                    f"Duplicate inbound lead capture attempt. "
                    f"Provided Job Title: {data.job_title or 'N/A'}. "
                    f"Proposed Deal: {data.deal_title or 'N/A'} (Value: ${data.deal_value or 0.00}). "
                    f"Additional Notes: {data.notes or 'None'}."
                )
                Activity.objects.create(
                    organization=org,
                    type=Activity.NOTE,
                    content=note_content,
                    activity_date=timezone.now(),
                    contact=contact,
                    company=contact.company
                )
                return {
                    "status": "success",
                    "action": "appended_note_to_existing_contact",
                    "contact_id": str(contact.id)
                }
            else:
                # If new, create Contact + Deal
                company = None
                if data.company_name:
                    # Fetch or create company for this org
                    company_name_stripped = data.company_name.strip()
                    company = Company.objects.filter(organization=org, name__iexact=company_name_stripped).first()
                    if not company:
                        company = Company.objects.create(
                            organization=org,
                            name=company_name_stripped,
                            about=f"Created via lead capture webhook."
                        )
                
                # Check or assign to first admin user if available
                from apps.accounts.models import User
                assigned_to = User.objects.filter(organization=org, role=User.ADMIN).first()
                
                # Create Contact
                contact = Contact.objects.create(
                    organization=org,
                    first_name=data.first_name,
                    last_name=data.last_name,
                    email=email,
                    phone=data.phone,
                    job_title=data.job_title,
                    status=Contact.LEAD,
                    company=company,
                    assigned_to=assigned_to
                )
                
                # Fetch first stage of the sales pipeline for this org
                stage = Stage.objects.filter(organization=org, pipeline_type='SALES').order_by('order').first()
                if not stage:
                    # Create a default stage if none exists
                    stage = Stage.objects.create(
                        organization=org,
                        name="Lead In",
                        order=1,
                        win_probability=10,
                        pipeline_type='SALES'
                    )
                
                # Create Deal
                deal_title = data.deal_title or f"{data.first_name} {data.last_name} - Inquiry"
                deal = Deal.objects.create(
                    organization=org,
                    contact=contact,
                    company=company,
                    stage=stage,
                    title=deal_title,
                    value=data.deal_value or Decimal('0.00'),
                    currency='USD',
                    status=Deal.OPEN
                )
                
                # Include the captured notes in a separate log note
                if data.notes:
                    Activity.objects.create(
                        organization=org,
                        type=Activity.NOTE,
                        content=f"Captured lead custom notes: {data.notes}",
                        activity_date=timezone.now(),
                        deal=deal,
                        contact=contact,
                        company=company
                    )
                
                return {
                    "status": "success",
                    "action": "created_new_contact_and_deal",
                    "contact_id": str(contact.id),
                    "deal_id": str(deal.id)
                }
                
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HttpError(500, f"Error processing lead capture: {str(e)}")

# Duplicate route definition with single trailing slash to handle both styles gracefully
@router.post("/lead-capture/", auth=WebhookApiKeyAuth())
def lead_capture_with_slash(request, data: LeadCaptureSchema):
    return lead_capture(request, data)
