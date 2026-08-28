from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from apps.accounts.models import Organization, User
from apps.crm.models import Contact, LeadLifecycleRule, Stage
from apps.planning.models import Task, Activity

class Command(BaseCommand):
    help = "Process automated lead lifecycle rules for organizations with lifecycle timers enabled."

    def handle(self, *args, **options):
        # 1. Fetch organizations with timer enabled
        enabled_orgs = Organization.objects.filter(lead_lifecycle_timer_enabled=True)
        self.stdout.write(f"Loaded {enabled_orgs.count()} organizations with active lead lifecycle timers.")

        for org in enabled_orgs:
            self.stdout.write(f"Processing organization: {org.name}")

            # 2. Get active lead contacts
            active_leads = Contact.objects.filter(
                organization=org,
                status=Contact.LEAD,
                is_active_lead=True,
                lifecycle_started_at__isnull=False
            )

            # 3. Get rules for this org
            rules = LeadLifecycleRule.objects.filter(organization=org).order_by('day')
            if not rules.exists():
                self.stdout.write(f"No lifecycle rules configured for {org.name}. Skipping.")
                continue

            for contact in active_leads:
                # Calculate elapsed days adjusted for extensions
                elapsed_duration = timezone.now() - contact.lifecycle_started_at
                days_elapsed = elapsed_duration.days
                effective_days = days_elapsed - contact.lifecycle_extension_days

                if effective_days < 0:
                    effective_days = 0

                executed_rules = contact.custom_fields.setdefault('executed_rules', [])

                for rule in rules:
                    # Run rules that match or lie behind current timeline
                    if effective_days >= rule.day and str(rule.id) not in executed_rules:
                        self.process_rule(contact, rule)
                        executed_rules.append(str(rule.id))
                        contact.save()

        self.stdout.write(self.style.SUCCESS("Lead lifecycle processing completed successfully."))

    def process_rule(self, contact, rule):
        self.stdout.write(f"Executing Rule {rule.action_type} for Lead {contact.first_name} {contact.last_name} (effective day {rule.day})")

        # 1. CREATE_TASK
        if rule.action_type == LeadLifecycleRule.CREATE_TASK:
            title = rule.config.get('task_title', f"Follow-up lead: {contact.first_name} {contact.last_name}")
            description = rule.config.get('task_description', "Automated lead lifecycle task.")
            priority = rule.config.get('priority', 'HIGH')
            assignee = contact.assigned_to

            # Default to organization administrator if contact is unassigned
            if not assignee:
                assignee = User.objects.filter(organization=contact.organization, role=User.ADMIN).first()

            Task.objects.create(
                organization=contact.organization,
                title=title,
                description=description,
                priority=priority,
                assignee=assignee,
                contact=contact,
                due_date=timezone.now() + timedelta(days=2)
            )
            # Log Activity Note
            Activity.objects.create(
                organization=contact.organization,
                type=Activity.NOTE,
                content=f"Automated Action: Created follow-up task '{title}' assigned to {assignee.first_name if assignee else 'Unassigned'}.",
                activity_date=timezone.now(),
                contact=contact
            )

        # 2. NOTIFY_EMPLOYEE
        elif rule.action_type == LeadLifecycleRule.NOTIFY_EMPLOYEE:
            if contact.assigned_to and contact.assigned_to.email:
                subject = rule.config.get('subject', f"🔔 Automated Lead Reminder: {contact.first_name} {contact.last_name}")
                body = rule.config.get('body', f"Lead {contact.first_name} {contact.last_name} requires immediate follow-up. Effective lifecycle status day {rule.day}.")
                try:
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'crm@mintana.com'),
                        recipient_list=[contact.assigned_to.email],
                        fail_silently=False
                    )
                    Activity.objects.create(
                        organization=contact.organization,
                        type=Activity.NOTE,
                        content=f"Automated Action: Sent notification email to assigned employee '{contact.assigned_to.email}'.",
                        activity_date=timezone.now(),
                        contact=contact
                    )
                except Exception as e:
                    self.stderr.write(f"Email failed: {str(e)}")

        # 3. NOTIFY_MANAGER
        elif rule.action_type == LeadLifecycleRule.NOTIFY_MANAGER:
            # Send notification to organization admins
            admins = User.objects.filter(organization=contact.organization, role=User.ADMIN)
            admin_emails = [admin.email for admin in admins if admin.email]
            if admin_emails:
                subject = rule.config.get('subject', f"⚠️ Manager Escalation: Idle Lead {contact.first_name} {contact.last_name}")
                body = rule.config.get('body', f"Lead {contact.first_name} {contact.last_name} (assigned to {contact.assigned_to.first_name if contact.assigned_to else 'Unassigned'}) has been idle for {rule.day} effective days.")
                try:
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'crm@mintana.com'),
                        recipient_list=admin_emails,
                        fail_silently=False
                    )
                    Activity.objects.create(
                        organization=contact.organization,
                        type=Activity.NOTE,
                        content=f"Automated Action: Escalated idle lead status to managers: {', '.join(admin_emails)}.",
                        activity_date=timezone.now(),
                        contact=contact
                    )
                except Exception as e:
                    self.stderr.write(f"Email escalation failed: {str(e)}")

        # 4. CHANGE_STAGE
        elif rule.action_type == LeadLifecycleRule.CHANGE_STAGE:
            stage_id = rule.config.get('stage_id')
            if stage_id:
                stage = Stage.objects.filter(id=stage_id, organization=contact.organization).first()
                if stage:
                    old_stage_name = contact.stage.name if contact.stage else "None"
                    contact.stage = stage
                    Activity.objects.create(
                        organization=contact.organization,
                        type=Activity.NOTE,
                        content=f"Automated Action: Lead stage moved from '{old_stage_name}' to '{stage.name}'.",
                        activity_date=timezone.now(),
                        contact=contact
                    )

        # 5. MARK_INACTIVE
        elif rule.action_type == LeadLifecycleRule.MARK_INACTIVE:
            contact.is_active_lead = False
            contact.lifecycle_status = 'INACTIVE'
            Activity.objects.create(
                organization=contact.organization,
                type=Activity.NOTE,
                content=f"Automated Action: Lead marked as INACTIVE (effective day {rule.day}). Lifecycle timer stopped.",
                activity_date=timezone.now(),
                contact=contact
            )
