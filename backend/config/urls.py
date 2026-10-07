from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from config.api import api

def root_health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Mintana CRM Backend API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "admin": "/admin/"
    })

urlpatterns = [
    path('', root_health_check, name='root-health'),
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]
