import hashlib

from django.db import migrations, models


PEER_AVATAR_COLORS = (
    '#4d6b58',
    '#5f7774',
    '#506b82',
    '#687580',
    '#756675',
    '#806d5b',
    '#627967',
    '#536b5d',
)
PEER_AVATAR_SYMBOLS = (
    'peer-cove',
    'peer-tide',
    'peer-reed',
    'peer-pebble',
    'peer-beacon',
    'peer-shell',
    'peer-pine',
    'peer-north-star',
)


def populate_peer_marks(apps, schema_editor):
    UserProfile = apps.get_model('app', 'UserProfile')
    for profile in UserProfile.objects.only('id', 'peer_id').iterator():
        digest = hashlib.sha256(str(profile.peer_id).encode('utf-8')).digest()
        UserProfile.objects.filter(pk=profile.pk).update(
            peer_avatar_color=PEER_AVATAR_COLORS[digest[0] % len(PEER_AVATAR_COLORS)],
            peer_avatar_symbol=PEER_AVATAR_SYMBOLS[digest[1] % len(PEER_AVATAR_SYMBOLS)],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0018_rename_personality_instrument'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='avatar_symbol',
            field=models.CharField(default='user-horizon', max_length=32),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='peer_avatar_color',
            field=models.CharField(blank=True, default='', max_length=7),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='peer_avatar_symbol',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.RunPython(populate_peer_marks, migrations.RunPython.noop),
    ]