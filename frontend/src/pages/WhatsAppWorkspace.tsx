import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/api/client'
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppAccount, User } from '@/types/crm'
import {
  MessageSquare,
  Send,
  Plus,
  UserCheck,
  ClipboardList,
  Sparkles,
  Zap,
  PhoneCall,
  User as UserIcon,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

export default function WhatsAppWorkspace() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([])
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [activeConv, setActiveConv] = useState<WhatsAppConversation | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Input states
  const [currMessageText, setCurrMessageText] = useState('')
  const [newAccPhone, setNewAccPhone] = useState('')
  const [newAccName, setNewAccName] = useState('')
  const [isConnectOpen, setIsConnectOpen] = useState(false)

  // Simulation state
  const [simPhone, setSimPhone] = useState('+15550293847')
  const [simName, setSimName] = useState('Alice Henderson')
  const [simText, setSimText] = useState('Hey Mintana team! I wanted to follow up on the custom quotes you sent over earlier.')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchBaseData = async () => {
    try {
      const [accRes, convRes, userRes] = await Promise.all([
        apiClient.get<WhatsAppAccount[]>('/whatsapp/accounts'),
        apiClient.get<WhatsAppConversation[]>('/whatsapp/conversations'),
        apiClient.get<User[]>('/accounts')
      ])
      setAccounts(accRes.data)
      setConversations(convRes.data)
      setUsers(userRes.data)
      if (convRes.data.length > 0 && !activeConv) {
        setActiveConv(convRes.data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBaseData()
  }, [])

  const loadActiveMessages = async (convId: string) => {
    try {
      const response = await apiClient.get<WhatsAppMessage[]>(`/whatsapp/conversations/${convId}/messages`)
      setMessages(response.data)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 80)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (activeConv) {
      loadActiveMessages(activeConv.id)
    } else {
      setMessages([])
    }
  }, [activeConv])

  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccPhone || !newAccName) return
    try {
      const response = await apiClient.post<WhatsAppAccount>('/whatsapp/accounts', {
        phone_number: newAccPhone,
        display_name: newAccName
      })
      setAccounts([...accounts, response.data])
      setNewAccPhone('')
      setNewAccName('')
      setIsConnectOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConv || !currMessageText.trim()) return
    const textToSend = currMessageText
    setCurrMessageText('')
    try {
      const response = await apiClient.post<WhatsAppMessage>(`/whatsapp/conversations/${activeConv.id}/messages`, null, {
        params: { text: textToSend }
      })
      setMessages(prev => [...prev, response.data])
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssignConversation = async (userId: string) => {
    if (!activeConv) return
    try {
      await apiClient.put(`/whatsapp/conversations/${activeConv.id}/assign`, null, {
        params: { user_id: userId || undefined }
      })
      const updated = {
        ...activeConv,
        assigned_to: users.find(u => u.id === userId) || undefined
      }
      setActiveConv(updated)
      setConversations(conversations.map(c => c.id === activeConv.id ? updated : c))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateTask = async () => {
    if (!activeConv) return
    const title = prompt('Enter a title for the WhatsApp reference task:', 'Follow up on WhatsApp conversation')
    if (!title) return
    try {
      await apiClient.post(`/whatsapp/conversations/${activeConv.id}/create-task`, null, {
        params: { title, description: `Task created from chat conversion log with WhatsApp number.` }
      })
      alert('Task generated successfully.')
    } catch (err) {
      console.error(err)
    }
  }

  const handleSimulateIncoming = async () => {
    if (accounts.length === 0) {
      alert('Please connect at least one mock WhatsApp account first.')
      return
    }
    try {
      // Simulate incoming message to first active account
      const acc = accounts[0]
      await apiClient.post('/whatsapp/simulate-incoming-whatsapps', null, {
        params: {
          account_id: acc.id,
          sender_phone: simPhone,
          sender_name: simName,
          message_text: simText
        }
      })
      // Reload conversations list
      const convRes = await apiClient.get<WhatsAppConversation[]>('/whatsapp/conversations')
      setConversations(convRes.data)
      const matches = convRes.data.find(c => c.contact?.phone === simPhone)
      if (matches) {
        setActiveConv(matches)
        loadActiveMessages(matches.id)
      } else {
        alert('Simulation finished. A background workflow check was run.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <MessageSquare className="h-10 w-10 text-indigo-500 animate-spin" />
        <span className="ml-3 text-zinc-450 text-sm">Processing WhatsApp Conversations...</span>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-4">
      {/* Simulation trigger header alert */}
      <div className="bg-indigo-650/15 border border-indigo-600/30 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-bounce" />
          <div>
            <span className="text-xs font-bold text-zinc-200">WhatsApp Inbound Signal Testing Panel</span>
            <p className="text-[10px] text-zinc-450 mt-0.5">Fire a mock customer webhook message payload to evaluate automations rules triggers.</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
          <input
            type="text"
            placeholder="Sim. Phone"
            value={simPhone}
            onChange={e => setSimPhone(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-900 px-2 py-1.5 rounded-lg text-[10px] focus:outline-none w-28 text-zinc-300"
          />
          <input
            type="text"
            placeholder="Sender Name"
            value={simName}
            onChange={e => setSimName(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-900 px-2 py-1.5 rounded-lg text-[10px] focus:outline-none w-28 text-zinc-300"
          />
          <input
            type="text"
            placeholder="Message Content"
            value={simText}
            onChange={e => setSimText(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-900 px-2 py-1.5 rounded-lg text-[10px] focus:outline-none w-44 text-zinc-300"
          />
          <button
            onClick={handleSimulateIncoming}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Zap className="h-3 w-3" />
            Fire Webhook Trigger
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* Left conversations selection list */}
        <div className="lg:col-span-1 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-850 flex justify-between items-center bg-zinc-950/20">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Connected Accounts</span>
            <button
              onClick={() => setIsConnectOpen(true)}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Accounts list */}
          <div className="px-2 py-1 max-h-24 overflow-y-auto border-b border-zinc-850 space-y-1">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-2 rounded bg-zinc-950/20 border border-zinc-900/60 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="h-3 w-3 text-emerald-400" />
                  <span className="text-zinc-200 font-semibold">{acc.display_name}</span>
                </div>
                <span className="text-emerald-500 text-[9px] font-bold">Online</span>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="text-[10px] text-zinc-550 text-center py-2">No connected Business lines.</div>
            )}
          </div>

          <div className="p-4 bg-zinc-900/40 border-b border-zinc-850">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Conversations Log</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {conversations.map(c => {
              const displayTitle = c.contact
                ? `${c.contact.first_name} ${c.contact.last_name}`
                : 'Unknown Customer'
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all text-xs flex flex-col gap-1 ${
                    activeConv?.id === c.id
                      ? 'bg-indigo-600/10 text-indigo-400 border-indigo-650/40 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/40 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{displayTitle}</span>
                    {c.unread_count > 0 && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    )}
                  </div>
                  <span className="text-[10px] font-normal text-zinc-550 truncate">
                    {c.contact?.phone || 'No phone number'}
                  </span>
                </div>
              )
            })}
            {conversations.length === 0 && (
              <div className="text-xs text-zinc-650 text-center py-8">None logged yet.</div>
            )}
          </div>
        </div>

        {/* Messaging conversation block */}
        <div className="lg:col-span-3 bg-zinc-905/70 rounded-2xl border border-zinc-850 flex flex-col overflow-hidden justify-between">
          {activeConv ? (
            <>
              {/* Conversation Top Header info panel */}
              <div className="p-4 border-b border-zinc-850 flex justify-between items-center bg-zinc-950/40">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200">
                    Active Chatting: {activeConv.contact ? `${activeConv.contact.first_name} ${activeConv.contact.last_name}` : 'Unknown Customer'}
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-semibold">{activeConv.contact?.phone}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Assign Rep selection */}
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                    <select
                      value={activeConv.assigned_to?.id || ''}
                      onChange={e => handleAssignConversation(e.target.value)}
                      className="bg-zinc-950 border border-zinc-900 text-[10px] px-2 py-1 rounded max-w-[130px] font-medium text-zinc-300 focus:outline-none"
                    >
                      <option value="">Unassigned Rep</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Create Task Button */}
                  <button
                    onClick={handleCreateTask}
                    className="p-1 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardList className="h-3 w-3" />
                    Task Link
                  </button>
                </div>
              </div>

              {/* Message Streams scrolling */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-950/20">
                {messages.map(m => {
                  const isAgent = m.sender_type === 'AGENT'
                  return (
                    <div key={m.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl text-xs space-y-1 ${
                          isAgent
                            ? 'bg-indigo-600/90 text-white rounded-tr-none shadow-md shadow-indigo-600/10'
                            : 'bg-zinc-900 border border-zinc-850/80 text-zinc-200 rounded-tl-none'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4 text-[9px] font-bold uppercase text-zinc-350">
                          <span>{m.sender_name}</span>
                          <span>{new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Typing Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-850 flex gap-2 bg-zinc-950/40">
                <input
                  type="text"
                  placeholder="Type your WhatsApp reply message..."
                  value={currMessageText}
                  onChange={e => setCurrMessageText(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800/80 text-xs px-3 py-2 rounded-xl flex-1 focus:outline-none focus:border-indigo-600 text-zinc-200"
                />
                <button
                  type="submit"
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white cursor-pointer shadow-lg shadow-indigo-650/15"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-550 h-full bg-zinc-950/10">
              <MessageSquare className="h-8 w-8 text-zinc-700 mb-3" />
              <span className="text-xs">Select a customer conversation or execute inbound signals to start debugging.</span>
            </div>
          )}
        </div>
      </div>

      {/* Connect account dialog modal */}
      {isConnectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl w-full max-w-sm space-y-4">
            <div>
              <span className="text-xs font-bold text-zinc-200">Connect Business WhatsApp Numbers</span>
              <p className="text-[10px] text-zinc-500 mt-1">Declare phone number and display name for this channel.</p>
            </div>
            <form onSubmit={handleConnectAccount} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-zinc-400">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +14155552671"
                  value={newAccPhone}
                  onChange={e => setNewAccPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-650"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">Display Line Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Inbound Support"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-650"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg text-xs cursor-pointer">
                  Connect Line
                </button>
                <button type="button" onClick={() => setIsConnectOpen(false)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-405 rounded-lg cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
