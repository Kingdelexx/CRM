from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ninja import Schema


class UserMinimalSchema(Schema):
    id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ConversationParticipantSchema(Schema):
    id: UUID
    conversation_id: UUID
    user_id: UUID
    joined_at: datetime
    last_read_at: Optional[datetime] = None
    user: Optional[UserMinimalSchema] = None


class ChatMessageSchema(Schema):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    is_edited: bool = False
    created_at: datetime
    updated_at: datetime
    sender: Optional[UserMinimalSchema] = None


class ConversationSchema(Schema):
    id: UUID
    title: Optional[str] = None
    type: str
    created_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    participants: List[ConversationParticipantSchema] = []
    unread_count: int = 0
    last_message: Optional[ChatMessageSchema] = None


class CreateConversationSchema(Schema):
    title: Optional[str] = None
    type: str = 'DIRECT'
    participant_ids: Optional[List[UUID]] = None
    recipient_id: Optional[UUID] = None


class CreateChatMessageSchema(Schema):
    content: str


class MarkReadResponseSchema(Schema):
    success: bool = True
    last_read_at: datetime
