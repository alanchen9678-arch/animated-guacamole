from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('app', '0021_userprofile_peer_guidelines'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PeerConnectionEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('requested', 'Requested'), ('accepted', 'Accepted')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='peer_connection_events', to=settings.AUTH_USER_MODEL)),
                ('connection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='app.peerconnection')),
            ],
            options={
                'ordering': ['-created_at', '-id'],
                'indexes': [models.Index(fields=['connection', 'created_at'], name='app_peercon_connect_23c344_idx')],
                'constraints': [models.UniqueConstraint(fields=('connection', 'event_type'), name='unique_peer_connection_event_type')],
            },
        ),
    ]