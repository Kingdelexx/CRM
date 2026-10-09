# Generated manually for has_packaging field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0029_invoice_sender_address_invoice_sender_email_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='shipment',
            name='has_packaging',
            field=models.BooleanField(default=False),
        ),
    ]
