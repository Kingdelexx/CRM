import logging
import threading
from typing import Optional
from apps.common.services.email import EmailNotificationService

logger = logging.getLogger(__name__)
email_service = EmailNotificationService()


def dispatch_async(target_fn, *args, **kwargs):
    """
    Executes a target notification function asynchronously in a background thread
    so email delivery latency or network timeouts never block the HTTP response.
    """
    def runner():
        try:
            target_fn(*args, **kwargs)
        except Exception as err:
            logger.error(f"[Async Dispatch Error] Execution of {target_fn.__name__} failed: {err}")

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()


def send_new_staff_welcome_email(user, plain_password: str, created_by=None):
    """
    Dispatches a welcome email containing login credentials (email & password)
    to a newly created staff member.
    """
    try:
        email = getattr(user, 'email', None)
        if not email:
            logger.warning("[Staff Welcome Email] Target user has no email address. Skipping email dispatch.")
            return

        first_name = getattr(user, 'first_name', '') or 'Team Member'
        role = getattr(user, 'role', 'STAFF')
        
        try:
            org = getattr(user, 'organization', None)
            org_name = org.name if org and hasattr(org, 'name') else "Mintana CRM"
        except Exception:
            org_name = "Mintana CRM"

        try:
            if created_by:
                cb_fname = getattr(created_by, 'first_name', '') or ''
                cb_lname = getattr(created_by, 'last_name', '') or ''
                admin_name = f"{cb_fname} {cb_lname}".strip() or getattr(created_by, 'email', 'System Administrator')
            else:
                admin_name = "System Administrator"
        except Exception:
            admin_name = "System Administrator"

        subject = f"🎉 Welcome to {org_name} - Your Staff Account Credentials"

        body = (
            f"Hello {first_name},\n\n"
            f"You have been registered as a staff member in {org_name} on Mintana CRM by {admin_name}.\n\n"
            f"Your Login Account Credentials:\n"
            f"• Email: {email}\n"
            f"• Temporary Password: {plain_password}\n"
            f"• Role: {role}\n\n"
            f"Please log into your workspace using your email and temporary password.\n"
            f"⚠️ For security purposes, you will be required to update your password immediately upon your first sign-in.\n\n"
            f"Best regards,\n{org_name} Administration"
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 20px; }}
            .card {{ max-width: 520px; margin: 20px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
            .header {{ font-size: 20px; font-weight: 800; color: #6366f1; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }}
            .badge {{ display: inline-block; padding: 3px 8px; background-color: #312e81; color: #a5b4fc; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }}
            .credentials-box {{ background-color: #09090b; border: 1px solid #3f3f46; border-radius: 8px; padding: 18px; margin: 24px 0; }}
            .credential-row {{ margin-bottom: 10px; font-size: 14px; color: #d4d4d8; }}
            .credential-label {{ font-weight: 700; color: #a1a1aa; display: inline-block; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
            .code-val {{ font-family: monospace; background-color: #27272a; color: #38bdf8; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: 700; border: 1px solid #3f3f46; }}
            .notice-box {{ background-color: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; padding: 12px 16px; border-radius: 4px; margin: 18px 0; font-size: 13px; color: #c7d2fe; }}
            .footer {{ border-top: 1px solid #27272a; margin-top: 28px; padding-top: 20px; font-size: 12px; color: #71717a; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">Mintana CRM</div>
            <div class="badge">{org_name}</div>
            
            <p style="font-size: 15px; margin-top: 0;">Hello <strong>{first_name}</strong>,</p>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              You have been granted staff access to <strong>{org_name}</strong> on Mintana CRM by <strong>{admin_name}</strong>.
            </p>

            <div class="credentials-box">
              <div class="credential-row">
                <span class="credential-label">Login Email:</span>
                <span class="code-val">{email}</span>
              </div>
              <div class="credential-row" style="margin-bottom: 0;">
                <span class="credential-label">Temp Password:</span>
                <span class="code-val">{plain_password}</span>
              </div>
            </div>

            <div class="notice-box">
              🔒 <strong>Security Notice:</strong> You will be prompted to set a new permanent password immediately upon your first sign-in.
            </div>

            <div class="footer">
              Sent automatically by Mintana CRM System
            </div>
          </div>
        </body>
        </html>
        """

        sent = email_service.send_email(
            subject=subject,
            body=body,
            recipients=[email],
            html_body=html_body,
            fail_silently=True
        )
        if sent:
            logger.info(f"[Staff Welcome Email] Dispatched welcome credentials to {email}")
        else:
            logger.warning(f"[Staff Welcome Email] Email notification to {email} was not sent.")
    except Exception as e:
        logger.error(f"[Staff Welcome Email Error] Failed sending welcome email: {e}")


def send_staff_password_updated_email(user, new_password: str, updated_by=None):
    """
    Dispatches an email notification when an administrator resets a staff member's password.
    """
    try:
        email = getattr(user, 'email', None)
        if not email:
            return

        first_name = getattr(user, 'first_name', '') or 'Team Member'

        try:
            org = getattr(user, 'organization', None)
            org_name = org.name if org and hasattr(org, 'name') else "Mintana CRM"
        except Exception:
            org_name = "Mintana CRM"

        try:
            if updated_by:
                cb_fname = getattr(updated_by, 'first_name', '') or ''
                cb_lname = getattr(updated_by, 'last_name', '') or ''
                admin_name = f"{cb_fname} {cb_lname}".strip() or getattr(updated_by, 'email', 'System Administrator')
            else:
                admin_name = "System Administrator"
        except Exception:
            admin_name = "System Administrator"

        subject = f"🔑 Password Updated - {org_name}"

        body = (
            f"Hello {first_name},\n\n"
            f"Your password for {org_name} on Mintana CRM has been updated by {admin_name}.\n\n"
            f"Updated Account Credentials:\n"
            f"• Email: {email}\n"
            f"• New Password: {new_password}\n\n"
            f"Log in using your email address and new password.\n\n"
            f"Best regards,\n{org_name} Administration"
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 20px; }}
            .card {{ max-width: 520px; margin: 20px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
            .header {{ font-size: 20px; font-weight: 800; color: #6366f1; margin-bottom: 16px; }}
            .credentials-box {{ background-color: #09090b; border: 1px solid #3f3f46; border-radius: 8px; padding: 18px; margin: 24px 0; }}
            .credential-row {{ margin-bottom: 10px; font-size: 14px; color: #d4d4d8; }}
            .credential-label {{ font-weight: 700; color: #a1a1aa; display: inline-block; width: 110px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
            .code-val {{ font-family: monospace; background-color: #27272a; color: #38bdf8; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: 700; border: 1px solid #3f3f46; }}
            .footer {{ border-top: 1px solid #27272a; margin-top: 28px; padding-top: 20px; font-size: 12px; color: #71717a; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">Mintana CRM</div>
            
            <p style="font-size: 15px; margin-top: 0;">Hello <strong>{first_name}</strong>,</p>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Your account password for <strong>{org_name}</strong> was updated by administrator <strong>{admin_name}</strong>.
            </p>

            <div class="credentials-box">
              <div class="credential-row">
                <span class="credential-label">Email:</span>
                <span class="code-val">{email}</span>
              </div>
              <div class="credential-row" style="margin-bottom: 0;">
                <span class="credential-label">New Password:</span>
                <span class="code-val">{new_password}</span>
              </div>
            </div>

            <div class="footer">
              Sent automatically by Mintana CRM System
            </div>
          </div>
        </body>
        </html>
        """

        email_service.send_email(
            subject=subject,
            body=body,
            recipients=[email],
            html_body=html_body,
            fail_silently=True
        )
    except Exception as e:
        logger.error(f"[Staff Password Update Email Error] {e}")
