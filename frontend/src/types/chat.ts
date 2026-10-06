export interface UserMinimal {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string | null;
  user?: UserMinimal | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: UserMinimal | null;
  isPending?: boolean;
  hasFailed?: boolean;
}

export interface Conversation {
  id: string;
  title?: string | null;
  type: 'DIRECT' | 'GROUP';
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  unread_count: number;
  last_message?: ChatMessage | null;
}

export interface CreateConversationPayload {
  title?: string;
  type: 'DIRECT' | 'GROUP';
  participant_ids?: string[];
  recipient_id?: string;
}
