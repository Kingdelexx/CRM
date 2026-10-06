import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Plus,
  Send,
  Loader2,
  MessageSquare,
  Users,
  User as UserIcon,
  Check,
  CheckCheck,
  Circle,
  MoreVertical,
  AlertCircle
} from 'lucide-react'
import { apiClient } from '@/api/client'
import type { User } from '@/types/crm'
import type { Conversation, ChatMessage } from '@/types/chat'
import NewChatModal from '@/components/NewChatModal'

interface ChatWorkspaceProps {
  currentUser?: User | null
}

export default function ChatWorkspace({ currentUser }: ChatWorkspaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. Fetch Conversations on Mount
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true)
      try {
        const res = await apiClient.get<Conversation[]>('/chat/conversations')
        const list = Array.isArray(res.data) ? res.data : []
        setConversations(list)
        if (list.length > 0 && !activeConversationId) {
          setActiveConversationId(list[0].id)
        }
      } catch (err) {
        console.error('Failed loading conversations', err)
      } finally {
        setIsLoadingConversations(false)
      }
    }

    fetchConversations()
  }, [])

  // 2. Fetch Messages & Mark Read when Active Conversation Changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    const fetchMessagesAndMarkRead = async () => {
      setIsLoadingMessages(true)
      try {
        const res = await apiClient.get<ChatMessage[]>(
          `/chat/conversations/${activeConversationId}/messages`
        )
        setMessages(Array.isArray(res.data) ? res.data : [])

        // Clear unread badge in state & send server read receipt
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
        )
        apiClient.post(`/chat/conversations/${activeConversationId}/read`).catch(() => {})
      } catch (err) {
        console.error('Failed fetching messages', err)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    fetchMessagesAndMarkRead()
  }, [activeConversationId])

  // 3. Real-Time SSE Listener Integration
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const sseUrl = `${import.meta.env.VITE_API_URL || '/api'}/chat/events?token=${token}`
    const eventSource = new EventSource(sseUrl)

    eventSource.addEventListener('message:new', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const incomingMsg: ChatMessage = payload.message
        const convId = payload.conversation_id

        setConversations((prev) => {
          return prev.map((c) => {
            if (c.id === convId) {
              const isCurrent = convId === activeConversationId
              return {
                ...c,
                last_message: incomingMsg,
                updated_at: incomingMsg.created_at,
                unread_count: isCurrent ? 0 : c.unread_count + 1
              }
            }
            return c
          })
        })

        // If message belongs to active conversation, append it & mark read
        setActiveConversationId((currentActiveId) => {
          if (convId === currentActiveId) {
            setMessages((prevMsgs) => {
              if (prevMsgs.some((m) => m.id === incomingMsg.id)) return prevMsgs
              return [...prevMsgs, incomingMsg]
            })
            apiClient.post(`/chat/conversations/${convId}/read`).catch(() => {})
          }
          return currentActiveId
        })
      } catch (err) {
        console.error('Failed parsing message:new SSE event', err)
      }
    })

    eventSource.addEventListener('message:read', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const convId = payload.conversation_id
        const readUserId = payload.user_id
        const lastReadAt = payload.last_read_at

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              return {
                ...c,
                participants: c.participants.map((p) =>
                  p.user_id === readUserId ? { ...p, last_read_at: lastReadAt } : p
                )
              }
            }
            return c
          })
        )
      } catch (err) {
        console.error('Failed parsing message:read SSE event', err)
      }
    })

    return () => {
      eventSource.close()
    }
  }, [activeConversationId])

  // 4. Auto-Scroll to Bottom on Message Updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get active conversation object & recipient info
  const activeConv = conversations.find((c) => c.id === activeConversationId)

  const getRecipientUser = (conv?: Conversation) => {
    if (!conv) return null
    if (conv.type === 'GROUP') return null
    const otherPart = conv.participants.find((p) => p.user_id !== currentUser?.id)
    return otherPart?.user || null
  }

  const activeRecipient = getRecipientUser(activeConv)

  const getConversationTitle = (conv: Conversation) => {
    if (conv.type === 'GROUP') return conv.title || 'Group Channel'
    const other = conv.participants.find((p) => p.user_id !== currentUser?.id)
    if (other?.user) {
      const name = `${other.user.first_name || ''} ${other.user.last_name || ''}`.trim()
      return name || other.user.email
    }
    return 'Direct Chat'
  }

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    const title = getConversationTitle(conv).toLowerCase()
    const query = searchQuery.toLowerCase()
    return title.includes(query)
  })

  // Send Message with Optimistic UI Update
  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConversationId || isSending) return

    const content = inputText.trim()
    setInputText('')
    setIsSending(true)

    // Temp Optimistic Message
    const tempId = `temp-${Date.now()}`
    const tempMsg: ChatMessage = {
      id: tempId,
      conversation_id: activeConversationId,
      sender_id: currentUser?.id || '',
      content,
      is_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isPending: true,
      sender: {
        id: currentUser?.id || '',
        email: currentUser?.email || '',
        first_name: currentUser?.first_name,
        last_name: currentUser?.last_name
      }
    }

    setMessages((prev) => [...prev, tempMsg])

    try {
      const res = await apiClient.post<ChatMessage>(
        `/chat/conversations/${activeConversationId}/messages`,
        { content }
      )
      const confirmedMsg = res.data

      // Replace temp message with confirmed message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? confirmedMsg : m)))

      // Update conversation in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, last_message: confirmedMsg, updated_at: confirmedMsg.created_at }
            : c
        )
      )
    } catch (err) {
      console.error('Failed sending chat message', err)
      // Mark temp message as failed
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isPending: false, hasFailed: true } : m))
      )
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateLabel = (dateStr: string) => {
    const msgDate = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (msgDate.toDateString() === today.toDateString()) return 'Today'
    if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday'

    return msgDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="h-[calc(100vh-100px)] flex bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* LEFT SIDEBAR: Conversation Directory */}
      <div className="w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">Messages</h2>
            </div>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {isLoadingConversations ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs px-4">
              {searchQuery
                ? 'No conversations match your search.'
                : 'No active conversations yet. Click "New Chat" to start messaging.'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId
              const title = getConversationTitle(conv)
              const recipient = getRecipientUser(conv)

              const avatarInitials =
                conv.type === 'GROUP'
                  ? 'GR'
                  : recipient
                  ? (
                      (recipient.first_name?.[0] || '') + (recipient.last_name?.[0] || '')
                    ).toUpperCase() || recipient.email[0].toUpperCase()
                  : 'DM'

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-50/80 border border-indigo-200/80 shadow-xs'
                      : 'hover:bg-slate-200/50 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                        conv.type === 'GROUP'
                          ? 'bg-purple-600/15 border border-purple-600/30 text-purple-700'
                          : 'bg-indigo-600/15 border border-indigo-600/30 text-indigo-700'
                      }`}
                    >
                      {conv.type === 'GROUP' ? <Users className="h-4 w-4" /> : avatarInitials}
                    </div>
                    {/* Active Online Indicator */}
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs"></span>
                  </div>

                  {/* Conversation Preview Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-800 truncate">{title}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatTimestamp(conv.last_message?.created_at || conv.updated_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {conv.last_message ? conv.last_message.content : 'No messages yet'}
                      </p>

                      {conv.unread_count > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN AREA: Chat Feed & Controls */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-slate-50/30 min-w-0">
          {/* Main Chat Header */}
          <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  activeConv.type === 'GROUP'
                    ? 'bg-purple-600/15 text-purple-700 border border-purple-300'
                    : 'bg-indigo-600/15 text-indigo-700 border border-indigo-300'
                }`}
              >
                {activeConv.type === 'GROUP' ? (
                  <Users className="h-4.5 w-4.5" />
                ) : (
                  (
                    (activeRecipient?.first_name?.[0] || '') +
                    (activeRecipient?.last_name?.[0] || '')
                  ).toUpperCase() || (activeRecipient?.email?.[0] || 'D').toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {getConversationTitle(activeConv)}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Circle className="h-2 w-2 fill-emerald-500 stroke-none" /> Active Now
                  </span>
                  <span>•</span>
                  <span className="uppercase font-bold tracking-wider text-indigo-600">
                    {activeConv.type === 'GROUP'
                      ? `${activeConv.participants.length} Members`
                      : 'Direct Message'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Message Feed Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading message history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                No messages in this chat yet. Send a message to start conversing!
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOutgoing = msg.sender_id === currentUser?.id
                const showDateSeparator =
                  index === 0 ||
                  formatDateLabel(messages[index - 1].created_at) !==
                    formatDateLabel(msg.created_at)

                return (
                  <div key={msg.id} className="space-y-4">
                    {/* Date Separator */}
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <span className="bg-slate-200/70 border border-slate-300/50 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {formatDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Chat Message Bubble */}
                    <div
                      className={`flex items-end gap-2 ${
                        isOutgoing ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Avatar for incoming group messages */}
                      {!isOutgoing && activeConv.type === 'GROUP' && (
                        <div className="h-7 w-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700 flex-shrink-0">
                          {msg.sender?.first_name?.[0] || msg.sender?.email?.[0] || 'U'}
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs space-y-1 shadow-xs ${
                          isOutgoing
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        {/* Sender name for incoming group chat */}
                        {!isOutgoing && activeConv.type === 'GROUP' && msg.sender && (
                          <span className="text-[10px] font-bold text-indigo-600 block mb-0.5">
                            {msg.sender.first_name} {msg.sender.last_name}
                          </span>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>

                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                            isOutgoing ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatTimestamp(msg.created_at)}</span>

                          {isOutgoing && (
                            <span>
                              {msg.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin text-white" />
                              ) : msg.hasFailed ? (
                                <AlertCircle className="h-3 w-3 text-red-300" />
                              ) : (
                                <CheckCheck className="h-3.5 w-3.5 text-indigo-200" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Controls */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none resize-none min-h-[38px] max-h-[120px] p-2"
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isSending}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 gap-3 bg-slate-50/20">
          <MessageSquare className="h-12 w-12 text-slate-300" />
          <p className="text-sm font-semibold">Select a conversation or start a new chat.</p>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        currentUser={currentUser || null}
        onConversationCreated={(newConv) => {
          setConversations((prev) => [newConv, ...prev])
          setActiveConversationId(newConv.id)
        }}
      />
    </div>
  )
}
