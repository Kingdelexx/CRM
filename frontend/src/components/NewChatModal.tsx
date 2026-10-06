import { useState, useEffect } from 'react'
import { X, Search, Users, User as UserIcon, Plus, Loader2 } from 'lucide-react'
import { apiClient } from '@/api/client'
import type { User } from '@/types/crm'
import type { Conversation } from '@/types/chat'

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onConversationCreated: (conversation: Conversation) => void
  currentUser: User | null
}

export default function NewChatModal({
  isOpen,
  onClose,
  onConversationCreated,
  currentUser
}: NewChatModalProps) {
  const [chatType, setChatType] = useState<'DIRECT' | 'GROUP'>('DIRECT')
  const [groupTitle, setGroupTitle] = useState('')
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchUsers = async () => {
      setIsLoadingUsers(true)
      setErrorMsg(null)
      try {
        const res = await apiClient.get<User[]>('/accounts/')
        // Filter out current user
        const list = (Array.isArray(res.data) ? res.data : []).filter(
          (u) => u.id !== currentUser?.id && u.is_active !== false
        )
        setTeamMembers(list)
      } catch (err) {
        console.error('Failed fetching team members', err)
        setErrorMsg('Failed to load team members.')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [isOpen, currentUser])

  if (!isOpen) return null

  const filteredMembers = teamMembers.filter((user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
    const email = (user.email || '').toLowerCase()
    const query = searchTerm.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  const toggleUserSelection = (userId: string) => {
    if (chatType === 'DIRECT') {
      setSelectedRecipientId(userId)
    } else {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      )
    }
  }

  const handleCreateChat = async () => {
    setErrorMsg(null)

    if (chatType === 'DIRECT') {
      if (!selectedRecipientId) {
        setErrorMsg('Please select a team member to message.')
        return
      }
    } else {
      if (!groupTitle.trim()) {
        setErrorMsg('Please enter a group title.')
        return
      }
      if (selectedUserIds.length === 0) {
        setErrorMsg('Please select at least one member for the group chat.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload =
        chatType === 'DIRECT'
          ? { type: 'DIRECT', recipient_id: selectedRecipientId }
          : { type: 'GROUP', title: groupTitle.trim(), participant_ids: selectedUserIds }

      const response = await apiClient.post<Conversation>('/chat/conversations', payload)
      onConversationCreated(response.data)
      onClose()
    } catch (err: any) {
      console.error('Error creating conversation', err)
      setErrorMsg(err.response?.data?.message || 'Failed to initialize conversation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Start New Conversation</h3>
            <p className="text-xs text-slate-500">Connect with colleagues across your workspace</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Type Tabs */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setChatType('DIRECT')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                chatType === 'DIRECT'
                  ? 'bg-white text-indigo-600 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>1-on-1 Direct Chat</span>
            </button>
            <button
              onClick={() => {
                setChatType('GROUP')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                chatType === 'GROUP'
                  ? 'bg-white text-indigo-600 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Group Channel</span>
            </button>
          </div>

          {/* Group Title Input */}
          {chatType === 'GROUP' && (
            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Group Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sales Operations & Logistics"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Team Member List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-1.5 min-h-[220px]">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold mb-2">
              {errorMsg}
            </div>
          )}

          {isLoadingUsers ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading staff directory...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No staff members match your search filter.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected =
                chatType === 'DIRECT'
                  ? selectedRecipientId === member.id
                  : selectedUserIds.includes(member.id)

              const initials = (
                (member.first_name?.[0] || '') + (member.last_name?.[0] || '')
              ).toUpperCase() || member.email[0].toUpperCase()

              return (
                <div
                  key={member.id}
                  onClick={() => toggleUserSelection(member.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-indigo-600/15 border border-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {member.first_name} {member.last_name}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {member.email} • {member.role || 'Staff'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Plus className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChat}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Initializing...</span>
              </>
            ) : (
              <span>Start Chat</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
