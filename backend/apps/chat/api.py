import time
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from django.db.models import Q, Count, Max, OuterRef, Subquery
from django.http import StreamingHttpResponse, HttpResponseForbidden, HttpResponse
from django.utils import timezone
from ninja import Router, Query
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth

from apps.accounts.models import User
from .models import Conversation, ConversationParticipant, ChatMessage
from .schemas import (
    ConversationSchema, CreateConversationSchema,
    ChatMessageSchema, CreateChatMessageSchema,
    MarkReadResponseSchema, ConversationParticipantSchema,
    UserMinimalSchema
)
from .events import chat_event_manager

chat_router = Router(auth=JWTAuth())


def _format_user_minimal(user: Optional[User]) -> Optional[UserMinimalSchema]:
    if not user:
        return None
    return UserMinimalSchema(
        id=user.id,
        email=user.email,
        first_name=getattr(user, 'first_name', None),
        last_name=getattr(user, 'last_name', None),
        avatar_url=getattr(user, 'avatar_url', None) if hasattr(user, 'avatar_url') else None
    )


def ensure_admins_in_conversation(conversation: Conversation):
    """
    Ensure all active administrators within the organization are participants in the conversation.
    """
    admins = User.objects.filter(
        organization=conversation.organization,
        role='ADMIN',
        is_active=True
    )
    for admin in admins:
        ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=admin
        )


def _serialize_conversation(conversation: Conversation, current_user: User) -> ConversationSchema:
    # Fetch participants
    participants_qs = conversation.participants.select_related('user').all()
    participants_list = []
    current_user_last_read = None

    for p in participants_qs:
        if p.user_id == current_user.id:
            current_user_last_read = p.last_read_at

        participants_list.append(
            ConversationParticipantSchema(
                id=p.id,
                conversation_id=p.conversation_id,
                user_id=p.user_id,
                joined_at=p.joined_at,
                last_read_at=p.last_read_at,
                user=_format_user_minimal(p.user)
            )
        )

    # Compute contextual title for DIRECT chats
    title = conversation.title
    if conversation.type == Conversation.DIRECT:
        party_ids = []
        if conversation.direct_key and ':' in conversation.direct_key:
            party_ids = [pid.strip() for pid in conversation.direct_key.split(':') if pid.strip()]
        else:
            party_ids = [str(p.user_id) for p in participants_qs]

        is_current_user_primary = str(current_user.id) in party_ids

        if is_current_user_primary:
            # Show the other direct party's name
            other_party_id = next((pid for pid in party_ids if str(pid) != str(current_user.id)), None)
            other_p = next((p for p in participants_qs if str(p.user_id) == str(other_party_id)), None)
            if other_p and other_p.user:
                full_name = f"{other_p.user.first_name or ''} {other_p.user.last_name or ''}".strip()
                title = full_name or other_p.user.email
            else:
                title = "Direct Message"
        else:
            # Current user is an observing Admin watching this 1-on-1 chat
            primary_participants = [p.user for p in participants_qs if str(p.user_id) in party_ids]
            if len(primary_participants) >= 2:
                u1, u2 = primary_participants[0], primary_participants[1]
                name1 = f"{u1.first_name or ''} {u1.last_name or ''}".strip() or u1.email
                name2 = f"{u2.first_name or ''} {u2.last_name or ''}".strip() or u2.email
                title = f"{name1} & {name2} (1-on-1)"
            elif len(primary_participants) == 1:
                u1 = primary_participants[0]
                name1 = f"{u1.first_name or ''} {u1.last_name or ''}".strip() or u1.email
                title = f"{name1} (1-on-1)"
            else:
                title = "Direct Message"

    # Unread messages count for current user
    unread_qs = conversation.messages.exclude(sender_id=current_user.id)
    if current_user_last_read:
        unread_qs = unread_qs.filter(created_at__gt=current_user_last_read)
    unread_count = unread_qs.count()

    # Latest message preview
    last_msg_obj = conversation.messages.select_related('sender').order_by('-created_at').first()
    last_msg_schema = None
    if last_msg_obj:
        last_msg_schema = ChatMessageSchema(
            id=last_msg_obj.id,
            conversation_id=last_msg_obj.conversation_id,
            sender_id=last_msg_obj.sender_id,
            content=last_msg_obj.content,
            is_edited=last_msg_obj.is_edited,
            created_at=last_msg_obj.created_at,
            updated_at=last_msg_obj.updated_at,
            sender=_format_user_minimal(last_msg_obj.sender)
        )

    return ConversationSchema(
        id=conversation.id,
        title=title,
        type=conversation.type,
        created_by_id=conversation.created_by_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=participants_list,
        unread_count=unread_count,
        last_message=last_msg_schema
    )


