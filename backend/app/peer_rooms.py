import random

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from .models import (
    CheckIn,
    PEER_SUPPORT_CATEGORIES,
    PEER_SUPPORT_CATEGORY_CHOICES,
    PeerRoom,
    PeerRoomMembership,
    PeerRoomWaitlist,
    UserProfile,
)


CATEGORY_LABELS = dict(PEER_SUPPORT_CATEGORY_CHOICES)


def determine_peer_support_category(scores):
    valid_scores = {
        category: score
        for category, score in (scores or {}).items()
        if category in PEER_SUPPORT_CATEGORIES and isinstance(score, (int, float))
    }
    if not valid_scores:
        return ''
    highest_score = max(valid_scores.values())
    tied_categories = sorted(
        category for category, score in valid_scores.items() if score == highest_score
    )
    return random.choice(tied_categories)


def _profile_for_update(user):
    get_user_model().objects.select_for_update().get(pk=user.pk)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return UserProfile.objects.select_for_update().get(pk=profile.pk)


def _category_from_initial_assessment(user):
    initial = (
        user.checkins
        .filter(type=CheckIn.CheckInType.INITIAL)
        .order_by('created_at', 'id')
        .first()
    )
    return determine_peer_support_category(initial.scores) if initial else ''


@transaction.atomic
def record_peer_support_category(user, scores=None):
    profile = _profile_for_update(user)
    if profile.peer_support_category in PEER_SUPPORT_CATEGORIES:
        return profile.peer_support_category

    category = determine_peer_support_category(scores)
    if not category:
        category = _category_from_initial_assessment(user)
    if category:
        profile.peer_support_category = category
        profile.save(update_fields=['peer_support_category'])
    return category


def _member_counts(rooms):
    room_ids = [room.id for room in rooms]
    counts = {
        row['room_id']: row['total']
        for row in (
            PeerRoomMembership.objects
            .filter(room_id__in=room_ids, status=PeerRoomMembership.Status.ACTIVE)
            .values('room_id')
            .annotate(total=Count('id'))
        )
    }
    return {room.id: counts.get(room.id, 0) for room in rooms}


def serialize_room(room, member_count=None):
    if member_count is None:
        member_count = room.memberships.filter(status=PeerRoomMembership.Status.ACTIVE).count()
    return {
        'id': room.id,
        'name': room.name,
        'topic': room.topic,
        'categoryLabel': CATEGORY_LABELS.get(room.topic, room.topic.title()),
        'description': room.description,
        'memberCount': member_count,
        'capacity': room.capacity,
    }


def _assigned_state(membership):
    return {
        'status': 'assigned',
        'category': membership.category,
        'categoryLabel': CATEGORY_LABELS.get(membership.category, membership.category.title()),
        'room': serialize_room(membership.room),
        'waitlist': None,
    }


def _waitlisted_state(category, entry):
    return {
        'status': 'waitlisted',
        'category': category,
        'categoryLabel': CATEGORY_LABELS.get(category, category.title()),
        'room': None,
        'waitlist': {
            'reason': entry.reason,
            'joinedAt': entry.joined_at.isoformat(),
        },
    }


def _nonmember_state(status, category=''):
    return {
        'status': status,
        'category': category,
        'categoryLabel': CATEGORY_LABELS.get(category, ''),
        'room': None,
        'waitlist': None,
    }


def _active_membership_for_update(user):
    return (
        PeerRoomMembership.objects
        .select_for_update()
        .select_related('room')
        .filter(user=user, status=PeerRoomMembership.Status.ACTIVE)
        .first()
    )


@transaction.atomic
def assign_peer_room(user):
    profile = _profile_for_update(user)
    if not profile.is_peer_onboarded:
        return _nonmember_state('onboarding_required', profile.peer_support_category)

    category = profile.peer_support_category
    if category not in PEER_SUPPORT_CATEGORIES:
        category = _category_from_initial_assessment(user)
        if category:
            profile.peer_support_category = category
            profile.save(update_fields=['peer_support_category'])
    if not category:
        return _nonmember_state('assessment_required')

    membership = _active_membership_for_update(user)
    if membership and membership.room.is_active:
        return _assigned_state(membership)
    if membership:
        membership.status = PeerRoomMembership.Status.ENDED
        membership.ended_at = timezone.now()
        membership.end_reason = PeerRoomMembership.EndReason.ROOM_CLOSED
        membership.save(update_fields=['status', 'ended_at', 'end_reason'])

    waitlist_entry = (
        PeerRoomWaitlist.objects
        .select_for_update()
        .filter(user=user, status=PeerRoomWaitlist.Status.WAITING)
        .first()
    )
    minimum_slot = waitlist_entry.minimum_room_slot if waitlist_entry else 1
    rooms = list(
        PeerRoom.objects
        .select_for_update()
        .filter(topic=category, is_active=True, slot__gte=minimum_slot)
        .order_by('slot', 'id')
    )
    counts = _member_counts(rooms)
    available_rooms = [room for room in rooms if counts[room.id] < room.capacity]

    if available_rooms:
        room = random.choice(available_rooms)
        membership = PeerRoomMembership.objects.create(
            user=user,
            room=room,
            category=category,
        )
        if waitlist_entry:
            waitlist_entry.status = PeerRoomWaitlist.Status.ASSIGNED
            waitlist_entry.resolved_at = timezone.now()
            waitlist_entry.assigned_room = room
            waitlist_entry.save(update_fields=['status', 'resolved_at', 'assigned_room'])
        return _assigned_state(membership)

    if not waitlist_entry:
        waitlist_entry = PeerRoomWaitlist.objects.create(
            user=user,
            category=category,
            reason=PeerRoomWaitlist.Reason.CAPACITY,
            minimum_room_slot=1,
        )
    return _waitlisted_state(category, waitlist_entry)


