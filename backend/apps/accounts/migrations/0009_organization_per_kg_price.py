from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_organization_doorstep_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='per_kg_price',
            field=models.DecimalField(blank=True, decimal_places=2, default=0.0, max_digits=12, null=True),
        ),
    ]
