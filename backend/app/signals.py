from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import PeerRoom


@receiver(post_save, sender=PeerRoom)
def promote_waitlist_when_room_capacity_changes(sender, instance, **kwargs):
    if not instance.is_active:
        return

    from .peer_rooms import promote_waitlisted_users

    transaction.on_commit(lambda: promote_waitlisted_users(instance.topic))
