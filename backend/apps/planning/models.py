from django.db import models
from apps.common.models import TimeStampedModel
from apps.accounts.models import Organization, User

class Activity(TimeStampedModel):
    CALL = 'CALL'
    EMAIL = 'EMAIL'
    MEETING = 'MEETING'
    NOTE = 'NOTE'
    
    TYPE_CHOICES = [
        (CALL, 'Call'),
        (EMAIL, 'Email'),
        (MEETING, 'Meeting'),
        (NOTE, 'Note'),
    ]

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='activities'
    )
    performed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='activities',
        db_index=True
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, db_index=True)
    content = models.TextField()
    activity_date = models.DateTimeField(db_index=True)
    
    # Nullable associations
    deal = models.ForeignKey(
        'crm.Deal', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='activities'
    )
    contact = models.ForeignKey(
        'crm.Contact', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='activities'
    )
    company = models.ForeignKey(
        'crm.Company', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='activities'
    )

    class Meta:
        ordering = ['-activity_date']

    def __str__(self):
        return f"{self.type} - {self.activity_date.strftime('%Y-%m-%d')}"

class Task(TimeStampedModel):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    
    PRIORITY_CHOICES = [
        (LOW, 'Low'),
        (MEDIUM, 'Medium'),
        (HIGH, 'High'),
    ]

    TODO = 'TODO'
    IN_PROGRESS = 'IN_PROGRESS'
    DONE = 'DONE'
    
    STATUS_CHOICES = [
        (TODO, 'Todo'),
        (IN_PROGRESS, 'In Progress'),
        (DONE, 'Done'),
    ]

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='tasks'
    )
    assignee = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='tasks'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=50, choices=PRIORITY_CHOICES, default=MEDIUM)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=TODO)

    # Nullable associations
    deal = models.ForeignKey(
        'crm.Deal', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='tasks'
    )
    contact = models.ForeignKey(
        'crm.Contact', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='tasks'
    )
    company = models.ForeignKey(
        'crm.Company', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='tasks'
    )

    class Meta:
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return self.title
