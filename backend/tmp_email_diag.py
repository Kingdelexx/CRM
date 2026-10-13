"""
Quick email diagnostic - tests all email sending paths
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

print("=== EMAIL SETTINGS ===")
print(f"  EMAIL_BACKEND   : {settings.EMAIL_BACKEND}")
print(f"  EMAIL_HOST      : {settings.EMAIL_HOST}")
print(f"  EMAIL_PORT      : {settings.EMAIL_PORT}")
print(f"  EMAIL_USE_TLS   : {settings.EMAIL_USE_TLS}")
print(f"  EMAIL_HOST_USER : {settings.EMAIL_HOST_USER}")
print(f"  EMAIL_HOST_PASS : {'[SET - ' + str(len(settings.EMAIL_HOST_PASSWORD)) + ' chars]' if settings.EMAIL_HOST_PASSWORD else '[EMPTY!]'}")
print(f"  FROM_EMAIL      : {settings.DEFAULT_FROM_EMAIL}")

print("\n=== TEST 1: Django send_mail ===")
try:
    from django.core.mail import send_mail
    result = send_mail(
        subject="[Mintana CRM] Email Test",
        message="This is a test email from the diagnostic script.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.EMAIL_HOST_USER],
        fail_silently=False,
    )
    print(f"  send_mail() returned: {result} -> {'OK' if result > 0 else 'FAILED (0 sent)'}")
except Exception as e:
    print(f"  send_mail() FAILED: {type(e).__name__}: {e}")

print("\n=== TEST 2: Direct SMTP connection ===")
import smtplib
try:
    with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10) as server:
        server.ehlo()
        if settings.EMAIL_USE_TLS:
            server.starttls()
            server.ehlo()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        print(f"  SMTP login OK as {settings.EMAIL_HOST_USER}")
except Exception as e:
    print(f"  SMTP FAILED: {type(e).__name__}: {e}")
