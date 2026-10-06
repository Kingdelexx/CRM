from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_organization_sea_shipping_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='promo_rate',
            field=models.DecimalField(blank=True, decimal_places=2, default=0.0, max_digits=12, null=True),
        ),
    ]
