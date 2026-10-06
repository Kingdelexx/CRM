import logging
import threading
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings

from apps.planning.models import Task
from apps.accounts.models import User
from apps.common.services.email import EmailNotificationService

logger = logging.getLogger(__name__)
email_service = EmailNotificationService()


def dispatch_async(target_fn, *args, **kwargs):
    """
    Executes a target notification function asynchronously in a background thread
    with try-catch safety so delivery failures never block main request processing.
    """
    def runner():
        try:
            target_fn(*args, **kwargs)
        except Exception as err:
            logger.error(f"[Async Dispatch Error] Execution of {target_fn.__name__} failed: {err}")

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()


def send_task_created_staff_email(task: Task):
    """
    Sends email notification to the assigned staff member when a task is created or reassigned.
    Runs in background job with try-catch safety.
    """
    try:
        assignee = task.assignee
        if not assignee or not assignee.email:
            logger.info(f"[Task Notification] Task #{task.id} has no assigned staff email. Skipping creation alert.")
            return

        subject = f"📋 New Task Assigned: {task.title}"

        due_str = 'No due date specified'
        if task.due_date:
            if isinstance(task.due_date, str):
                due_str = task.due_date
            elif hasattr(task.due_date, 'strftime'):
                due_str = task.due_date.strftime('%Y-%m-%d %H:%M')
            else:
                due_str = str(task.due_date)

        creator_name = "System Administrator"
        if task.created_by:
            f = getattr(task.created_by, 'first_name', '') or ''
            l = getattr(task.created_by, 'last_name', '') or ''
            creator_name = f"{f} {l}".strip() or getattr(task.created_by, 'email', 'System Administrator')

        assignee_name = getattr(assignee, 'first_name', '') or 'Team Member'
        priority_str = getattr(task, 'priority', 'MEDIUM') or 'MEDIUM'
        status_str = getattr(task, 'status', 'TODO') or 'TODO'

        # Plain text fallback
        body = (
            f"Hello {assignee_name},\n\n"
            f"A new task has been created and assigned to you in Mintana CRM:\n\n"
            f"Task Details:\n"
            f"• Title: {task.title}\n"
            f"• Priority: {priority_str}\n"
            f"• Status: {status_str}\n"
            f"• Due Date: {due_str}\n"
            f"• Assigned By: {creator_name}\n"
            f"• Description: {task.description or 'No description provided.'}\n\n"
            f"Please log into your Mintana CRM workspace to manage this task.\n\n"
            f"Best regards,\nMintana CRM Automated Systems"
        )

        app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        task_url = f"{app_url}/tasks"

        # HTML Email Template
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px 12px; }}
            .card {{ max-width: 580px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }}
            .top-bar {{ background: linear-gradient(90deg, #6366f1, #8b5cf6); padding: 4px; }}
            .header {{ padding: 28px 32px 16px 32px; }}
            .badge {{ display: inline-block; padding: 4px 10px; background-color: #312e81; color: #a5b4fc; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
            .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }}
            .subtitle {{ font-size: 13px; color: #a1a1aa; margin: 0; }}
            .content {{ padding: 0 32px 32px 32px; }}
            .details-box {{ background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .row {{ display: flex; margin-bottom: 10px; font-size: 13px; }}
            .label {{ font-weight: 700; color: #71717a; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; flex-shrink: 0; }}
            .val {{ color: #e4e4e7; font-weight: 600; }}
            .summary-box {{ background-color: #27272a; border-left: 4px solid #6366f1; border-radius: 6px; padding: 16px; margin: 18px 0; font-size: 14px; color: #f4f4f5; line-height: 1.6; white-space: pre-wrap; }}
            .btn-container {{ text-align: center; margin: 28px 0 12px 0; }}
            .btn {{ display: inline-block; background-color: #6366f1; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }}
            .footer {{ border-top: 1px solid #27272a; padding: 20px 32px; font-size: 12px; color: #71717a; text-align: center; background-color: #121215; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="top-bar"></div>
            <div class="header">
              <span class="badge">📋 Task Assigned</span>
              <h1 class="title">{task.title}</h1>
              <p class="subtitle">Assigned to <strong>{assignee_name}</strong> by <strong>{creator_name}</strong>.</p>
            </div>

            <div class="content">
              <div class="details-box">
                <div class="row">
                  <span class="label">Task Title:</span>
                  <span class="val">{task.title}</span>
                </div>
                <div class="row">
                  <span class="label">Priority:</span>
                  <span class="val">{priority_str}</span>
                </div>
                <div class="row">
                  <span class="label">Status:</span>
                  <span class="val">{status_str}</span>
                </div>
                <div class="row">
                  <span class="label">Due Date:</span>
                  <span class="val">{due_str}</span>
                </div>
                <div class="row" style="margin-bottom: 0;">
                  <span class="label">Assigned By:</span>
                  <span class="val">{creator_name}</span>
                </div>
              </div>

              <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Task Description:</div>
              <div class="summary-box">{task.description or 'No description provided.'}</div>

              <div class="btn-container">
                <a href="{task_url}" class="btn">View & Manage Task ↗</a>
              </div>
            </div>

            <div class="footer">
              Mintana CRM • Automated Task Management System
            </div>
          </div>
        </body>
        </html>
        """

        sent = email_service.send_email(
            subject=subject,
            body=body,
            recipients=[assignee.email],
            html_body=html_body,
            fail_silently=False
        )
        if sent:
            logger.info(f"[Task Notification] Staff assignment email dispatched to {assignee.email} for task '{task.title}'")
    except Exception as e:
        logger.error(f"[Task Notification Error] Failed sending creation email for task #{task.id}: {e}")


def send_task_completed_admin_email(task: Task):
    """
    Sends email notification to all organization admin users when a task is completed (status -> DONE).
    Runs in background job with try-catch safety.
    """
    try:
        admins = User.objects.filter(
            organization=task.organization,
            role=User.ADMIN,
            is_active=True
        ).exclude(email='')

        admin_emails = [admin.email for admin in admins if admin.email]
        if not admin_emails:
            logger.info(f"[Task Notification] No active admin emails found for org {task.organization}. Skipping completion alert.")
            return

        completed_by_name = (
            f"{task.assignee.first_name} {task.assignee.last_name}".strip()
            if task.assignee and (task.assignee.first_name or task.assignee.last_name)
            else (task.assignee.email if task.assignee else "Staff Member")
        )

        subject = f"✅ Task Completed: {task.title}"
        completion_time = timezone.now().strftime('%Y-%m-%d %H:%M UTC')

        body = (
            f"Notice: A task has been marked as COMPLETED in your organization.\n\n"
            f"Completed Task Details:\n"
            f"• Task Title: {task.title}\n"
            f"• Completed By (Assignee): {completed_by_name}\n"
            f"• Priority: {task.priority}\n"
            f"• Completion Time: {completion_time}\n"
            f"• Description: {task.description or 'No description provided.'}\n\n"
            f"Log into the Mintana CRM workspace to review the task."
        )

        app_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        task_url = f"{app_url}/tasks"

        # HTML Email Template
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px 12px; }}
            .card {{ max-width: 580px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }}
            .top-bar {{ background: linear-gradient(90deg, #10b981, #059669); padding: 4px; }}
            .header {{ padding: 28px 32px 16px 32px; }}
            .badge {{ display: inline-block; padding: 4px 10px; background-color: #065f46; color: #6ee7b7; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
            .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }}
            .subtitle {{ font-size: 13px; color: #a1a1aa; margin: 0; }}
            .content {{ padding: 0 32px 32px 32px; }}
            .details-box {{ background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .row {{ display: flex; margin-bottom: 10px; font-size: 13px; }}
            .label {{ font-weight: 700; color: #71717a; width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; flex-shrink: 0; }}
            .val {{ color: #e4e4e7; font-weight: 600; }}
            .summary-box {{ background-color: #27272a; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin: 18px 0; font-size: 14px; color: #f4f4f5; line-height: 1.6; white-space: pre-wrap; }}
            .btn-container {{ text-align: center; margin: 28px 0 12px 0; }}
            .btn {{ display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }}
            .footer {{ border-top: 1px solid #27272a; padding: 20px 32px; font-size: 12px; color: #71717a; text-align: center; background-color: #121215; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="top-bar"></div>
            <div class="header">
              <span class="badge">✅ Task Completed</span>
              <h1 class="title">{task.title}</h1>
              <p class="subtitle">Completed by <strong>{completed_by_name}</strong> at {completion_time}.</p>
            </div>

            <div class="content">
              <div class="details-box">
                <div class="row">
                  <span class="label">Task Title:</span>
                  <span class="val">{task.title}</span>
                </div>
                <div class="row">
                  <span class="label">Completed By:</span>
                  <span class="val">{completed_by_name}</span>
                </div>
                <div class="row">
                  <span class="label">Priority:</span>
                  <span class="val">{task.priority}</span>
                </div>
                <div class="row" style="margin-bottom: 0;">
                  <span class="label">Completion Time:</span>
                  <span class="val">{completion_time}</span>
                </div>
              </div>

              <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Task Description:</div>
              <div class="summary-box">{task.description or 'No description provided.'}</div>

              <div class="btn-container">
                <a href="{task_url}" class="btn">Review Task Workspace ↗</a>
              </div>
            </div>

            <div class="footer">
              Mintana CRM • Automated Task Management System
            </div>
          </div>
        </body>
        </html>
        """

        sent = email_service.send_email(
            subject=subject,
            body=body,
            recipients=admin_emails,
            html_body=html_body,
            fail_silently=False
        )
        if sent:
            logger.info(f"[Task Notification] Task completion email dispatched to admins {admin_emails} for task '{task.title}'")
    except Exception as e:
        logger.error(f"[Task Notification Error] Failed sending completion email for task #{task.id}: {e}")


@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance, **kwargs):
    try:
        if instance.pk:
            old_task = Task.objects.get(pk=instance.pk)
            instance._old_status = old_task.status
            instance._old_assignee_id = old_task.assignee_id
        else:
            instance._old_status = None
            instance._old_assignee_id = None
    except Exception as e:
        logger.warning(f"[Task Pre-Save Exception] Could not retrieve previous task state: {e}")
        instance._old_status = None
        instance._old_assignee_id = None


@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    try:
        if created:
            # Task created -> Dispatch email to assigned staff member asynchronously
            dispatch_async(send_task_created_staff_email, instance)
        else:
            old_status = getattr(instance, '_old_status', None)
            old_assignee_id = getattr(instance, '_old_assignee_id', None)

            # Task reassigned to a new staff member on update -> Dispatch email
            if instance.assignee_id and instance.assignee_id != old_assignee_id:
                dispatch_async(send_task_created_staff_email, instance)

            # Task completed -> Dispatch email to all admins asynchronously
            if old_status != Task.DONE and instance.status == Task.DONE:
                dispatch_async(send_task_completed_admin_email, instance)
    except Exception as e:
        logger.error(f"[Task Post-Save Exception] Error initiating async email task: {e}")
