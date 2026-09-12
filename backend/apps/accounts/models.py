from django.db import models
from django.contrib.auth.models import AbstractUser
from apps.common.models import TimeStampedModel

class Organization(TimeStampedModel):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, unique=True, null=True, blank=True)
    api_key = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    
    # Custom vision setting fields
    logo = models.TextField(null=True, blank=True)
    industry = models.CharField(max_length=150, null=True, blank=True)
    country = models.CharField(max_length=150, null=True, blank=True)
    currency = models.CharField(max_length=10, default='USD')
    timezone = models.CharField(max_length=100, default='UTC')
    business_email = models.EmailField(null=True, blank=True)
    business_phone = models.CharField(max_length=50, null=True, blank=True)
    other_info = models.TextField(null=True, blank=True)

    # Lead lifecycle settings
    lead_lifecycle_timer_enabled = models.BooleanField(default=False)
    default_lead_lifecycle_days = models.IntegerField(default=30)

    # Exchange & Delivery Rate Settings
    gbp_to_ngn_rate = models.DecimalField(max_digits=12, decimal_places=2, default=2000.00, null=True, blank=True)
    parcel_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    doorstep_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    per_kg_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)


    def __str__(self):
        return self.name

class Role(TimeStampedModel):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='custom_roles')
    name = models.CharField(max_length=255)
    permissions = models.JSONField(default=dict)  # e.g., {"contacts": ["view", "create", "edit", "delete", "export"]}

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

class Department(TimeStampedModel):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)
    manager = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_departments')

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

class Team(TimeStampedModel):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='teams')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=255)
    manager = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_teams')

    def __str__(self):
        return f"{self.name} ({self.department.name})"

class User(AbstractUser, TimeStampedModel):
    ADMIN = 'ADMIN'
    MANAGER = 'MANAGER'
    SALES_REP = 'SALES_REP'
    
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (MANAGER, 'Manager'),
        (SALES_REP, 'Sales Representative'),
    ]

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='users'
    )
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default=SALES_REP)
    custom_role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    phone = models.CharField(max_length=20, null=True, blank=True)

    # We need to resolve field conflicts with standard User groups/permissions due to inheriting from both AbstractUser and having TimeStampedModel's UUID PK
    class Meta:
        db_table = 'auth_user'

    def __str__(self):
        return f"{self.email} ({self.role})"

