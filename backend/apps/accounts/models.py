from django.db import models
from django.contrib.auth.models import AbstractUser
from apps.common.models import TimeStampedModel

class Organization(TimeStampedModel):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, unique=True, null=True, blank=True)
    api_key = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)

    def __str__(self):
        return self.name

class User(AbstractUser, TimeStampedModel):
    ADMIN = 'ADMIN'
    SALES_REP = 'SALES_REP'
    
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
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
    phone = models.CharField(max_length=20, null=True, blank=True)

    # We need to resolve field conflicts with standard User groups/permissions due to inheriting from both AbstractUser and having TimeStampedModel's UUID PK
    class Meta:
        db_table = 'auth_user'

    def __str__(self):
        return f"{self.email} ({self.role})"
