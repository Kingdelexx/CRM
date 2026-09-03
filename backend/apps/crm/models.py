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
    custom_fields = models.JSONField(default=dict, blank=True, null=True)

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
    country = models.CharField(max_length=100, null=True, blank=True)

    # Lead lifecycle tracking fields
    lifecycle_started_at = models.DateTimeField(null=True, blank=True)
    lifecycle_extension_days = models.IntegerField(default=0)
    lifecycle_status = models.CharField(max_length=50, default='ACTIVE')
    is_active_lead = models.BooleanField(default=True)
    
    custom_fields = models.JSONField(default=dict, blank=True, null=True)

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
    custom_fields = models.JSONField(default=dict, blank=True, null=True)

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
    description = models.TextField(null=True, blank=True)
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
    members = models.ManyToManyField(
        User,
        related_name='joined_projects',
        blank=True
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    progress = models.IntegerField(default=0)
    custom_fields = models.JSONField(default=dict, blank=True, null=True)

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


class Pipeline(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='pipelines'
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class CustomFieldDefinition(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='custom_field_definitions'
    )
    model_name = models.CharField(max_length=50) # 'CONTACT', 'DEAL', 'COMPANY', 'PROJECT'
    name = models.CharField(max_length=100)
    label = models.CharField(max_length=100)
    type = models.CharField(max_length=50) # 'TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'DROPDOWN', 'CHECKBOX'
    config = models.JSONField(default=dict, blank=True)
    required = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.model_name}:{self.name} ({self.organization.name})"


class Report(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    name = models.CharField(max_length=255)
    base_module = models.CharField(max_length=100) # 'EMPLOYEES', 'TASKS', 'LEADS', 'CUSTOMERS', 'DEALS', 'PROJECTS', 'ACTIVITIES', 'CUSTOM_MODULES'
    filters = models.JSONField(default=dict, blank=True)
    display_type = models.CharField(max_length=50, default='TABLE') # 'TABLE', 'CHART', 'NUMBER', 'PERCENTAGE'
    scheduled_cron = models.CharField(max_length=255, null=True, blank=True)
    recipients = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class EmailAccount(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='email_accounts'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='email_accounts'
    )
    email_address = models.EmailField()
    provider = models.CharField(max_length=50) # 'GMAIL', 'OUTLOOK', 'BUSINESS'
    is_connected = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.email_address} ({self.provider})"


class WhatsAppAccount(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='whatsapp_accounts'
    )
    phone_number = models.CharField(max_length=50)
    display_name = models.CharField(max_length=255)
    is_connected = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.display_name} ({self.phone_number})"


class WhatsAppConversation(TimeStampedModel):
    whatsapp_account = models.ForeignKey(
        WhatsAppAccount,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='whatsapp_conversations'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(max_length=50, default='OPEN') # 'OPEN', 'COMPLETED'

    def __str__(self):
        return f"Chat-{self.id} with {self.contact.first_name if self.contact else 'Unknown'}"


class WhatsAppMessage(TimeStampedModel):
    conversation = models.ForeignKey(
        WhatsAppConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender_type = models.CharField(max_length=20) # 'CUSTOMER', 'AGENT'
    sender_name = models.CharField(max_length=255)
    text = models.TextField()

    def __str__(self):
        return f"Msg from {self.sender_name} at {self.created_at}"


class AutomationRule(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='automations'
    )
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    event_trigger = models.CharField(max_length=100) # 'LEAD_CREATED', 'DEAL_WON', 'LEAD_DAY_30'
    conditions = models.JSONField(default=dict, blank=True)
    actions = models.JSONField(default=list)

    def __str__(self):
        return f"{self.name} - Trigger:{self.event_trigger}"


class Notification(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50) # 'NEW_TASK', 'TASK_ASSIGNED', 'TASK_OVERDUE', etc.
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} for {self.user.email}"


class NotificationPreference(TimeStampedModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preference'
    )
    email_new_task = models.BooleanField(default=True)
    in_app_new_task = models.BooleanField(default=True)
    email_task_assigned = models.BooleanField(default=True)
    in_app_task_assigned = models.BooleanField(default=True)
    email_task_overdue = models.BooleanField(default=True)
    in_app_task_overdue = models.BooleanField(default=True)
    email_new_lead = models.BooleanField(default=True)
    in_app_new_lead = models.BooleanField(default=True)
    email_new_customer = models.BooleanField(default=True)
    in_app_new_customer = models.BooleanField(default=True)
    email_new_message = models.BooleanField(default=True)
    in_app_new_message = models.BooleanField(default=True)
    email_new_email = models.BooleanField(default=True)
    in_app_new_email = models.BooleanField(default=True)
    email_mention = models.BooleanField(default=True)
    in_app_mention = models.BooleanField(default=True)
    email_approval_request = models.BooleanField(default=True)
    in_app_approval_request = models.BooleanField(default=True)
    email_automation = models.BooleanField(default=True)
    in_app_automation = models.BooleanField(default=True)
    email_upcoming_deadline = models.BooleanField(default=True)
    in_app_upcoming_deadline = models.BooleanField(default=True)

    def __str__(self):
        return f"Prefs for {self.user.email}"


class ApprovalWorkflow(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='approval_workflows'
    )
    name = models.CharField(max_length=255)
    steps = models.JSONField(default=list) # e.g. [{"type": "ROLE", "value": "MANAGER"}, {"type": "ROLE", "value": "FINANCE"}]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class ApprovalRequest(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='approval_requests'
    )
    workflow = models.ForeignKey(
        ApprovalWorkflow,
        on_delete=models.CASCADE,
        related_name='requests'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_approvals'
    )
    status = models.CharField(max_length=50, default='PENDING') # 'PENDING', 'APPROVED', 'REJECTED'
    current_step_index = models.IntegerField(default=0)
    history = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.title} - Status: {self.status}"


class Document(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_type = models.CharField(max_length=100, null=True, blank=True)
    file_size = models.IntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    task = models.ForeignKey(
        'planning.Task',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    custom_record = models.ForeignKey(
        CustomModuleRecord,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )

    def __str__(self):
        return f"{self.name} ({self.file_url})"


