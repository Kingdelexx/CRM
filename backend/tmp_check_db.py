import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.crm.models import Contact, Deal
from apps.planning.models import Activity

contact = Contact.objects.filter(email='tony@starkindustries.com').first()
if contact:
    deal = Deal.objects.filter(contact=contact).first()
    activities = Activity.objects.filter(contact=contact).order_by('created_at')

    print(f"Contact Name: {contact.first_name} {contact.last_name}")
    print(f"Contact Company: {contact.company.name if contact.company else 'None'}")
    print(f"Contact Email: {contact.email}")
    print(f"Contact Assignee: {contact.assigned_to.email if contact.assigned_to else 'None'}")
    if deal:
        print(f"Deal Title: {deal.title}")
        print(f"Deal Value: {deal.value}")
        print(f"Deal Stage: {deal.stage.name if deal.stage else 'None'}")
        print(f"Deal Status: {deal.status}")
    print("Activities:")
    for i, activity in enumerate(activities, 1):
        print(f"  {i}. Type={activity.type}, Content={activity.content}")
else:
    print("No contact found with email 'tony@starkindustries.com'")
