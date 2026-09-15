class SensitiveApiHeadersMiddleware:
    """Prevent caching or embedding of authenticated JSON API responses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store, max-age=0'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
            response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
            response['Referrer-Policy'] = 'no-referrer'
        return response
