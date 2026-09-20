from django.apps import AppConfig as DjangoAppConfig


class AppConfig(DjangoAppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app'

    def ready(self):
        from . import signals  # noqa: F401
