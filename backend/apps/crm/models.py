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
