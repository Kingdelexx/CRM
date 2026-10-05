import logging
import urllib.request
import json
import os
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def send_deal_closed_won_notifications(deal):
    """
    Sends notification when a Deal is Closed Won:
    - Email alert to organization admin users.
    - Webhook trigger (Slack/Discord/WhatsApp) for high-value leads.
    """
    # 1. Fetch organization admin users
    from apps.accounts.models import User
    admins = User.objects.filter(organization=deal.organization, role=User.ADMIN)
    admin_emails = [admin.email for admin in admins if admin.email]
    
    if admin_emails:
        subject = f"🎉 Deal Closed Won: {deal.title}"
        message = (
            f"Great news!\n\n"
            f"The deal '{deal.title}' associated with {deal.company.name if deal.company else 'Standalone'} "
            f"has been marked as CLOSED WON.\n\n"
            f"Deal Details:\n"
            f"- Value: ${deal.value} {deal.currency}\n"
            f"- Contact: {deal.contact.first_name if deal.contact else 'N/A'} {deal.contact.last_name if deal.contact else 'N/A'}\n"
            f"- Industry: {deal.company.industry if (deal.company and deal.company.industry) else 'N/A'}\n\n"
            f"Congratulations to the team!"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'crm@mintana.com'),
                recipient_list=admin_emails,
                fail_silently=False
            )
            print(f"[Email Notification] Closed Won alert sent to: {admin_emails}")
        except Exception as e:
            logger.error(f"Failed to send Closed Won notification email: {str(e)}")

    # 2. Check if high-value lead (threshold >= 10,000)
    if deal.value >= 10000:
        trigger_external_webhook(deal, event_type="DEAL_CLOSED_WON")


def send_contact_assignment_email(contact):
    """
    Sends email alert to the assigned sales representative.
    """
    rep = contact.assigned_to
    if rep and rep.email:
        subject = f"💼 New Contact Assigned: {contact.first_name} {contact.last_name}"
        message = (
            f"Hello {rep.first_name},\n\n"
            f"A new contact has been assigned to you:\n\n"
            f"Contact Details:\n"
            f"- Name: {contact.first_name} {contact.last_name}\n"
            f"- Job Title: {contact.job_title or 'N/A'}\n"
            f"- Company: {contact.company.name if contact.company else 'N/A'}\n"
            f"- Email: {contact.email}\n"
            f"- Phone: {contact.phone or 'N/A'}\n\n"
            f"Please reach out and update their status in the CRM."
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'crm@mintana.com'),
                recipient_list=[rep.email],
                fail_silently=False
            )
            print(f"[Email Notification] Assignment alert sent to sales rep: {rep.email}")
        except Exception as e:
            logger.error(f"Failed to send Contact Assignment notification email: {str(e)}")


