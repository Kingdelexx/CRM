from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.crm.models import Deal, Contact
from apps.planning.models import Activity
from apps.crm.notifications import (
    send_deal_closed_won_notifications,
    send_contact_assignment_email
)

@receiver(pre_save, sender=Deal)
def deal_pre_save(sender, instance, **kwargs):
    # Store old values on the instance to compare in post_save
    if instance.pk:
        try:
            old_instance = Deal.objects.get(pk=instance.pk)
            instance._old_stage_name = old_instance.stage.name if old_instance.stage else None
            instance._old_stage_id = old_instance.stage_id
            instance._old_value = old_instance.value
            instance._old_status = old_instance.status
        except Deal.DoesNotExist:
            instance._old_stage_name = None
            instance._old_stage_id = None
            instance._old_value = None
            instance._old_status = None
    else:
        instance._old_stage_name = None
        instance._old_stage_id = None
        instance._old_value = None
        instance._old_status = None

@receiver(post_save, sender=Deal)
def deal_post_save(sender, instance, created, **kwargs):
    if created:
        # Create initial activity
        Activity.objects.create(
            organization=instance.organization,
            type=Activity.NOTE,
            content=f"Deal created: '{instance.title}' with value ${instance.value} in stage '{instance.stage.name if instance.stage else 'N/A'}'.",
            activity_date=timezone.now(),
            deal=instance,
            contact=instance.contact,
            company=instance.company
        )
        # Check if new deal is high value
        if instance.value >= 10000:
            from apps.crm.notifications import trigger_external_webhook
            trigger_external_webhook(instance, event_type="LEAD_CAPTURED")
    else:
        # Check for stage change
        old_stage_id = getattr(instance, '_old_stage_id', None)
        if old_stage_id and old_stage_id != instance.stage_id:
            old_stage_name = getattr(instance, '_old_stage_name', 'N/A')
            new_stage_name = instance.stage.name if instance.stage else 'N/A'
            Activity.objects.create(
                organization=instance.organization,
                type=Activity.NOTE,
                content=f"Stage updated from '{old_stage_name}' to '{new_stage_name}'.",
                activity_date=timezone.now(),
                deal=instance,
                contact=instance.contact,
                company=instance.company
            )
            
            # If changed to WON (Closed Won)
            if instance.status == Deal.WON:
                send_deal_closed_won_notifications(instance)

        # Check for status change
        old_status = getattr(instance, '_old_status', None)
        if old_status and old_status != instance.status:
            Activity.objects.create(
                organization=instance.organization,
                type=Activity.NOTE,
                content=f"Deal status updated from {old_status} to {instance.status}.",
                activity_date=timezone.now(),
                deal=instance,
                contact=instance.contact,
                company=instance.company
            )
            if instance.status == Deal.WON and old_status != Deal.WON:
                send_deal_closed_won_notifications(instance)

        # Check for value change
        old_value = getattr(instance, '_old_value', None)
        if old_value is not None and old_value != instance.value:
            Activity.objects.create(
                organization=instance.organization,
                type=Activity.NOTE,
                content=f"Deal value changed from ${old_value} to ${instance.value}.",
                activity_date=timezone.now(),
                deal=instance,
                contact=instance.contact,
                company=instance.company
            )

@receiver(pre_save, sender=Contact)
def contact_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Contact.objects.get(pk=instance.pk)
            instance._old_assigned_to_id = old_instance.assigned_to_id
            instance._old_assigned_to_name = (
                f"{old_instance.assigned_to.first_name} {old_instance.assigned_to.last_name}"
                if old_instance.assigned_to else "Unassigned"
            )
        except Contact.DoesNotExist:
            instance._old_assigned_to_id = None
            instance._old_assigned_to_name = None
    else:
        instance._old_assigned_to_id = None
        instance._old_assigned_to_name = None

@receiver(post_save, sender=Contact)
def contact_post_save(sender, instance, created, **kwargs):
    if not created:
        old_assigned_to_id = getattr(instance, '_old_assigned_to_id', None)
        if old_assigned_to_id != instance.assigned_to_id:
            new_assignee_name = (
                f"{instance.assigned_to.first_name} {instance.assigned_to.last_name}"
                if instance.assigned_to else "Unassigned"
            )
            old_assignee_name = getattr(instance, '_old_assigned_to_name', 'Unassigned')
            Activity.objects.create(
                organization=instance.organization,
                type=Activity.NOTE,
                content=f"Contact owner changed from {old_assignee_name} to {new_assignee_name}.",
                activity_date=timezone.now(),
                contact=instance,
                company=instance.company
            )
            
            # Send Notification for assigned rep
            if instance.assigned_to:
                send_contact_assignment_email(instance)
