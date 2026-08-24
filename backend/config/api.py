from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController
from apps.accounts.api import router as accounts_router
from apps.crm.api import companies_router, stages_router, contacts_router, deals_router
from apps.planning.api import activities_router, tasks_router
from apps.crm.webhooks import router as webhooks_router

# Set up Ninja API with django-ninja-extra to support Ninja JWT controllers
api = NinjaExtraAPI(
    title="Mintana CRM API",
    version="1.0.0",
    description="High-performance multi-tenant API backend for Mintana CRM"
)

# Register default JWT controllers (token obtain/refresh/verify)
api.register_controllers(NinjaJWTDefaultController)

# Mount app routers
api.add_router("/accounts/", accounts_router)
api.add_router("/companies/", companies_router)
api.add_router("/stages/", stages_router)
api.add_router("/contacts/", contacts_router)
api.add_router("/deals/", deals_router)
api.add_router("/activities/", activities_router)
api.add_router("/tasks/", tasks_router)
api.add_router("/v1/webhooks/", webhooks_router)

