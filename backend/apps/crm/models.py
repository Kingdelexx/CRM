from django.db import models
from apps.common.models import TimeStampedModel
from apps.accounts.models import Organization, User

class Company(TimeStampedModel):
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='companies'
    )
    name = models.CharField(max_length=255, db_index=True)
    domain = models.CharField(max_length=255, null=True, blank=True)
    industry = models.CharField(max_length=100, null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return self.name

class Stage(TimeStampedModel):
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='stages'
    )
    name = models.CharField(max_length=255)
    order = models.IntegerField(default=0, db_index=True)
    win_probability = models.IntegerField(default=0)  # 0 to 100 percentage
    pipeline_type = models.CharField(max_length=100, default='SALES', db_index=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.name

class Contact(TimeStampedModel):
    LEAD = 'LEAD'
    CONTACT = 'CONTACT'
    CUSTOMER = 'CUSTOMER'
    
    STATUS_CHOICES = [
        (LEAD, 'Lead'),
        (CONTACT, 'Contact'),
        (CUSTOMER, 'Customer'),
    ]

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='contacts'
    )
    company = models.ForeignKey(
        Company, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='contacts'
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    job_title = models.CharField(max_length=150, null=True, blank=True)
    status = models.CharField(max_length=100, choices=STATUS_CHOICES, default=LEAD, db_index=True)
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts',
        db_index=True
    )
    assigned_team = models.ForeignKey(
        'accounts.Team',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts',
        db_index=True
    )
    stage = models.ForeignKey(
        Stage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contacts',
        db_index=True
    )
    source = models.CharField(max_length=255, null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(null=True, blank=True)

    # Lead lifecycle tracking fields
    lifecycle_started_at = models.DateTimeField(null=True, blank=True)
    lifecycle_extension_days = models.IntegerField(default=0)
    lifecycle_status = models.CharField(max_length=50, default='ACTIVE')
    is_active_lead = models.BooleanField(default=True)
    
    custom_fields = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Deal(TimeStampedModel):
    OPEN = 'OPEN'
    WON = 'WON'
    LOST = 'LOST'
    
    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (WON, 'Won'),
        (LOST, 'Lost'),
    ]

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='deals'
    )
    contact = models.ForeignKey(
        Contact, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='deals'
    )
    company = models.ForeignKey(
        Company, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='deals'
    )
    stage = models.ForeignKey(
        Stage, 
        on_delete=models.PROTECT, 
        related_name='deals',
        db_index=True
    )
    title = models.CharField(max_length=255)
    value = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='USD')
    expected_close_date = models.DateField(null=True, blank=True)
    probability = models.IntegerField(default=0, null=True, blank=True)  # 0 to 100 percentage
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=OPEN, db_index=True)

    def __str__(self):
        return self.title

class Project(TimeStampedModel):
    PLANNING = 'PLANNING'
    IN_PROGRESS = 'IN_PROGRESS'
    READY = 'READY'
    DELIVERED = 'DELIVERED'
    
    STATUS_CHOICES = [
        (PLANNING, 'Planning'),
        (IN_PROGRESS, 'In Progress'),
        (READY, 'Ready'),
        (DELIVERED, 'Delivered'),
    ]

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='projects'
    )
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=PLANNING)
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects'
    )
    deal = models.ForeignKey(
        Deal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects'
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name

class LeadLifecycleRule(TimeStampedModel):
    CREATE_TASK = 'CREATE_TASK'
    NOTIFY_EMPLOYEE = 'NOTIFY_EMPLOYEE'
    NOTIFY_MANAGER = 'NOTIFY_MANAGER'
    CHANGE_STAGE = 'CHANGE_STAGE'
    MARK_INACTIVE = 'MARK_INACTIVE'

    ACTION_CHOICES = [
        (CREATE_TASK, 'Create Task'),
        (NOTIFY_EMPLOYEE, 'Notify Employee'),
        (NOTIFY_MANAGER, 'Notify Manager'),
        (CHANGE_STAGE, 'Change Stage'),
        (MARK_INACTIVE, 'Mark Inactive'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='lead_lifecycle_rules'
    )
    day = models.IntegerField(db_index=True)
    action_type = models.CharField(max_length=100, choices=ACTION_CHOICES)
    config = models.JSONField(default=dict, blank=True)  # e.g., {"task_title": "Contact Customer", "stage_id": "..."}

    class Meta:
        ordering = ['day']

    def __str__(self):
        return f"Day {self.day} - {self.action_type} ({self.organization.name})"

class CustomerList(TimeStampedModel):
    STATIC = 'STATIC'
    SMART = 'SMART'

    LIST_TYPE_CHOICES = [
        (STATIC, 'Static'),
        (SMART, 'Smart'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='customer_lists'
    )
    name = models.CharField(max_length=255)
    list_type = models.CharField(max_length=50, choices=LIST_TYPE_CHOICES, default=STATIC)
    rules = models.JSONField(default=dict, blank=True)  # e.g., {"last_purchase_month": 8, "purchased_product": "Product A", "inactive_days": 90}
    contacts = models.ManyToManyField(
        Contact,
        related_name='customer_lists',
        blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.list_type})"


class CustomModule(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='custom_modules'
    )
    name = models.CharField(max_length=255)
    singular_name = models.CharField(max_length=255)
    icon = models.CharField(max_length=100, default='Grid')
    fields = models.JSONField(default=list)  # e.g., [{"name": "Property name", "type": "TEXT", "required": true}]

    class Meta:
        unique_together = ('organization', 'name')

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class CustomModuleRecord(TimeStampedModel):
    custom_module = models.ForeignKey(
        CustomModule,
        on_delete=models.CASCADE,
        related_name='records'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='custom_module_records'
    )
    data = models.JSONField(default=dict)

    def __str__(self):
        return f"Record for {self.custom_module.name} - {self.id}"

