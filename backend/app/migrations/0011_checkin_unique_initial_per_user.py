from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0010_conversation_therapist_match'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='checkin',
            constraint=models.UniqueConstraint(
                condition=Q(type='initial'),
                fields=('user',),
                name='unique_initial_checkin_per_user',
            ),
        ),
    ]
