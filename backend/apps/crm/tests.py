from django.test import TestCase
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken

from apps.accounts.models import Organization, User
from apps.crm.models import Company, Stage, Contact, Deal
from apps.planning.models import Activity
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
