from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.crm.models import Deal, Contact, WhatsAppMessage
from apps.planning.models import Activity
from apps.crm.notifications import (
    send_deal_closed_won_notifications,
    send_contact_assignment_email
)

def run_automation_rules(organization, event_trigger, context_obj, old_value=None, new_value=None):
    from apps.crm.models import AutomationRule, Notification
    from apps.planning.models import Task
    from apps.accounts.models import User
    
    rules = AutomationRule.objects.filter(organization=organization, event_trigger=event_trigger, is_active=True)
    for rule in rules:
        match = True
        conditions = rule.conditions or {}
        
        # Condition Check
        if event_trigger == 'DEAL_STAGE_CHANGE':
            if 'stage_id' in conditions and str(new_value) != str(conditions['stage_id']):
                match = False
        elif event_trigger == 'DEAL_VALUE_LARGE':
            limit = conditions.get('min_value', 10000)
            if float(context_obj.value) < float(limit):
                match = False
                
        if not match:
            continue
            
        # Execute Actions
        for action in rule.actions or []:
            action_type = action.get('type')
            config = action.get('config', {})
            
            if action_type == 'CREATE_NOTIFICATION':
                user = getattr(context_obj, 'assigned_to', None) or getattr(context_obj, 'manager', None)
                if not user and hasattr(context_obj, 'contact'):
                    user = getattr(context_obj.contact, 'assigned_to', None)
                if not user:
                    # Fallback to organization admin or first user
                    user = User.objects.filter(organization=organization).first()
                Notification.objects.create(
                    organization=organization,
                    user=user,
                    title=config.get('title', f"Automation: {rule.name}"),
                    message=config.get('message', f"Conditions met for {context_obj.title if hasattr(context_obj, 'title') else context_obj}"),
                    notification_type='SYSTEM',
                    is_read=False
                )
            elif action_type == 'CREATE_TASK':
                assignee_id = config.get('assignee_id')
                assignee = None
                if assignee_id:
                    assignee = User.objects.filter(id=assignee_id, organization=organization).first()
                if not assignee:
                    assignee = getattr(context_obj, 'assigned_to', None)
                if not assignee:
                    assignee = User.objects.filter(organization=organization).first()
                    
                Task.objects.create(
                    organization=organization,
                    assignee=assignee,
                    title=config.get('title', f"Auto-Task: {rule.name}"),
                    description=config.get('description', f"Automation task for {context_obj.title if hasattr(context_obj, 'title') else context_obj}"),
                    due_date=timezone.now() + timezone.timedelta(days=int(config.get('days_to_due', 2))),
                    priority=config.get('priority', 'MEDIUM'),
                    status='TODO'
                )

@receiver(pre_save, sender=Deal)
def deal_pre_save(sender, instance, **kwargs):
    # Store old stage and value/status to compare in post_save
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
        Activity.objects.create(
            organization=instance.organization,
            type=Activity.NOTE,
            content=f"Deal created: '{instance.title}' with value ${instance.value}.",
            activity_date=timezone.now(),
            deal=instance,
            contact=instance.contact,
            company=instance.company
        )
        if instance.value >= 10000:
            from apps.crm.notifications import trigger_external_webhook
            trigger_external_webhook(instance, event_type="LEAD_CAPTURED")
            run_automation_rules(instance.organization, 'DEAL_VALUE_LARGE', instance)
    else:
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
            if instance.status == Deal.WON:
                send_deal_closed_won_notifications(instance)
            run_automation_rules(instance.organization, 'DEAL_STAGE_CHANGE', instance, old_value=old_stage_id, new_value=instance.stage_id)

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
            if instance.value >= 10000 and old_value < 10000:
                run_automation_rules(instance.organization, 'DEAL_VALUE_LARGE', instance)

@receiver(pre_save, sender=Contact)
def contact_pre_save(sender, instance, **kwargs):
    if instance.status == Contact.LEAD and not instance.lifecycle_started_at:
        instance.lifecycle_started_at = timezone.now()

    if instance.pk:
        try:
            old_instance = Contact.objects.get(pk=instance.pk)
            instance._old_assigned_to_id = old_instance.assigned_to_id
            instance._old_assigned_to_name = (
                f"{old_instance.assigned_to.first_name} {old_instance.assigned_to.last_name}"
                if old_instance.assigned_to else "Unassigned"
            )
            instance._old_status = old_instance.status
        except Contact.DoesNotExist:
            instance._old_assigned_to_id = None
            instance._old_assigned_to_name = None
            instance._old_status = None
    else:
        instance._old_assigned_to_id = None
        instance._old_assigned_to_name = None
        instance._old_status = None

@receiver(post_save, sender=Contact)
def contact_post_save(sender, instance, created, **kwargs):
    if created:
        run_automation_rules(instance.organization, 'NEW_LEAD', instance)
    else:
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
            if instance.assigned_to:
                send_contact_assignment_email(instance)


@receiver(post_save, sender=WhatsAppMessage)
def whatsapp_msg_post_save(sender, instance, created, **kwargs):
    if created and instance.sender_type == 'CUSTOMER':
        org = instance.conversation.whatsapp_account.organization
        run_automation_rules(org, 'WHATSAPP_RECEIVED', instance)

