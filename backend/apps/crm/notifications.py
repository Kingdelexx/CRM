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