@chat_router.get("/conversations", response=List[ConversationSchema])
@chat_router.get("/conversations/", response=List[ConversationSchema])
def list_conversations(request):
    """
    List all active conversations for the authenticated user
    with unread message counts and the latest message preview.
    If the user is an ADMIN, ensure they are automatically enrolled in
    all existing conversations in their organization.
    """
    org = request.user.organization

    if request.user.role == 'ADMIN':
        all_conv_ids = Conversation.objects.filter(organization=org).values_list('id', flat=True)
        missing_conv_ids = all_conv_ids.exclude(
            participants__user=request.user
        )
        if missing_conv_ids.exists():
            ConversationParticipant.objects.bulk_create([
                ConversationParticipant(conversation_id=cid, user=request.user)
                for cid in missing_conv_ids
            ], ignore_conflicts=True)

    user_conversations_ids = ConversationParticipant.objects.filter(
        user=request.user,
        conversation__organization=org
    ).values_list('conversation_id', flat=True)

    conversations = Conversation.objects.filter(
        id__in=user_conversations_ids,
        organization=org
    ).prefetch_related('participants__user', 'messages__sender').order_by('-updated_at')

    return [_serialize_conversation(c, request.user) for c in conversations]


@chat_router.post("/conversations", response={200: ConversationSchema, 201: ConversationSchema})
@chat_router.post("/conversations/", response={200: ConversationSchema, 201: ConversationSchema})
def create_or_get_conversation(request, data: CreateConversationSchema):
    """
    Create or retrieve an existing 1-on-1 direct chat, or initialize a group chat.
    All organization admins are automatically added as participants to every conversation.
    """
    org = request.user.organization

    if data.type == Conversation.DIRECT:
        # Determine target recipient ID
        target_recipient_id = data.recipient_id
        if not target_recipient_id and data.participant_ids:
            for pid in data.participant_ids:
                if str(pid) != str(request.user.id):
                    target_recipient_id = pid
                    break

        if not target_recipient_id or str(target_recipient_id) == str(request.user.id):
            raise HttpError(400, "Recipient user ID is required for direct conversation.")

        recipient = User.objects.filter(id=target_recipient_id, organization=org).first()
        if not recipient:
            raise HttpError(404, "Recipient user not found in your organization.")

        direct_key = f"{min(str(request.user.id), str(recipient.id))}:{max(str(request.user.id), str(recipient.id))}"

        # 1. Search by canonical direct_key
        existing = Conversation.objects.filter(
            organization=org,
            type=Conversation.DIRECT,
            direct_key=direct_key
        ).first()

        # 2. Backward compatibility search for older direct chats without direct_key
        if not existing:
            existing = Conversation.objects.filter(
                organization=org,
                type=Conversation.DIRECT
            ).filter(
                participants__user=request.user
            ).filter(
                participants__user=recipient
            ).distinct().first()

            if existing and not existing.direct_key:
                existing.direct_key = direct_key
                existing.save(update_fields=['direct_key'])

        if existing:
            ensure_admins_in_conversation(existing)
            return 200, _serialize_conversation(existing, request.user)

        # Create new DIRECT conversation
        conv = Conversation.objects.create(
            organization=org,
            type=Conversation.DIRECT,
            direct_key=direct_key,
            created_by=request.user
        )
        ConversationParticipant.objects.get_or_create(conversation=conv, user=request.user)
        ConversationParticipant.objects.get_or_create(conversation=conv, user=recipient)
        ensure_admins_in_conversation(conv)

        return 201, _serialize_conversation(conv, request.user)

    elif data.type == Conversation.GROUP:
        if not data.title or not data.title.strip():
            raise HttpError(400, "Title is required for group conversations.")

        conv = Conversation.objects.create(
            organization=org,
            title=data.title.strip(),
            type=Conversation.GROUP,
            created_by=request.user
        )

        # Always add creator
        ConversationParticipant.objects.get_or_create(conversation=conv, user=request.user)

        # Add additional participants
        if data.participant_ids:
            other_users = User.objects.filter(
                id__in=data.participant_ids,
                organization=org
            ).exclude(id=request.user.id)

            for u in other_users:
                ConversationParticipant.objects.get_or_create(conversation=conv, user=u)

        # Ensure all admins in organization are automatically in the group chat
        ensure_admins_in_conversation(conv)

        return 201, _serialize_conversation(conv, request.user)

    else:
        raise HttpError(400, "Invalid conversation type. Must be 'DIRECT' or 'GROUP'.")


