from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0013_journalprivacysettings_allow_chat_access_chatusage_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='therapistappointment',
            name='duration_minutes',
            field=models.PositiveSmallIntegerField(default=50),
        ),
        migrations.AddField(
            model_name='therapistappointment',
            name='status',
            field=models.CharField(
                choices=[('confirmed', 'Confirmed'), ('cancelled', 'Cancelled')],
                default='confirmed',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='therapistappointment',
            name='timezone',
            field=models.CharField(default='UTC', max_length=64),
        ),
    ]