def trigger_external_webhook(deal, event_type):
    """
    Triggers an external webhook (e.g. Slack/Discord) for high-value leads/updates.
    """
    slack_webhook_url = os.environ.get('SLACK_WEBHOOK_URL') or getattr(settings, 'SLACK_WEBHOOK_URL', None)
    
    # Construct alert payload
    payload = {
        "text": f"🔥 *High-Value Lead Alert ({event_type})* 🔥\n"
                f"*Deal*: {deal.title}\n"
                f"*Value*: ${deal.value} {deal.currency}\n"
                f"*Company*: {deal.company.name if deal.company else 'Standalone'}\n"
                f"*Contact*: {deal.contact.first_name if deal.contact else 'N/A'} {deal.contact.last_name if deal.contact else 'N/A'} ({deal.contact.email if deal.contact else 'N/A'})\n"
                f"*Status*: {deal.status}"
    }

    # Printing to console/log for developmental testing
    print(f"[Webhook Notification] High-Value Lead webhook triggered for deal '{deal.title}' (Value: ${deal.value}). Payload:\n{json.dumps(payload, indent=2)}")

    if slack_webhook_url:
        try:
            req = urllib.request.Request(
                slack_webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json"},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                status_code = response.getcode()
                print(f"[Webhook Notification] Webhook POST status code: {status_code}")
        except Exception as e:
            logger.error(f"Failed to trigger high-value webhook URL: {str(e)}")


# ---------------------------------------------------------------------------
# ESCALATION WORKFLOW EMAIL NOTIFICATION SERVICES
# ---------------------------------------------------------------------------

from typing import List, Optional
from apps.common.services.email import EmailNotificationService

email_service = EmailNotificationService()


def get_sender_display_name(escalation) -> str:
    if hasattr(escalation, 'created_by') and escalation.created_by:
        fname = getattr(escalation.created_by, 'first_name', '') or ''
        lname = getattr(escalation.created_by, 'last_name', '') or ''
        full = f"{fname} {lname}".strip()
        if full:
            return full
        return getattr(escalation.created_by, 'email', 'Staff Member')
    return 'Staff Member'


def get_escalation_target_recipients(escalation, recipient_email: Optional[str] = None) -> List[str]:
    if recipient_email:
        return [recipient_email]

    recipients = []
    if hasattr(escalation, 'escalation_to') and escalation.escalation_to and escalation.escalation_to.email:
        recipients.append(escalation.escalation_to.email)

    # Fallback to organization admins if unassigned or no email
    if not recipients and hasattr(escalation, 'organization') and escalation.organization:
        from apps.accounts.models import User
        admins = User.objects.filter(organization=escalation.organization, role=User.ADMIN)
        for admin in admins:
            if admin.email and admin.email not in recipients:
                recipients.append(admin.email)

    return recipients


def send_escalation_initial_alert_email(escalation, recipient_email: Optional[str] = None, direct_link: Optional[str] = None) -> bool:
    """
    1. Initial Alert Email:
       - Subject: [Escalation Alert] New issue logged by [Sender Name]
       - Content: Details of the escalation, priority, who logged it, and a direct button/link to view and resolve it.
    """
    sender_name = get_sender_display_name(escalation)
    recipients = get_escalation_target_recipients(escalation, recipient_email)
    if not recipients:
        logger.warning(f"[Escalation Initial Alert] No recipients found for escalation {getattr(escalation, 'id', None)}")
        return False

    app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    resolve_url = direct_link or f"{app_url}/shipments"

    subject = f"[Escalation Alert] New issue logged by {sender_name}"

    priority_raw = getattr(escalation, 'priority', 'MEDIUM')
    priority_choices = getattr(escalation, 'PRIORITY_CHOICES', [('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent / Critical')])
    priority_label = dict(priority_choices).get(priority_raw, priority_raw or 'MEDIUM')

    type_raw = getattr(escalation, 'escalation_type', 'DELAY')
    type_choices = getattr(escalation, 'ESCALATION_TYPE_CHOICES', [('DELAY', 'Delay in Delivery'), ('DAMAGED_GOODS', 'Damaged Goods'), ('OTHER', 'Other')])
    type_label = dict(type_choices).get(type_raw, type_raw or 'General Issue')

    customer_name = getattr(escalation, 'customer_name', None) or 'Valued Client'
    complaint_summary = getattr(escalation, 'complaint_summary', None) or 'No description provided.'
    
    created_at = getattr(escalation, 'created_at', None)
    created_at_str = created_at.strftime("%b %d, %Y at %I:%M %p") if created_at else 'Just now'

    shipment_info = "N/A"
    shipment_obj = getattr(escalation, 'shipment', None)
    if shipment_obj:
        shipment_info = getattr(shipment_obj, 'invoice_number', None) or getattr(shipment_obj, 'tracking_id', None) or str(shipment_obj.id)

    assignee_name = "Unassigned"
    escalation_to = getattr(escalation, 'escalation_to', None)
    if escalation_to:
        f = getattr(escalation_to, 'first_name', '') or ''
        l = getattr(escalation_to, 'last_name', '') or ''
        assignee_name = f"{f} {l}".strip() or getattr(escalation_to, 'email', 'Staff')

    # Plain text fallback
    body = (
        f"ESCALATION ALERT - NEW ISSUE LOGGED\n"
        f"----------------------------------------\n"
        f"Logged By: {sender_name}\n"
        f"Priority: {priority_label.upper()}\n"
        f"Issue Type: {type_label}\n"
        f"Customer: {customer_name}\n"
        f"Shipment / Parcel #: {shipment_info}\n"
        f"Assigned To: {assignee_name}\n"
        f"Logged On: {created_at_str}\n"
        f"----------------------------------------\n"
        f"Issue Details:\n"
        f"{complaint_summary}\n\n"
        f"View and resolve this escalation using the link below:\n"
        f"{resolve_url}\n\n"
        f"Mintana CRM Automated Workflow System"
    )

    priority_bg = "#ef4444" if priority_raw in ['URGENT', 'HIGH'] else "#f59e0b" if priority_raw == 'MEDIUM' else "#3b82f6"

    # HTML Email Template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px 12px; }}
        .card {{ max-width: 580px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }}
        .top-bar {{ background: linear-gradient(90deg, #dc2626, #b91c1c); padding: 4px; }}
        .header {{ padding: 28px 32px 16px 32px; }}
        .badge {{ display: inline-block; padding: 4px 10px; background-color: {priority_bg}; color: #ffffff; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
        .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }}
        .subtitle {{ font-size: 13px; color: #a1a1aa; margin: 0; }}
        .content {{ padding: 0 32px 32px 32px; }}
        .details-box {{ background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin: 20px 0; }}
        .row {{ display: flex; margin-bottom: 10px; font-size: 13px; }}
        .label {{ font-weight: 700; color: #71717a; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; flex-shrink: 0; }}
        .val {{ color: #e4e4e7; font-weight: 600; }}
        .summary-box {{ background-color: #27272a; border-left: 4px solid {priority_bg}; border-radius: 6px; padding: 16px; margin: 18px 0; font-size: 14px; color: #f4f4f5; line-height: 1.6; white-space: pre-wrap; }}
        .btn-container {{ text-align: center; margin: 28px 0 12px 0; }}
        .btn {{ display: inline-block; background-color: #6366f1; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }}
        .footer {{ border-top: 1px solid #27272a; padding: 20px 32px; font-size: 12px; color: #71717a; text-align: center; background-color: #121215; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="top-bar"></div>
        <div class="header">
          <span class="badge">🚨 {priority_label} Priority</span>
          <h1 class="title">New Escalation Issue Logged</h1>
          <p class="subtitle">An issue has been logged by <strong>{sender_name}</strong> requiring attention.</p>
        </div>

        <div class="content">
          <div class="details-box">
            <div class="row">
              <span class="label">Logged By:</span>
              <span class="val">{sender_name}</span>
            </div>
            <div class="row">
              <span class="label">Assigned Staff:</span>
              <span class="val">{assignee_name}</span>
            </div>
            <div class="row">
              <span class="label">Issue Type:</span>
              <span class="val">{type_label}</span>
            </div>
            <div class="row">
              <span class="label">Customer Name:</span>
              <span class="val">{customer_name}</span>
            </div>
            <div class="row">
              <span class="label">Parcel / Shipment:</span>
              <span class="val" style="font-family: monospace; color: #38bdf8;">{shipment_info}</span>
            </div>
            <div class="row" style="margin-bottom: 0;">
              <span class="label">Date Logged:</span>
              <span class="val">{created_at_str}</span>
            </div>
          </div>

          <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Complaint / Issue Description:</div>
          <div class="summary-box">{complaint_summary}</div>

          <div class="btn-container">
            <a href="{resolve_url}" class="btn">View & Resolve Escalation ↗</a>
          </div>
        </div>

        <div class="footer">
          Mintana CRM Logistics • Automated Escalation Workflow System
        </div>
      </div>
    </body>
    </html>
    """

    return email_service.send_email(
        subject=subject,
        body=body,
        recipients=recipients,
        html_body=html_body,
        fail_silently=True
    )


def send_escalation_6hr_reminder_email(escalation, pending_hours: int = 6, recipient_email: Optional[str] = None, direct_link: Optional[str] = None) -> bool:
    """
    2. 6-Hour Reminder Email:
       - Subject: [Reminder] Unresolved Escalation: [Title] (Pending [X] hours)
       - Content: A brief reminder that this escalation has been awaiting resolution for [X] hours, with a link to resolve it.
    """
    sender_name = get_sender_display_name(escalation)
    recipients = get_escalation_target_recipients(escalation, recipient_email)
    if not recipients:
        logger.warning(f"[Escalation 6-Hour Reminder] No recipients found for escalation {getattr(escalation, 'id', None)}")
        return False

    app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    resolve_url = direct_link or f"{app_url}/shipments"

    raw_summary = getattr(escalation, 'complaint_summary', None) or getattr(escalation, 'customer_name', None) or 'Shipment Issue'
    title_display = str(raw_summary).strip()
    if len(title_display) > 40:
        title_display = title_display[:37] + "..."

    subject = f"[Reminder] Unresolved Escalation: {title_display} (Pending {pending_hours} hours)"

    priority_raw = getattr(escalation, 'priority', 'MEDIUM')
    priority_choices = getattr(escalation, 'PRIORITY_CHOICES', [('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent / Critical')])
    priority_label = dict(priority_choices).get(priority_raw, priority_raw or 'MEDIUM')

    type_raw = getattr(escalation, 'escalation_type', 'DELAY')
    type_choices = getattr(escalation, 'ESCALATION_TYPE_CHOICES', [('DELAY', 'Delay in Delivery'), ('DAMAGED_GOODS', 'Damaged Goods'), ('OTHER', 'Other')])
    type_label = dict(type_choices).get(type_raw, type_raw or 'General Issue')

    customer_name = getattr(escalation, 'customer_name', None) or 'Valued Client'
    complaint_summary = getattr(escalation, 'complaint_summary', None) or 'No description provided.'
    
    created_at = getattr(escalation, 'created_at', None)
    created_at_str = created_at.strftime("%b %d, %Y at %I:%M %p") if created_at else 'Earlier'

    # Plain text fallback
    body = (
        f"REMINDER: UNRESOLVED ESCALATION ISSUE\n"
        f"----------------------------------------\n"
        f"This escalation has been awaiting resolution for {pending_hours} hours.\n\n"
        f"Issue Details:\n"
        f"- Title / Summary: {title_display}\n"
        f"- Customer: {customer_name}\n"
        f"- Logged By: {sender_name}\n"
        f"- Priority: {priority_label}\n"
        f"- Issue Type: {type_label}\n"
        f"- Date Logged: {created_at_str}\n"
        f"----------------------------------------\n"
        f"Description:\n"
        f"{complaint_summary}\n\n"
        f"Please resolve this issue immediately at:\n"
        f"{resolve_url}\n\n"
        f"Mintana CRM Automated Workflow System"
    )

    # HTML Email Template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px 12px; }}
        .card {{ max-width: 580px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }}
        .top-bar {{ background: linear-gradient(90deg, #f59e0b, #d97706); padding: 4px; }}
        .header {{ padding: 28px 32px 16px 32px; }}
        .badge {{ display: inline-block; padding: 4px 10px; background-color: #d97706; color: #ffffff; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
        .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }}
        .subtitle {{ font-size: 13px; color: #a1a1aa; margin: 0; }}
        .content {{ padding: 0 32px 32px 32px; }}
        .alert-banner {{ background-color: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #fef08a; line-height: 1.5; }}
        .details-box {{ background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin: 18px 0; }}
        .row {{ display: flex; margin-bottom: 10px; font-size: 13px; }}
        .label {{ font-weight: 700; color: #71717a; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; flex-shrink: 0; }}
        .val {{ color: #e4e4e7; font-weight: 600; }}
        .summary-box {{ background-color: #27272a; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin: 16px 0; font-size: 14px; color: #f4f4f5; line-height: 1.5; white-space: pre-wrap; }}
        .btn-container {{ text-align: center; margin: 28px 0 12px 0; }}
        .btn {{ display: inline-block; background-color: #f59e0b; color: #000000 !important; font-weight: 800; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); }}
        .footer {{ border-top: 1px solid #27272a; padding: 20px 32px; font-size: 12px; color: #71717a; text-align: center; background-color: #121215; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="top-bar"></div>
        <div class="header">
          <span class="badge">⏱️ Unresolved Reminder</span>
          <h1 class="title">Escalation Still Open ({pending_hours} Hours)</h1>
          <p class="subtitle">Issue logged by <strong>{sender_name}</strong> is awaiting resolution.</p>
        </div>

        <div class="content">
          <div class="alert-banner">
            ⚠️ <strong>Notice:</strong> This escalation issue has been pending resolution for <strong>{pending_hours} hours</strong>. Please review and update its status.
          </div>

          <div class="details-box">
            <div class="row">
              <span class="label">Issue Title:</span>
              <span class="val">{title_display}</span>
            </div>
            <div class="row">
              <span class="label">Logged By:</span>
              <span class="val">{sender_name}</span>
            </div>
            <div class="row">
              <span class="label">Priority:</span>
              <span class="val">{priority_label}</span>
            </div>
            <div class="row">
              <span class="label">Customer:</span>
              <span class="val">{customer_name}</span>
            </div>
            <div class="row" style="margin-bottom: 0;">
              <span class="label">Logged On:</span>
              <span class="val">{created_at_str}</span>
            </div>
          </div>

          <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Issue Details:</div>
          <div class="summary-box">{complaint_summary}</div>

          <div class="btn-container">
            <a href="{resolve_url}" class="btn">Resolve Escalation Now ↗</a>
          </div>
        </div>

        <div class="footer">
          Mintana CRM Logistics • Automated Escalation Workflow System
        </div>
      </div>
    </body>
    </html>
    """

    return email_service.send_email(
        subject=subject,
        body=body,
        recipients=recipients,
        html_body=html_body,
        fail_silently=True
    )


# ---------------------------------------------------------------------------
# RECURRING 6-HOUR REMINDER SCHEDULER BACKGROUND JOB
# ---------------------------------------------------------------------------

from datetime import timedelta
from django.utils import timezone
from django.db.models import Q


def run_escalation_reminder_job(hours_threshold: int = 6) -> dict:
    """
    Recurring 6-Hour Escalation Reminder Scheduler Job:
    1. Queries all Escalations where status == 'OPEN' and (last_reminder_sent_at is older than 6 hours or null).
    2. For each matching escalation:
       - Dispatches 6-hour reminder email to assigned Manager or Admin.
       - Updates last_reminder_sent_at to current timestamp.
       - Wraps each email dispatch in try/except so a single delivery failure does not halt the loop.
    """
    from apps.crm.models import ShipmentEscalation

    now = timezone.now()
    cutoff_time = now - timedelta(hours=hours_threshold)

    # Query all Escalations where status == 'OPEN' and (last_reminder_sent_at is older than 6 hours or null)
    matching_escalations = ShipmentEscalation.objects.filter(
        Q(status='OPEN') &
        (Q(last_reminder_sent_at__isnull=True) | Q(last_reminder_sent_at__lte=cutoff_time))
    ).select_related('organization', 'created_by', 'escalation_to', 'shipment', 'customer')

    total_matching = matching_escalations.count()
    success_count = 0
    failure_count = 0
    processed_ids = []

    logger.info(f"[Escalation Scheduler] Found {total_matching} open escalation(s) pending 6-hour reminder.")

    for escalation in matching_escalations:
        try:
            # Calculate pending hours for email template context
            pending_hours = hours_threshold
            if getattr(escalation, 'created_at', None):
                pending_delta = now - escalation.created_at
                pending_hours = max(hours_threshold, int(pending_delta.total_seconds() // 3600))

            # Dispatch 6-hour reminder email
            send_escalation_6hr_reminder_email(escalation, pending_hours=pending_hours)

            # Update last_reminder_sent_at to current timestamp
            escalation.last_reminder_sent_at = timezone.now()
            escalation.save(update_fields=['last_reminder_sent_at', 'updated_at'])

            success_count += 1
            processed_ids.append(str(escalation.id))
            logger.info(f"[Escalation Scheduler] Successfully dispatched reminder & updated timestamp for Escalation {escalation.id}")
        except Exception as err:
            failure_count += 1
            logger.error(f"[Escalation Scheduler Error] Delivery failure for Escalation {getattr(escalation, 'id', None)}: {err}")
            # Try/Catch block ensures a single failure does not halt the loop for other pending escalations

    return {
        "status": "success",
        "total_matching": total_matching,
        "sent": success_count,
        "failed": failure_count,
        "processed_ids": processed_ids
    }

