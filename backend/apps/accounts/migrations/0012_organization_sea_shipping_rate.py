from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_must_change_password'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='sea_shipping_rate',
            field=models.DecimalField(blank=True, decimal_places=2, default=0.0, max_digits=12, null=True),
        ),
    ]
