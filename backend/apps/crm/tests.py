from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken

from apps.accounts.models import Organization, User
from apps.crm.models import Company, Stage, Contact, Deal, LeadLifecycleRule
from apps.planning.models import Activity, Task
from config.api import api

class CRMAPITests(TestCase):
    def setUp(self):
        self.client = TestClient(api)
        
        # 1. Setup Tenant Org A
        self.org_a = Organization.objects.create(name="Tenant A", domain="tenant-a.com")
        self.admin_a = User.objects.create_user(
            username="admin@tenant-a.com",
            email="admin@tenant-a.com",
            password="password123",
            role=User.ADMIN,
            organization=self.org_a
        )
        self.rep_a1 = User.objects.create_user(
            username="rep1@tenant-a.com",
            email="rep1@tenant-a.com",
            password="password123",
            role=User.SALES_REP,
            organization=self.org_a
        )
        self.rep_a2 = User.objects.create_user(
            username="rep2@tenant-a.com",
            email="rep2@tenant-a.com",
            password="password123",
            role=User.SALES_REP,
            organization=self.org_a
        )
        
        # Stage for Tenant A
        self.stage_a = Stage.objects.create(
            organization=self.org_a,
            name="Lead In A",
            order=1
        )
        
        # 2. Setup Tenant Org B
        self.org_b = Organization.objects.create(name="Tenant B", domain="tenant-b.com")
        self.admin_b = User.objects.create_user(
            username="admin@tenant-b.com",
            email="admin@tenant-b.com",
            password="password123",
            role=User.ADMIN,
            organization=self.org_b
        )
        
        # 3. Mocks for Tenant A
        self.company_a = Company.objects.create(
            organization=self.org_a,
            name="Acme A"
        )
        self.contact_a1 = Contact.objects.create(
            organization=self.org_a,
            first_name="Wile A1",
            last_name="Coyote",
            email="wile@acme.com",
            status=Contact.LEAD,
            assigned_to=self.rep_a1,
            company=self.company_a
        )
        self.contact_a2 = Contact.objects.create(
            organization=self.org_a,
            first_name="Hank A2",
            last_name="Scorpio",
            email="hank@globex.com",
            status=Contact.CONTACT,
            assigned_to=self.rep_a2,
            company=self.company_a
        )
        
        # 4. Helper headers
        self.headers_admin_a = self.get_headers_for_user(self.admin_a)
        self.headers_rep_a1 = self.get_headers_for_user(self.rep_a1)
        self.headers_rep_a2 = self.get_headers_for_user(self.rep_a2)
        self.headers_admin_b = self.get_headers_for_user(self.admin_b)

    def get_headers_for_user(self, user):
        token = str(AccessToken.for_user(user))
        return {"Authorization": f"Bearer {token}"}

    def test_unauthenticated_request_fails(self):
        response = self.client.get("/contacts/")
        self.assertEqual(response.status_code, 401)

    def test_multi_tenant_isolation(self):
        # Admin A requests contacts (should see only Org A contacts)
        response = self.client.get("/contacts/", headers=self.headers_admin_a)
        self.assertEqual(response.status_code, 200)
        items = response.json().get('items', [])
        # Check that we only see contacts from Org A
        self.assertEqual(len(items), 2)
        for contact in items:
            self.assertIn(contact['first_name'], ["Wile A1", "Hank A2"])
            
        # Admin B requests contacts (should see 0, since Org B has no contacts seeded)
        response = self.client.get("/contacts/", headers=self.headers_admin_b)
        self.assertEqual(response.status_code, 200)
        items = response.json().get('items', [])
        self.assertEqual(len(items), 0)

    def test_sales_rep_edit_permissions(self):
        # Rep A1 tries to edit contact assigned to Rep A1 -> ALLOWED
        response = self.client.put(
            f"/contacts/{self.contact_a1.id}",
            json={
                "first_name": "Updated Wile",
                "last_name": "Coyote",
                "email": "wile-updated@acme.com",
                "status": Contact.LEAD
            },
            headers=self.headers_rep_a1
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['first_name'], "Updated Wile")
        
        # Rep A1 tries to edit contact assigned to Rep A2 -> FORBIDDEN (403)
        response = self.client.put(
            f"/contacts/{self.contact_a2.id}",
            json={
                "first_name": "Hack Hank",
                "last_name": "Scorpio",
                "email": "hank@globex.com",
                "status": Contact.CONTACT
            },
            headers=self.headers_rep_a1
        )
        self.assertEqual(response.status_code, 403)
        
        # Admin A tries to edit contact assigned to Rep A2 -> ALLOWED
        response = self.client.put(
            f"/contacts/{self.contact_a2.id}",
            json={
                "first_name": "Admin Updated Hank",
                "last_name": "Scorpio",
                "email": "hank@globex.com",
                "status": Contact.CONTACT
            },
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['first_name'], "Admin Updated Hank")

    def test_contact_search_and_pagination(self):
        # Search for "Wile"
        response = self.client.get("/contacts/?search=Wile", headers=self.headers_admin_a)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('count'), 1)
        self.assertEqual(data.get('items', [])[0]['first_name'], "Wile A1")
        
        # Test LimitOffset pagination
        response = self.client.get("/contacts/?limit=1&offset=0", headers=self.headers_admin_a)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data.get('items', [])), 1)
        self.assertEqual(data.get('count'), 2)

    def test_deal_creation_and_isolation(self):
        # Try to create a Deal under Org A by Admin A
        response = self.client.post(
            "/deals/",
            json={
                "title": "Super Deal",
                "value": 15000.00,
                "stage_id": str(self.stage_a.id),
                "contact_id": str(self.contact_a1.id),
                "company_id": str(self.company_a.id),
                "probability": 20
            },
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 201)
        deal_id = response.json()['id']
        
        # Verify it exists in DB
        self.assertTrue(Deal.objects.filter(id=deal_id, organization=self.org_a).exists())
        
        # Try to modify this Deal as Rep A2 (contact is assigned to Rep A1) -> FORBIDDEN
        response = self.client.put(
            f"/deals/{deal_id}",
            json={
                "title": "Hack Attempt Deal",
                "value": 20000.00,
                "stage_id": str(self.stage_a.id),
                "contact_id": str(self.contact_a1.id),
                "company_id": str(self.company_a.id),
                "probability": 20
            },
            headers=self.headers_rep_a2
        )
        self.assertEqual(response.status_code, 403)

    def test_contact_duplicate_check_and_bypass(self):
        # Email has wile@acme.com already
        response = self.client.post(
            "/contacts/",
            json={
                "first_name": "Wile Duplicate",
                "last_name": "Coyote",
                "email": "wile@acme.com",
                "phone": "555-0199",
                "job_title": "Lead Engineer",
                "custom_fields": {"hair_color": "brown"}
            },
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("DUPLICATE_DETECTED", response.json()["detail"])

        response = self.client.post(
            "/contacts/?bypass_duplicate_check=true",
            json={
                "first_name": "Wile Duplicate",
                "last_name": "Coyote",
                "email": "wile@acme.com",
                "phone": "555-0199",
                "job_title": "Lead Engineer",
                "custom_fields": {"hair_color": "brown"}
            },
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 201)
        duplicate_id = response.json()["id"]
        self.assertTrue(Contact.objects.filter(id=duplicate_id).exists())

    def test_contact_merge(self):
        source = Contact.objects.create(
            organization=self.org_a,
            first_name="Hank Duplicate",
            last_name="Scorpio",
            email="hank@globex.com",
            status=Contact.LEAD,
            assigned_to=self.rep_a1,
            company=self.company_a,
            custom_fields={"high_priority": "yes", "department": "R&D"}
        )
        deal = Deal.objects.create(
            organization=self.org_a,
            title="Globex Subjugation Plan",
            value=250000.00,
            stage=self.stage_a,
            contact=source,
            company=self.company_a
        )
        activity = Activity.objects.create(
            organization=self.org_a,
            contact=source,
            type="CALL",
            content="Discussed weather control device.",
            activity_date=timezone.now()
        )
        task = Task.objects.create(
            organization=self.org_a,
            contact=source,
            title="Buy plutonium"
        )
        
        response = self.client.post(
            f"/contacts/{self.contact_a2.id}/merge?candidate_id={source.id}",
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 200)
        
        self.contact_a2.refresh_from_db()
        self.assertEqual(self.contact_a2.custom_fields.get("high_priority"), "yes")
        self.assertEqual(self.contact_a2.custom_fields.get("department"), "R&D")
        
        deal.refresh_from_db()
        self.assertEqual(deal.contact, self.contact_a2)
        
        activity.refresh_from_db()
        self.assertEqual(activity.contact, self.contact_a2)
        
        task.refresh_from_db()
        self.assertEqual(task.contact, self.contact_a2)
        
        self.assertFalse(Contact.objects.filter(id=source.id).exists())

    def test_extend_lead_lifecycle(self):
        self.assertEqual(self.contact_a1.lifecycle_extension_days, 0)
        
        response = self.client.post(
            f"/contacts/{self.contact_a1.id}/extend?days=7",
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 200)
        
        self.contact_a1.refresh_from_db()
        self.assertEqual(self.contact_a1.lifecycle_extension_days, 7)
        self.assertEqual(self.contact_a1.lifecycle_status, "ACTIVE")

    def test_process_lead_lifecycle_command(self):
        from django.core.management import call_command
        self.org_a.lead_lifecycle_timer_enabled = True
        self.org_a.save()
        
        self.contact_a1.is_active_lead = True
        self.contact_a1.lifecycle_started_at = timezone.now() - timedelta(days=5)
        self.contact_a1.save()
        
        rule = LeadLifecycleRule.objects.create(
            organization=self.org_a,
            day=3,
            action_type=LeadLifecycleRule.CREATE_TASK,
            config={"task_title": "Day 3 Callback"}
        )
        
        call_command("process_lead_lifecycle")
        
        self.assertTrue(Task.objects.filter(contact=self.contact_a1, title="Day 3 Callback").exists())
        self.assertTrue(Activity.objects.filter(contact=self.contact_a1, content__icontains="Day 3 Callback").exists())

    def test_shipment_auto_generates_invoice(self):
        from apps.crm.models import Shipment, Invoice
        response = self.client.post(
            "/shipments/",
            json={
                "receiver_name": "Test Customer",
                "receiver_phone": "08012345678",
                "receiver_email": "test@customer.com",
                "receiver_address": "123 Test St",
                "item_received": "ELECTRONICS AND CLOTHES",
                "weight_kg": 10.0,
                "amount": 25000.00,
                "number_of_carton": 2,
                "has_doorstep_delivery": True,
                "currency": "NGN"
            },
            headers=self.headers_admin_a
        )
        self.assertEqual(response.status_code, 201)
        shipment_data = response.json()
        inv_no = shipment_data['invoice_number']

        invoice = Invoice.objects.filter(organization=self.org_a, invoice_number=inv_no).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.receiver_name, "Test Customer")
        self.assertEqual(invoice.receiver_tel, "08012345678")
        self.assertEqual(invoice.receiver_email, "test@customer.com")
        self.assertEqual(float(invoice.total_ngn), 25000.00)
        self.assertEqual(len(invoice.services), 2)

