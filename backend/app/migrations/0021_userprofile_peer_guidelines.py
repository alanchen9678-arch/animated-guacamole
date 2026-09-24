from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('app', '0020_peerroommembership_peerroomwaitlist_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='peer_guidelines_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='peer_guidelines_version',
            field=models.CharField(
                blank=True,
                default='',
                max_length=32,
            ),
        ),
    ]
