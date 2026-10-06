from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0025_shipment_dpd_tracking_number_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='shipment',
            name='is_promo',
            field=models.BooleanField(default=False),
        ),
    ]
