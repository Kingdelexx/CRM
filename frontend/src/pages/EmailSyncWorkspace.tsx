import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import {
  Mail,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Link2,
  AlertCircle,
  Inbox
} from 'lucide-react'

interface EmailAccount {
  id: string;
  email_address: string;
  provider: string;
  is_connected: boolean;
}

export default function EmailSyncWorkspace() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Connection Form State
  const [emailAddress, setEmailAddress] = useState('')
  const [provider, setProvider] = useState<'GMAIL' | 'MICROSOFT' | 'SMTP'>('GMAIL')
  const [isConnectOpen, setIsConnectOpen] = useState(false)

  // Simulation Form State
  const [simSender, setSimSender] = useState('contact@acme.corp')
  const [simRecipient, setSimRecipient] = useState('sales@mintana.org')
  const [simSubject, setSimSubject] = useState('Requesting Quote Expansion Details')
  const [simBody, setSimBody] = useState('Hi Sales Team,\n\nWe would like to request an updated quotation for 50 additional CRM seats. Please send over standard contracts.\n\nThanks,\nAcme Inbound Lead Team')

  const fetchAccounts = async () => {
    try {
      const response = await apiClient.get<EmailAccount[]>('/emails/accounts')
      setAccounts(response.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailAddress) return
    try {
      const response = await apiClient.post<EmailAccount>('/emails/accounts', {
        email_address: emailAddress,
        provider
      })
      setAccounts([...accounts, response.data])
      setEmailAddress('')
      setIsConnectOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this email address line?')) return
    try {
      await apiClient.delete(`/emails/accounts/${id}`)
      setAccounts(accounts.filter(a => a.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSimulateReceive = async () => {
    if (!simSender || !simRecipient) return
    try {
      const response = await apiClient.post<{ status: string; linked_contact: string | null; message?: string }>(
        '/emails/simulate-receive',
        null,
        {
          params: {
            sender: simSender,
            recipient: simRecipient,
            subject: simSubject,
            body: simBody
          }
        }
      )
      if (response.data.linked_contact) {
        alert(`Email parsed successfully. Logged on contact timeline of: ${response.data.linked_contact}`)
      } else {
        alert(response.data.message || 'Logged successfully, but no matching CRM lead is registered with this email.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Mail className="h-10 w-10 text-indigo-500 animate-spin" />
        <span className="ml-3 text-zinc-450 text-sm">Processing Sales Lines...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Simulation webhook alert card */}
      <div className="bg-indigo-650/15 border border-indigo-600/30 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
          <div>
            <span className="text-xs font-bold text-zinc-200">Email Pipeline webhook Simulator</span>
            <p className="text-[10px] text-zinc-450 mt-0.5">Mock receiving customer emails to verify automated timeline ingestion logs.</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
          <input
            type="text"
            placeholder="From: Sender Email"
            value={simSender}
            onChange={e => setSimSender(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-900 px-2 py-1.5 rounded-lg text-[10px] focus:outline-none w-36 text-zinc-300"
          />
          <input
            type="text"
            placeholder="Subject Line"
            value={simSubject}
            onChange={e => setSimSubject(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-900 px-2 py-1.5 rounded-lg text-[10px] focus:outline-none w-36 text-zinc-300"
          />
          <button
            onClick={handleSimulateReceive}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg text-[10px] flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Send className="h-3 w-3" />
            Fire Mock Ingest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linked Accounts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Associated Sales Inbox Channels</span>
            <button
              onClick={() => setIsConnectOpen(true)}
              className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-800 font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Link Address
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-zinc-900/40 p-4 border border-zinc-850/80 rounded-2xl flex flex-col justify-between h-32">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-450" />
                    <div>
                      <span className="text-xs font-semibold text-zinc-200 block truncate max-w-[150px]">{acc.email_address}</span>
                      <span className="text-[9px] text-zinc-550 block font-bold uppercase tracking-wider">{acc.provider} Setup</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">CONNECTED</span>
                </div>

                <div className="border-t border-zinc-850/80 pt-2 text-right">
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="text-[10px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1 px-2.5 rounded cursor-pointer transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="col-span-2 py-12 bg-zinc-900/15 border border-zinc-850 rounded-2xl text-center text-zinc-600 text-xs">
                No active sales inbox links configured. Click "Link Address" above.
              </div>
            )}
          </div>
        </div>

        {/* Simulation configuration details */}
        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-855 h-fit space-y-4 backdrop-blur-sm">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">Simulation mail details</span>
          <div className="space-y-3.5 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-zinc-450">Recipient Sales Inbox</label>
              <input
                type="text"
                value={simRecipient}
                onChange={e => setSimRecipient(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-300 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-450">Inbound Mail Text Draft</label>
              <textarea
                rows={4}
                value={simBody}
                onChange={e => setSimBody(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 p-3 rounded-lg text-zinc-305 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connect Account Drawer Dialog */}
      {isConnectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <span className="text-xs font-bold text-zinc-200">Connect Sales Inbox Link</span>
              <p className="text-[10px] text-zinc-550 mt-1">Bind SMTP, Google, or Outlook email lines.</p>
            </div>
            <form onSubmit={handleConnect} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-zinc-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="sales@acme.corp"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">Mail Connection Provider</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="GMAIL">Google Identity Platform</option>
                  <option value="MICROSOFT">Microsoft Outlook Office</option>
                  <option value="SMTP">Standard SMTP Protocol</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg text-xs cursor-pointer">
                  Sync Email Line
                </button>
                <button type="button" onClick={() => setIsConnectOpen(false)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg cursor-pointer">
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
