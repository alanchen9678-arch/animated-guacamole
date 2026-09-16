from django.db import migrations


LEGACY_PRODUCT_SLUG = ''.join(('au', 'rora'))
LEGACY_INSTRUMENT = f'{LEGACY_PRODUCT_SLUG}-personality-v2'
CURRENT_INSTRUMENT = 'dawn-harbor-personality-v2'


def update_personality_instrument(apps, schema_editor, source, target):
    UserProfile = apps.get_model('app', 'UserProfile')
    profiles = UserProfile.objects.exclude(personality__isnull=True).only('id', 'personality')
    for profile in profiles.iterator():
        personality = profile.personality
        if not isinstance(personality, dict) or personality.get('instrument') != source:
            continue
        updated_personality = {**personality, 'instrument': target}
        UserProfile.objects.filter(pk=profile.pk).update(personality=updated_personality)


def rename_personality_instrument(apps, schema_editor):
    update_personality_instrument(apps, schema_editor, LEGACY_INSTRUMENT, CURRENT_INSTRUMENT)


def restore_personality_instrument(apps, schema_editor):
    update_personality_instrument(apps, schema_editor, CURRENT_INSTRUMENT, LEGACY_INSTRUMENT)


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0017_userprofile_peer_id_peer_connection_constraints'),
    ]

    operations = [
        migrations.RunPython(rename_personality_instrument, restore_personality_instrument),
    ]
