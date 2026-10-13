from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q


class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend that permits users to authenticate
    using either their email address or username (case-insensitively).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        if not username or not password:
            return None

        # Clean input identifier
        identifier = str(username).strip()

        try:
            # Query by email or username, case-insensitive
            user = UserModel.objects.filter(
                Q(email__iexact=identifier) | Q(username__iexact=identifier)
            ).first()
        except Exception:
            return None

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
