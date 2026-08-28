import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import type { AutomationRule, User } from '@/types/crm'
import {
  Zap,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Settings,
  Sliders,
  Bell,
  CheckSquare
} from 'lucide-react'

export default function AutomationsWorkspace() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Creator form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    event_trigger: 'DEAL_VALUE_LARGE' as AutomationRule['event_trigger'],
    conditionsJson: '{\n  "value_greater_than": 10000\n}',
    actionType: 'CREATE_NOTIFICATION' as 'CREATE_TASK' | 'CREATE_NOTIFICATION',
    actionConfigJson: '{\n  "title": "Large Deal Triggered",\n  "message": "Verify the high-value deal parameters with management."\n}',
    is_active: true
  })

  const loadData = async () => {
    try {
      const [rulesRes, usersRes] = await Promise.all([
        apiClient.get<AutomationRule[]>('/automations'),
        apiClient.get<User[]>('/accounts')
      ])
      setRules(rulesRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    let conditions = {}
    let actionConfig = {}
    try {
      conditions = JSON.parse(formData.conditionsJson)
      actionConfig = JSON.parse(formData.actionConfigJson)
    } catch (err) {
      alert('Invalid JSON formatting in conditions or configurations. Please confirm syntax.')
      return
    }

    const payload = {
      name: formData.name,
      event_trigger: formData.event_trigger,
      conditions,
      actions: [
        {
          type: formData.actionType,
          config: actionConfig
        }
      ],
      is_active: formData.is_active
    }

    try {
      const response = await apiClient.post<AutomationRule>('/automations', payload)
      setRules([...rules, response.data])
      setIsModalOpen(false)
      // reset
      setFormData({
        name: '',
        event_trigger: 'DEAL_VALUE_LARGE',
        conditionsJson: '{\n  "value_greater_than": 10000\n}',
        actionType: 'CREATE_NOTIFICATION',
        actionConfigJson: '{\n  "title": "Large Deal Triggered",\n  "message": "Verify the high-value deal parameters with management."\n}',
        is_active: true
      })
    } catch (err) {
      console.error(err)
      alert('Error creating automation rule.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return
    try {
      await apiClient.delete(`/automations/${id}`)
      setRules(rules.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      const updated = { ...rule, is_active: !rule.is_active }
      const response = await apiClient.put<AutomationRule>(`/automations/${rule.id}`, {
        name: rule.name,
        event_trigger: rule.event_trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        is_active: !rule.is_active
      })
      setRules(rules.map(r => r.id === rule.id ? response.data : r))
    } catch (err) {
      console.error(err)
    }
  }

  const handleTriggerChange = (trigger: AutomationRule['event_trigger']) => {
    let condPreset = '{}'
    let actPreset = '{}'

    if (trigger === 'DEAL_VALUE_LARGE') {
      condPreset = '{\n  "value_greater_than": 50000\n}'
      actPreset = '{\n  "title": "High-Value Deal Alert",\n  "message": "A deal exceeding $50k has been created/updated."\n}'
    } else if (trigger === 'NEW_LEAD') {
      condPreset = '{\n  "source": "webhook"\n}'
      actPreset = '{\n  "title": "New Webhook Lead Ingested",\n  "message": "Coordinate client outreach details immediately."\n}'
    } else if (trigger === 'DEAL_STAGE_CHANGE') {
      condPreset = '{\n  "stage_name": "Closed Won"\n}'
      actPreset = '{\n  "title": "Deal Converted to Won",\n  "message": "Deal has successfully closed. Transition to kickoff phases."\n}'
    } else if (trigger === 'WHATSAPP_RECEIVED') {
      condPreset = '{\n  "contains_keyword": "pricing"\n}'
      actPreset = '{\n  "title": "Customer Pricing Inquiry",\n  "message": "A customer requested pricing details on WhatsApp."\n}'
    }

    setFormData(prev => ({
      ...prev,
      event_trigger: trigger,
      conditionsJson: condPreset,
      actionConfigJson: actPreset
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Zap className="h-10 w-10 text-indigo-500 animate-spin" />
        <span className="ml-3 text-zinc-450 text-sm">Processing Automation Rules...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-zinc-150">
            <Zap className="text-indigo-400 h-5.5 w-5.5 animate-pulse" />
            CRM Automation Engine
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Build event-driven scripts that trigger task creation or notification alerts based on deal updates or WhatsApp messages.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer transform hover:scale-[1.02] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Automation Rule
        </button>
      </div>

      {/* Rules Board layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`bg-zinc-900/50 p-5 rounded-2xl border flex flex-col justify-between h-56 transition-all ${
              rule.is_active ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
            }`}
          >
            <div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-650/10 px-2 py-0.5 rounded border border-indigo-650/20 uppercase tracking-wide">
                  WHEN {rule.event_trigger.replace('_', ' ')}
                </span>
                
                <button
                  onClick={() => handleToggleActive(rule)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border cursor-pointer ${
                    rule.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700/60'
                  }`}
                >
                  {rule.is_active ? 'Active' : 'Paused'}
                </button>
              </div>

              <h3 className="font-bold text-zinc-150 text-sm mt-3 line-clamp-1">{rule.name}</h3>

              {/* Conditions Box */}
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900 mt-2 text-[10px] space-y-1">
                <span className="text-zinc-500 font-bold block uppercase tracking-wider">IF Condition Matrix</span>
                <code className="text-indigo-305 block font-mono text-[9.5px] truncate">
                  {JSON.stringify(rule.conditions)}
                </code>
              </div>
            </div>

            {/* Actions summary footer */}
            <div className="border-t border-zinc-850 pt-3 flex justify-between items-center mt-3">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
                {rule.actions[0]?.type === 'CREATE_TASK' ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
                    <span>Create Deliverable Task</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Create System Notification</span>
                  </>
                )}
              </div>

              <button
                onClick={() => handleDelete(rule.id)}
                className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded cursor-pointer transition-colors"
                title="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="col-span-3 bg-zinc-900/10 border border-zinc-850 rounded-2xl p-12 text-center text-zinc-500 text-xs">
            No automations configured. Set up a workflow rule to test.
          </div>
        )}
      </div>

      {/* Creation modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div>
              <h2 className="text-sm font-bold text-zinc-200">Initialize CRM automation script</h2>
              <p className="text-[11px] text-zinc-500 mt-1">Hook into system triggers and generate programmatic actions.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-zinc-400">Automation Rule Moniker</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notify Team on Large Deals"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-400">WHEN (Event Trigger)</label>
                  <select
                    value={formData.event_trigger}
                    onChange={e => handleTriggerChange(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-855 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="DEAL_VALUE_LARGE">Deal Value Exceeds Threshold</option>
                    <option value="NEW_LEAD">New Ingested Lead Inflow</option>
                    <option value="DEAL_STAGE_CHANGE">Deal Conversion Stage Change</option>
                    <option value="WHATSAPP_RECEIVED">WhatsApp Text Received</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-450">THEN (Action Type)</label>
                  <select
                    value={formData.actionType}
                    onChange={e => setFormData({ ...formData, actionType: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-855 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="CREATE_NOTIFICATION">Create System Notification Alert</option>
                    <option value="CREATE_TASK">Instantiate Assignee Task</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-zinc-400">IF Conditions (JSON)</label>
                    <span className="text-[10px] text-zinc-550 font-bold font-mono">Validate JSON</span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.conditionsJson}
                    onChange={e => setFormData({ ...formData, conditionsJson: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-855 p-3 rounded-lg text-indigo-305 font-mono text-[11px] focus:outline-none focus:border-indigo-650"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-zinc-400">THEN Config details (JSON)</label>
                    <span className="text-[10px] text-zinc-550 font-bold font-mono">Validate JSON</span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.actionConfigJson}
                    onChange={e => setFormData({ ...formData, actionConfigJson: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-855 p-3 rounded-lg text-indigo-305 font-mono text-[11px] focus:outline-none focus:border-indigo-650"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-650 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="is_active" className="text-zinc-300 select-none cursor-pointer">
                  Activate rule immediately upon saving configuration
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg text-xs cursor-pointer">
                  Instantiate Automation
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg cursor-pointer">
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