@transaction.atomic
def switch_peer_room(user):
    _profile_for_update(user)
    membership = _active_membership_for_update(user)
    if not membership or not membership.room.is_active:
        return assign_peer_room(user), False

    rooms = list(
        PeerRoom.objects
        .select_for_update()
        .filter(topic=membership.category, is_active=True)
        .exclude(pk=membership.room_id)
        .order_by('slot', 'id')
    )
    counts = _member_counts(rooms)
    available_rooms = [room for room in rooms if counts[room.id] < room.capacity]
    if not available_rooms:
        return _assigned_state(membership), False

    room = random.choice(available_rooms)
    membership.status = PeerRoomMembership.Status.ENDED
    membership.ended_at = timezone.now()
    membership.end_reason = PeerRoomMembership.EndReason.SWITCHED
    membership.save(update_fields=['status', 'ended_at', 'end_reason'])
    new_membership = PeerRoomMembership.objects.create(
        user=user,
        room=room,
        category=membership.category,
    )
    return _assigned_state(new_membership), True


@transaction.atomic
def opt_out_to_waitlist(user):
    _profile_for_update(user)
    membership = _active_membership_for_update(user)
    if not membership:
        existing = (
            PeerRoomWaitlist.objects
            .select_for_update()
            .filter(user=user, status=PeerRoomWaitlist.Status.WAITING)
            .first()
        )
        if existing:
            return _waitlisted_state(existing.category, existing)
        return assign_peer_room(user)

    category = membership.category
    highest_existing_slot = (
        PeerRoom.objects
        .filter(topic=category, is_active=True)
        .order_by('-slot')
        .values_list('slot', flat=True)
        .first()
    ) or membership.room.slot

    membership.status = PeerRoomMembership.Status.ENDED
    membership.ended_at = timezone.now()
    membership.end_reason = PeerRoomMembership.EndReason.OPTED_OUT
    membership.save(update_fields=['status', 'ended_at', 'end_reason'])

    waitlist_entry, created = PeerRoomWaitlist.objects.select_for_update().get_or_create(
        user=user,
        status=PeerRoomWaitlist.Status.WAITING,
        defaults={
            'category': category,
            'reason': PeerRoomWaitlist.Reason.OPTED_OUT,
            'minimum_room_slot': highest_existing_slot + 1,
        },
    )
    if not created:
        waitlist_entry.category = category
        waitlist_entry.reason = PeerRoomWaitlist.Reason.OPTED_OUT
        waitlist_entry.minimum_room_slot = highest_existing_slot + 1
        waitlist_entry.save(update_fields=['category', 'reason', 'minimum_room_slot'])

    transaction.on_commit(lambda: promote_waitlisted_users(category))
    return _waitlisted_state(category, waitlist_entry)


def user_has_room_access(user, room_id):
    return PeerRoomMembership.objects.filter(
        user=user,
        room_id=room_id,
        room__is_active=True,
        status=PeerRoomMembership.Status.ACTIVE,
    ).exists()


@transaction.atomic
def _promote_waitlist_entry(entry_id, category):
    snapshot = (
        PeerRoomWaitlist.objects
        .filter(pk=entry_id, category=category, status=PeerRoomWaitlist.Status.WAITING)
        .values('user_id')
        .first()
    )
    if not snapshot:
        return False

    get_user_model().objects.select_for_update().get(pk=snapshot['user_id'])
    membership = _active_membership_for_update(snapshot['user_id'])
    entry = (
        PeerRoomWaitlist.objects
        .select_for_update()
        .filter(pk=entry_id, category=category, status=PeerRoomWaitlist.Status.WAITING)
        .first()
    )
    if not entry:
        return False
    if membership:
        entry.status = PeerRoomWaitlist.Status.CANCELLED
        entry.resolved_at = timezone.now()
        entry.save(update_fields=['status', 'resolved_at'])
        return False

    rooms = list(
        PeerRoom.objects
        .select_for_update()
        .filter(topic=category, is_active=True)
        .order_by('slot', 'id')
    )
    if not rooms:
        return False

    counts = _member_counts(rooms)
    available_rooms = [
        room
        for room in rooms
        if room.slot >= entry.minimum_room_slot and counts[room.id] < room.capacity
    ]
    if not available_rooms:
        return False

    room = random.choice(available_rooms)
    PeerRoomMembership.objects.create(
        user_id=snapshot['user_id'],
        room=room,
        category=category,
    )
    entry.status = PeerRoomWaitlist.Status.ASSIGNED
    entry.resolved_at = timezone.now()
    entry.assigned_room = room
    entry.save(update_fields=['status', 'resolved_at', 'assigned_room'])
    return True


def promote_waitlisted_users(category):
    if category not in PEER_SUPPORT_CATEGORIES:
        return 0

    waiting_entry_ids = list(
        PeerRoomWaitlist.objects
        .filter(category=category, status=PeerRoomWaitlist.Status.WAITING)
        .order_by('joined_at', 'id')
        .values_list('id', flat=True)
    )
    return sum(
        1 for entry_id in waiting_entry_ids
        if _promote_waitlist_entry(entry_id, category)
    )
