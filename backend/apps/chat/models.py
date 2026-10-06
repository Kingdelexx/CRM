from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel
from apps.accounts.models import Organization, User


class Conversation(TimeStampedModel):
    DIRECT = 'DIRECT'
    GROUP = 'GROUP'

    TYPE_CHOICES = [
        (DIRECT, 'Direct'),
        (GROUP, 'Group'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=DIRECT,
        db_index=True
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_conversations'
    )

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        if self.type == self.GROUP:
            return self.title or f"Group Conversation ({str(self.id)[:8]})"
        return f"Direct Conversation ({str(self.id)[:8]})"


class ConversationParticipant(TimeStampedModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversation_participations'
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        unique_together = ('conversation', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.email} in {self.conversation_id}"


class ChatMessage(TimeStampedModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_chat_messages'
    )
    content = models.TextField()
    is_edited = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message by {self.sender.email} in {self.conversation_id}"
