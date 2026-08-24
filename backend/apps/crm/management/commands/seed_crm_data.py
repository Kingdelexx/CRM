from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import random

from apps.accounts.models import Organization, User
from apps.crm.models import Company, Stage, Contact, Deal
from apps.planning.models import Activity

class Command(BaseCommand):
    help = 'Seeds realistic multi-tenant development data for Mintana CRM.'

    def handle(self, *args, **options):
        self.stdout.write('Starting seeding process...')
        
        try:
            with transaction.atomic():
                # 1. Create or fetch our organization
                org, created = Organization.objects.get_or_create(
                    domain='mintana.com',
                    defaults={
                        'name': 'Mintana Technologies',
                        'api_key': 'mintana-test-api-key-12345'
                    }
                )
                if not created and not org.api_key:
                    org.api_key = 'mintana-test-api-key-12345'
                    org.save()
                
                # Cleanup existing tenant data to avoid duplicate key errors on rerun
                self.stdout.write(f'Cleaning up existing data for {org.name}...')
                Activity.objects.filter(organization=org).delete()
                Deal.objects.filter(organization=org).delete()
                Contact.objects.filter(organization=org).delete()
                Company.objects.filter(organization=org).delete()
                Stage.objects.filter(organization=org).delete()
                User.objects.filter(organization=org).delete()
                
                # Re-fetch/create Org if needed
                org, _ = Organization.objects.get_or_create(
                    domain='mintana.com',
                    defaults={'name': 'Mintana Technologies'}
                )

                # 2. Create Users
                self.stdout.write('Creating users...')
                admin = User.objects.create_user(
                    username='admin@mintana.com',
                    email='admin@mintana.com',
                    password='adminpassword123',
                    first_name='Sarah',
                    last_name='Connor',
                    role=User.ADMIN,
                    organization=org
                )
                
                rep1 = User.objects.create_user(
                    username='rep1@mintana.com',
                    email='rep1@mintana.com',
                    password='reppassword123',
                    first_name='John',
                    last_name='Doe',
                    role=User.SALES_REP,
                    organization=org
                )
                
                rep2 = User.objects.create_user(
                    username='rep2@mintana.com',
                    email='rep2@mintana.com',
                    password='reppassword123',
                    first_name='Jane',
                    last_name='Smith',
                    role=User.SALES_REP,
                    organization=org
                )

                # 3. Create Pipeline Stages
                self.stdout.write('Creating stages...')
                stage_data = [
                    ('Lead In', 1, 10, 'SALES'),
                    ('Contact Made', 2, 30, 'SALES'),
                    ('Demo Scheduled', 3, 50, 'SALES'),
                    ('Proposal Sent', 4, 70, 'SALES'),
                    ('Negotiation', 5, 90, 'SALES'),
                    ('Closed Won', 6, 100, 'SALES'),
                    ('Closed Lost', 7, 0, 'SALES'),
                ]
                
                stages = {}
                for name, order, prob, pipe_type in stage_data:
                    stage = Stage.objects.create(
                        organization=org,
                        name=name,
                        order=order,
                        win_probability=prob,
                        pipeline_type=pipe_type
                    )
                    stages[name] = stage

                # 4. Create Companies
                self.stdout.write('Creating companies...')
                companies = [
                    Company.objects.create(
                        organization=org,
                        name='Acme Corp',
                        domain='acme.dev',
                        industry='Hard Goods Manufacturing',
                        about='Global provider of specialized roadrunner traps and anvils.',
                        annual_revenue=25000000.00,
                        phone='+1 555-0101'
                    ),
                    Company.objects.create(
                        organization=org,
                        name='Globex Corporation',
                        domain='globex.com',
                        industry='Energy & High Tech',
                        about='Providing high-tech solutions and energy architecture globally.',
                        annual_revenue=67000000.00,
                        phone='+1 555-0202'
                    ),
                    Company.objects.create(
                        organization=org,
                        name='Initech Software',
                        domain='initech.corp',
                        industry='Technology Services',
                        about='Y2K remediation experts and creators of the TPS report format.',
                        annual_revenue=4800000.00,
                        phone='+1 555-0303'
                    )
                ]

                # 5. Create Contacts
                self.stdout.write('Creating contacts...')
                coyote = Contact.objects.create(
                    organization=org,
                    first_name='Wile E.',
                    last_name='Coyote',
                    email='wile@acme.dev',
                    phone='+1 555-4040',
                    job_title='Chief Trapper',
                    status=Contact.LEAD,
                    company=companies[0],
                    assigned_to=rep1,
                    custom_fields={'priority_acquisitions': ['Rocket Skates', 'TNT Crates']}
                )
                
                scorpio = Contact.objects.create(
                    organization=org,
                    first_name='Hank',
                    last_name='Scorpio',
                    email='hank@globex.com',
                    phone='+1 555-5050',
                    job_title='CEO & Visionary',
                    status=Contact.CONTACT,
                    company=companies[1],
                    assigned_to=rep2
                )
                
                gibbons = Contact.objects.create(
                    organization=org,
                    first_name='Peter',
                    last_name='Gibbons',
                    email='peter@initech.corp',
                    phone='+1 555-6060',
                    job_title='Systems Analyst',
                    status=Contact.CUSTOMER,
                    company=companies[2],
                    assigned_to=rep1,
                    custom_fields={'project_load': 'minimal'}
                )
                
                waddams = Contact.objects.create(
                    organization=org,
                    first_name='Milton',
                    last_name='Waddams',
                    email='milton@initech.corp',
                    phone='+1 555-7070',
                    job_title='Stapler Custodian',
                    status=Contact.LEAD,
                    company=companies[2],
                    assigned_to=rep2
                )
                
                alice = Contact.objects.create(
                    organization=org,
                    first_name='Alice',
                    last_name='Smith',
                    email='alice@acme.dev',
                    phone='+1 555-8080',
                    job_title='Procurement Officer',
                    status=Contact.CUSTOMER,
                    company=companies[0],
                    assigned_to=rep1
                )

                # 6. Create Deals
                self.stdout.write('Creating deals...')
                deal1 = Deal.objects.create(
                    organization=org,
                    title='Anvil Bulk Subscription',
                    value=45000.00,
                    currency='USD',
                    stage=stages['Lead In'],
                    contact=coyote,
                    company=companies[0],
                    expected_close_date=timezone.now().date() + timedelta(days=60),
                    probability=10,
                    status=Deal.OPEN
                )
                
                deal2 = Deal.objects.create(
                    organization=org,
                    title='Power Plant Digital Twin',
                    value=180000.00,
                    currency='USD',
                    stage=stages['Negotiation'],
                    contact=scorpio,
                    company=companies[1],
                    expected_close_date=timezone.now().date() + timedelta(days=30),
                    probability=90,
                    status=Deal.OPEN
                )
                
                deal3 = Deal.objects.create(
                    organization=org,
                    title='TPS Automation Service',
                    value=125000.00,
                    currency='USD',
                    stage=stages['Closed Won'],
                    contact=gibbons,
                    company=companies[2],
                    expected_close_date=timezone.now().date() - timedelta(days=15),
                    probability=100,
                    status=Deal.WON
                )
                
                deal4 = Deal.objects.create(
                    organization=org,
                    title='Office Supply Modernization',
                    value=8000.00,
                    currency='USD',
                    stage=stages['Demo Scheduled'],
                    contact=waddams,
                    company=companies[2],
                    expected_close_date=timezone.now().date() + timedelta(days=90),
                    probability=50,
                    status=Deal.OPEN
                )

                # 7. Create Activities
                self.stdout.write('Logging activities...')
                activities = [
                    Activity.objects.create(
                        organization=org,
                        performed_by=rep1,
                        type=Activity.CALL,
                        content='Discussed new rocket skate order. Client complained about latency.',
                        activity_date=timezone.now() - timedelta(days=3),
                        deal=deal1,
                        contact=coyote,
                        company=companies[0]
                    ),
                    Activity.objects.create(
                        organization=org,
                        performed_by=rep2,
                        type=Activity.EMAIL,
                        content='Sent proposal document for plant duplication simulation.',
                        activity_date=timezone.now() - timedelta(days=2),
                        deal=deal2,
                        contact=scorpio,
                        company=companies[1]
                    ),
                    Activity.objects.create(
                        organization=org,
                        performed_by=rep1,
                        type=Activity.MEETING,
                        content='Completed onboarding meeting. Peter seemed demotivated but approved standard contract terms.',
                        activity_date=timezone.now() - timedelta(days=15),
                        deal=deal3,
                        contact=gibbons,
                        company=companies[2]
                    ),
                    Activity.objects.create(
                        organization=org,
                        performed_by=admin,
                        type=Activity.NOTE,
                        content='Internal review: Scorpio account is high value. Escalate prioritization.',
                        activity_date=timezone.now() - timedelta(hours=5),
                        deal=deal2,
                        contact=scorpio,
                        company=companies[1]
                    ),
                    Activity.objects.create(
                        organization=org,
                        performed_by=rep2,
                        type=Activity.CALL,
                        content='Brief call with Milton. He insisted on keeping his red swingline stapler.',
                        activity_date=timezone.now() - timedelta(days=1),
                        deal=deal4,
                        contact=waddams,
                        company=companies[2]
                    ),
                ]

            self.stdout.write(self.style.SUCCESS('Successfully seeded Mintana CRM database with testing records!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error seeding database: {str(e)}'))
