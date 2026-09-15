import uuid

from django.db import migrations, models
from django.db.models import F, Q
from django.db.models.functions import Greatest, Least


def deduplicate_peer_connections(apps, schema_editor):
    PeerConnection = apps.get_model('app', 'PeerConnection')
    seen = {}
    for connection in PeerConnection.objects.order_by('id'):
        if connection.requester_id == connection.recipient_id:
            connection.delete()
            continue
        key = tuple(sorted((connection.requester_id, connection.recipient_id)))
        existing = seen.get(key)
        if not existing:
            seen[key] = connection
            continue
        if connection.status == 'connected' and existing.status != 'connected':
            existing.status = 'connected'
            existing.save(update_fields=['status'])
        connection.delete()


def populate_peer_ids(apps, schema_editor):
    UserProfile = apps.get_model('app', 'UserProfile')
    for profile in UserProfile.objects.filter(peer_id__isnull=True).iterator():
        profile.peer_id = uuid.uuid4()
        profile.save(update_fields=['peer_id'])


class Migration(migrations.Migration):
    dependencies = [
        ('app', '0016_therapistmatch_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='peer_id',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(populate_peer_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='userprofile',
            name='peer_id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.RunPython(deduplicate_peer_connections, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='peerconnection',
            constraint=models.CheckConstraint(
                condition=~Q(requester=F('recipient')),
                name='peer_connection_not_self',
            ),
        ),
        migrations.AddConstraint(
            model_name='peerconnection',
            constraint=models.UniqueConstraint(
                Least('requester_id', 'recipient_id'),
                Greatest('requester_id', 'recipient_id'),
                name='unique_unordered_peer_connection',
            ),
        ),
    ]
