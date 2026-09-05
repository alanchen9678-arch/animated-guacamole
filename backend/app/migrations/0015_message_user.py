import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_message_users(apps, schema_editor):
    Message = apps.get_model('app', 'Message')
    pending = []
    queryset = Message.objects.filter(user__isnull=True).select_related('conversation')

    for message in queryset.iterator(chunk_size=1000):
        message.user_id = message.conversation.user_id
        pending.append(message)
        if len(pending) == 1000:
            Message.objects.bulk_update(pending, ['user'])
            pending = []

    if pending:
        Message.objects.bulk_update(pending, ['user'])


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0014_therapistappointment_lifecycle'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='user',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='message_logs',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_message_users, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='message',
            name='user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='message_logs',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['user', 'timestamp'], name='app_message_user_id_66deb6_idx'),
        ),
    ]
