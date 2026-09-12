from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0015_message_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='therapistmatch',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
