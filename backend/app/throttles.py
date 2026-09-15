from rest_framework.throttling import ScopedRateThrottle


class PostOnlyScopedThrottle(ScopedRateThrottle):
    def allow_request(self, request, view):
        if request.method in {'GET', 'HEAD', 'OPTIONS'}:
            return True
        return super().allow_request(request, view)


class AiChatThrottle(PostOnlyScopedThrottle):
    scope = 'ai_chat'


class PeerMessageThrottle(PostOnlyScopedThrottle):
    scope = 'peer_messages'
