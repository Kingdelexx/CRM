import json
import logging
import queue
import threading
from typing import Dict, Set, Any
from uuid import UUID

logger = logging.getLogger(__name__)


class ChatEventManager:
    """
    Lightweight, thread-safe Server-Sent Events (SSE) Event Hub for real-time chat broadcasts.
    Manages active event queues for connected users and dispatches event payloads
    (`message:new`, `message:read`) to conversation participants.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # Maps user_id (str) -> Set[queue.Queue]
        self._listeners: Dict[str, Set[queue.Queue]] = {}

    def subscribe(self, user_id: str) -> queue.Queue:
        """
        Registers a new listener queue for an authenticated user.
        """
        q = queue.Queue(maxsize=100)
        with self._lock:
            if user_id not in self._listeners:
                self._listeners[user_id] = set()
            self._listeners[user_id].add(q)
        logger.debug(f"[ChatEventManager] User {user_id} subscribed to SSE events.")
        return q

    def unsubscribe(self, user_id: str, q: queue.Queue):
        """
        Removes a listener queue when an SSE client disconnects.
        """
        with self._lock:
            if user_id in self._listeners:
                self._listeners[user_id].discard(q)
                if not self._listeners[user_id]:
                    del self._listeners[user_id]
        logger.debug(f"[ChatEventManager] User {user_id} unsubscribed from SSE events.")

    def publish_to_user(self, user_id: str, event_type: str, data: Any):
        """
        Publishes an event payload to all active connections of a specific user.
        """
        user_str = str(user_id)
        sse_formatted = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

        with self._lock:
            queues = list(self._listeners.get(user_str, []))

        for q in queues:
            try:
                q.put_nowait(sse_formatted)
            except queue.Full:
                logger.warning(f"[ChatEventManager] Queue full for user {user_str}. Dropping frame.")

    def publish_to_conversation(self, conversation_id: str, event_type: str, data: Any):
        """
        Broadcasting helper: Fetches all participant user IDs of a conversation
        and dispatches the event payload to each active participant.
        """
        from apps.chat.models import ConversationParticipant
        
        try:
            participant_user_ids = list(
                ConversationParticipant.objects.filter(
                    conversation_id=conversation_id
                ).values_list('user_id', flat=True)
            )
            for uid in participant_user_ids:
                self.publish_to_user(str(uid), event_type, data)
        except Exception as e:
            logger.error(f"[ChatEventManager Error] Failed publishing '{event_type}' to conversation {conversation_id}: {e}")


# Singleton Event Manager Instance
chat_event_manager = ChatEventManager()
