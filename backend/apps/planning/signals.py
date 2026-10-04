import logging
import threading
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

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
    Sends email notification to the assigned staff member when a task is created.
    Runs in background job with try-catch wrapper.
    """
    try:
        assignee = task.assignee
        if not assignee or not assignee.email:
            logger.info(f"[Task Notification] Task #{task.id} has no assigned staff email. Skipping creation alert.")
            return

        subject = f"📋 New Task Assigned: {task.title}"
        due_str = task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'No due date specified'
        creator_name = (
            f"{task.created_by.first_name} {task.created_by.last_name}".strip()
            if task.created_by and (task.created_by.first_name or task.created_by.last_name)
            else (task.created_by.email if task.created_by else "System Administrator")
        )

        body = (
            f"Hello {assignee.first_name or 'Team Member'},\n\n"
            f"A new task has been created and assigned to you in Mintana CRM:\n\n"
            f"Task Details:\n"
            f"• Title: {task.title}\n"
            f"• Priority: {task.priority}\n"
            f"• Status: {task.status}\n"
            f"• Due Date: {due_str}\n"
            f"• Assigned By: {creator_name}\n"
            f"• Description: {task.description or 'No description provided.'}\n\n"
            f"Please log into your Mintana CRM workspace to manage this task.\n\n"
            f"Best regards,\nMintana CRM Automated Systems"
        )

        sent = email_service.send_email(
            subject=subject,
            body=body,
            recipients=[assignee.email],
            fail_silently=True
        )
        if sent:
            logger.info(f"[Task Notification] Staff assignment email dispatched to {assignee.email} for task '{task.title}'")
    except Exception as e:
        logger.error(f"[Task Notification Error] Failed sending creation email for task #{task.id}: {e}")


def send_task_completed_admin_email(task: Task):
    """
    Sends email notification to all organization admin users when a task is completed (status -> DONE).
    Runs in background job with try-catch wrapper.
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

        sent = email_service.send_email(
            subject=subject,
            body=body,
            recipients=admin_emails,
            fail_silently=True
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

