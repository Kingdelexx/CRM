from ninja.security import APIKeyHeader
from apps.accounts.models import Organization

class WebhookApiKeyAuth(APIKeyHeader):
    param_name = "X-API-Key"

    def authenticate(self, request, key):
        try:
            org = Organization.objects.get(api_key=key)
            # Store the organization on the request object for easy tenant access in endpoints
            request.organization = org
            return org
        except Organization.DoesNotExist:
            return None
