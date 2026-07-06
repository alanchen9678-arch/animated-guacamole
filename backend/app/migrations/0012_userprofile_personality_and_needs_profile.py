from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0011_checkin_unique_initial_per_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='needs_profile',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='personality',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
