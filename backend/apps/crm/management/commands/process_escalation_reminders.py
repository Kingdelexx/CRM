import logging
from django.core.management.base import BaseCommand
from apps.crm.notifications import run_escalation_reminder_job

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Process recurring 6-hour reminders for unresolved shipment escalations."

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=6,
            help='Threshold hours unresolved before sending reminder (default: 6).'
        )

    def handle(self, *args, **options):
        threshold_hours = options.get('hours', 6)
        self.stdout.write(f"Executing scheduled background job: process_escalation_reminders (threshold: {threshold_hours} hours)...")

        result = run_escalation_reminder_job(hours_threshold=threshold_hours)

        total = result.get('total_matching', 0)
        sent = result.get('sent', 0)
        failed = result.get('failed', 0)

        self.stdout.write(
            self.style.SUCCESS(
                f"Scheduler job finished. Total matching: {total} | Sent: {sent} | Failed: {failed}"
            )
        )