@chat_router.get("/conversations/{id}/messages", response=List[ChatMessageSchema])
@chat_router.get("/conversations/{id}/messages/", response=List[ChatMessageSchema])
def list_messages(request, id: UUID, limit: int = 50, offset: int = 0):
    """
    Paginated message history for a conversation.
    """
    is_participant = ConversationParticipant.objects.filter(
        conversation_id=id,
        user=request.user,
        conversation__organization=request.user.organization
    ).exists()

    if not is_participant and request.user.role == 'ADMIN':
        conv = Conversation.objects.filter(id=id, organization=request.user.organization).first()
        if conv:
            ConversationParticipant.objects.get_or_create(conversation=conv, user=request.user)
            is_participant = True

    if not is_participant:
        raise HttpError(404, "Conversation not found or access denied.")

    limit = max(1, min(100, limit))
    offset = max(0, offset)

    messages = ChatMessage.objects.filter(
        conversation_id=id
    ).select_related('sender').order_by('created_at')[offset:offset + limit]

    return [
        ChatMessageSchema(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            content=m.content,
            is_edited=m.is_edited,
            created_at=m.created_at,
            updated_at=m.updated_at,
            sender=_format_user_minimal(m.sender)
        )
        for m in messages
    ]


@chat_router.post("/conversations/{id}/messages", response={201: ChatMessageSchema})
@chat_router.post("/conversations/{id}/messages/", response={201: ChatMessageSchema})
def send_message(request, id: UUID, data: CreateChatMessageSchema):
    """
    Send a new message, update `updatedAt` on the conversation, and broadcast `message:new`.
    """
    if not data.content or not data.content.strip():
        raise HttpError(400, "Message content cannot be empty.")

    participant = ConversationParticipant.objects.filter(
        conversation_id=id,
        user=request.user,
        conversation__organization=request.user.organization
    ).first()

    if not participant and request.user.role == 'ADMIN':
        conv = Conversation.objects.filter(id=id, organization=request.user.organization).first()
        if conv:
            participant, _ = ConversationParticipant.objects.get_or_create(conversation=conv, user=request.user)

    if not participant:
        raise HttpError(404, "Conversation not found or access denied.")

    now = timezone.now()

    # Create message
    msg = ChatMessage.objects.create(
        conversation_id=id,
        sender=request.user,
        content=data.content.strip()
    )

    # Update conversation timestamp & sender's last read timestamp
    Conversation.objects.filter(id=id).update(updated_at=now)
    participant.last_read_at = now
    participant.save(update_fields=['last_read_at'])

    msg_schema = ChatMessageSchema(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        is_edited=msg.is_edited,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
        sender=_format_user_minimal(request.user)
    )

    # Broadcast message:new event to conversation participants via SSE manager
    chat_event_manager.publish_to_conversation(
        conversation_id=str(id),
        event_type="message:new",
        data={
            "conversation_id": str(id),
            "message": msg_schema.dict()
        }
    )

    return 201, msg_schema


@chat_router.post("/conversations/{id}/read", response=MarkReadResponseSchema)
@chat_router.post("/conversations/{id}/read/", response=MarkReadResponseSchema)
def mark_conversation_read(request, id: UUID):
    """
    Update `lastReadAt` for the current user and broadcast `message:read`.
    """
    participant = ConversationParticipant.objects.filter(
        conversation_id=id,
        user=request.user,
        conversation__organization=request.user.organization
    ).first()

    if not participant:
        raise HttpError(404, "Conversation not found or access denied.")

    now = timezone.now()
    participant.last_read_at = now
    participant.save(update_fields=['last_read_at'])

    # Broadcast message:read event to conversation participants via SSE manager
    chat_event_manager.publish_to_conversation(
        conversation_id=str(id),
        event_type="message:read",
        data={
            "conversation_id": str(id),
            "user_id": str(request.user.id),
            "last_read_at": now.isoformat()
        }
    )

    return MarkReadResponseSchema(success=True, last_read_at=now)


@chat_router.get("/events")
@chat_router.get("/events/")
def chat_events_stream(request, token: Optional[str] = None):
    """
    Real-time Server-Sent Events (SSE) connection stream with JWT token authentication.
    Broadcasting hub for `message:new` and `message:read` events.
    """
    user = getattr(request, 'user', None)

    # Authenticate query parameter token if not authenticated via header
    if (not user or user.is_anonymous) and token:
        try:
            jwt_auth = JWTAuth()
            dummy_req = request
            dummy_req.META = dict(request.META)
            dummy_req.META['HTTP_AUTHORIZATION'] = f"Bearer {token}"
            user = jwt_auth.authenticate(dummy_req)
        except Exception:
            user = None

    if not user or user.is_anonymous:
        return HttpResponse("Authentication required for SSE stream.", status=401)

    user_id_str = str(user.id)
    event_queue = chat_event_manager.subscribe(user_id_str)

    def event_stream():
        try:
            # Yield initial connection confirmation frame
            yield f'event: connected\ndata: {{"status": "ok", "user_id": "{user_id_str}"}}\n\n'

            while True:
                try:
                    # Wait up to 15 seconds for queued SSE messages
                    data = event_queue.get(timeout=15)
                    yield data
                except Exception:
                    # Heartbeat ping frame to keep connection active and detect drops
                    yield ": ping\n\n"
        finally:
            chat_event_manager.unsubscribe(user_id_str, event_queue)

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
