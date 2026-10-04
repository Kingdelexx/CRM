from unittest.mock import patch
from django.test import TestCase
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken

from apps.accounts.models import Organization, User
from config.api import api


class AccountStaffEmailTests(TestCase):
    def setUp(self):
        self.client = TestClient(api)
        self.org = Organization.objects.create(name="Mintana Corp", domain="mintana.com")
        self.admin = User.objects.create_user(
            username="admin@mintana.com",
            email="admin@mintana.com",
            password="adminpassword123",
            first_name="Admin",
            last_name="User",
            role=User.ADMIN,
            organization=self.org
        )
        token = str(AccessToken.for_user(self.admin))
        self.headers = {"Authorization": f"Bearer {token}"}

    @patch("apps.accounts.services.email_service.send_email")
    def test_create_staff_auto_generates_temp_password_and_dispatches_welcome_email(self, mock_send_email):
        mock_send_email.return_value = True

        response = self.client.post(
            "/accounts/users",
            json={
                "email": "newstaff@mintana.com",
                "first_name": "Jane",
                "last_name": "Doe",
                "role": "SALES_REP"
            },
            headers=self.headers
        )

        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email="newstaff@mintana.com")
        self.assertEqual(created_user.first_name, "Jane")
        self.assertEqual(created_user.last_name, "Doe")
        self.assertTrue(created_user.must_change_password)

        # Verify email dispatch
        mock_send_email.assert_called_once()
        call_kwargs = mock_send_email.call_args.kwargs
        self.assertIn("newstaff@mintana.com", call_kwargs["recipients"])
        self.assertIn("Temp Password:", call_kwargs["html_body"])
        self.assertIn("Security Notice:", call_kwargs["html_body"])

    @patch("apps.accounts.services.email_service.send_email")
    def test_change_password_endpoint_clears_must_change_password_flag(self, mock_send_email):
        staff = User.objects.create_user(
            username="staff@mintana.com",
            email="staff@mintana.com",
            password="TempPassword123!",
            first_name="Staff",
            last_name="Member",
            role=User.SALES_REP,
            organization=self.org,
            must_change_password=True
        )

        staff_token = str(AccessToken.for_user(staff))
        staff_headers = {"Authorization": f"Bearer {staff_token}"}

        response = self.client.post(
            "/accounts/change-password",
            json={
                "old_password": "TempPassword123!",
                "new_password": "NewPermanentPassword456!"
            },
            headers=staff_headers
        )

        self.assertEqual(response.status_code, 200)
        staff.refresh_from_db()
        self.assertFalse(staff.must_change_password)
        self.assertTrue(staff.check_password("NewPermanentPassword456!"))
