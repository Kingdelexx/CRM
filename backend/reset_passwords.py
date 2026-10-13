"""
Password Reset Helper Script
Run this script to reset passwords for your accounts.
The script will print the new temporary passwords.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User

# Dictionary of email -> new temporary password
# Edit the passwords below before running
RESET_PASSWORDS = {
    'kingdelexx@gmail.com': 'Mintana@2024',
    'devnaijaacademy@gmail.com': 'Mintana@2024',
    'mintanacrm@gmail.com': 'Mintana@2024',
    'ntlmijaiye1@gmail.com': 'Mintana@2024',
    'blake4john3000@gmail.com': 'Mintana@2024',
    'wardream247@gmail.com': 'Mintana@2024',
    'Abby@gmail.com': 'Mintana@2024',
}

print("=== PASSWORD RESET RESULTS ===\n")
for email, new_password in RESET_PASSWORDS.items():
    user = User.objects.filter(email=email).first()
    if not user:
        print(f"[NOT FOUND] {email}")
        continue
    user.set_password(new_password)
    user.must_change_password = True  # Force password change on next login
    user.save()
    print(f"[RESET OK ] {email:<35} -> Password: {new_password}")

print("\nDone! Users can now log in with the above credentials.")
print("They will be prompted to change their password on first login.\n")
