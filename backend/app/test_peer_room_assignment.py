from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from app.models import (
    PeerRoom,
    PeerRoomMembership,
    PeerRoomWaitlist,
    UserProfile,
)
from app.peer_rooms import (
    assign_peer_room,
    opt_out_to_waitlist,
    promote_waitlisted_users,
    switch_peer_room,
)


class PeerRoomAssignmentTests(TestCase):
    def setUp(self):
        PeerRoom.objects.all().delete()
        self.room_one = PeerRoom.objects.create(
            name='Anxiety Support Room 1',
            topic='anxiety',
            slot=1,
        )
        self.room_two = PeerRoom.objects.create(
            name='Anxiety Support Room 2',
            topic='anxiety',
            slot=2,
        )

    def make_user(self, username, category='anxiety', onboarded=True):
        user = get_user_model().objects.create_user(username=username, password='testpass123')
        UserProfile.objects.create(
            user=user,
            anonymous_name=f'{username}-anonymous',
            is_peer_onboarded=onboarded,
            peer_support_category=category,
        )
        return user

    def test_rooms_default_to_twenty_members(self):
        self.assertEqual(self.room_one.capacity, 20)
        self.assertEqual(self.room_two.capacity, 20)

    def test_assignment_uses_one_of_the_two_category_rooms(self):
        user = self.make_user('new-member')

        state = assign_peer_room(user)

        self.assertEqual(state['status'], 'assigned')
        self.assertIn(state['room']['id'], {self.room_one.id, self.room_two.id})
        self.assertEqual(state['category'], 'anxiety')
        self.assertEqual(PeerRoomMembership.objects.filter(user=user, status='active').count(), 1)

    def test_full_category_adds_user_to_waitlist(self):
        for room in (self.room_one, self.room_two):
            for index in range(room.capacity):
                user = self.make_user(f'occupant-{room.slot}-{index}')
                PeerRoomMembership.objects.create(user=user, room=room, category='anxiety')
        waiting_user = self.make_user('waiting-member')

        state = assign_peer_room(waiting_user)

        self.assertEqual(state['status'], 'waitlisted')
        self.assertEqual(state['waitlist']['reason'], 'capacity')
        self.assertTrue(PeerRoomWaitlist.objects.filter(user=waiting_user, status='waiting').exists())

    def test_switch_moves_atomically_when_another_room_has_space(self):
        user = self.make_user('switching-member')
        PeerRoomMembership.objects.create(user=user, room=self.room_one, category='anxiety')

        state, switched = switch_peer_room(user)

        self.assertTrue(switched)
        self.assertEqual(state['room']['id'], self.room_two.id)
        self.assertEqual(PeerRoomMembership.objects.filter(user=user, status='active').count(), 1)
        self.assertEqual(
            PeerRoomMembership.objects.get(user=user, status='ended').end_reason,
            PeerRoomMembership.EndReason.SWITCHED,
        )

    def test_failed_switch_preserves_current_room(self):
        self.room_two.capacity = 1
        self.room_two.save(update_fields=['capacity'])
        occupant = self.make_user('other-room-occupant')
        PeerRoomMembership.objects.create(user=occupant, room=self.room_two, category='anxiety')
        user = self.make_user('staying-member')
        membership = PeerRoomMembership.objects.create(user=user, room=self.room_one, category='anxiety')

        state, switched = switch_peer_room(user)

        self.assertFalse(switched)
        self.assertEqual(state['room']['id'], self.room_one.id)
        membership.refresh_from_db()
        self.assertEqual(membership.status, PeerRoomMembership.Status.ACTIVE)

    def test_opt_out_waits_for_a_room_created_after_departure(self):
        user = self.make_user('future-room-member')
        PeerRoomMembership.objects.create(user=user, room=self.room_one, category='anxiety')

        state = opt_out_to_waitlist(user)

        self.assertEqual(state['status'], 'waitlisted')
        self.assertEqual(state['waitlist']['reason'], 'opted_out')
        waitlist = PeerRoomWaitlist.objects.get(user=user, status='waiting')
        self.assertEqual(waitlist.minimum_room_slot, 3)
        self.assertEqual(promote_waitlisted_users('anxiety'), 0)
        self.assertFalse(PeerRoomMembership.objects.filter(user=user, status='active').exists())

        with self.captureOnCommitCallbacks(execute=True):
            room_three = PeerRoom.objects.create(
                name='Anxiety Support Room 3',
                topic='anxiety',
                slot=3,
            )

        active = PeerRoomMembership.objects.get(user=user, status='active')
        self.assertEqual(active.room, room_three)
        waitlist.refresh_from_db()
        self.assertEqual(waitlist.status, PeerRoomWaitlist.Status.ASSIGNED)


class PeerRoomAPIAccessTests(TestCase):
    def setUp(self):
        PeerRoom.objects.all().delete()
        self.anxiety_room = PeerRoom.objects.create(
            name='Anxiety Support Room 1', topic='anxiety', slot=1,
        )
        self.other_anxiety_room = PeerRoom.objects.create(
            name='Anxiety Support Room 2', topic='anxiety', slot=2,
        )
        self.user = self.make_user('api-member', 'anxiety')
        self.client = APIClient()
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def make_user(self, username, category):
        user = get_user_model().objects.create_user(username=username, password='testpass123')
        UserProfile.objects.create(
            user=user,
            anonymous_name=f'{username}-anonymous',
            is_peer_onboarded=True,
            peer_support_category=category,
        )
        return user

    def test_room_endpoint_returns_assignment_state_object(self):
        response = self.client.get(reverse('peer-rooms'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'assigned')
        self.assertEqual(response.data['category'], 'anxiety')
        self.assertEqual(response.data['room']['capacity'], 20)

    def test_messages_require_membership_in_the_requested_room(self):
        PeerRoomMembership.objects.create(
            user=self.user,
            room=self.anxiety_room,
            category='anxiety',
        )

        response = self.client.get(reverse('peer-room-messages', args=[self.other_anxiety_room.id]))

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error'], 'You are not assigned to this room.')

    def test_recommendations_are_same_category_but_keep_existing_connections(self):
        same_category = self.make_user('same-category', 'anxiety')
        different_category = self.make_user('different-category', 'grief')

        response = self.client.get(reverse('peer-list'))

        returned_ids = {item['userId'] for item in response.data}
        self.assertIn(str(same_category.profile.peer_id), returned_ids)
        self.assertNotIn(str(different_category.profile.peer_id), returned_ids)

    def test_new_cross_category_connection_is_rejected(self):
        different_category = self.make_user('cross-category', 'grief')

        response = self.client.post(
            reverse('peer-connect', args=[different_category.profile.peer_id]),
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn('support category', response.data['error'])
