import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import type { ApprovalWorkflow, ApprovalRequest, User } from '@/types/crm'
import {
  FileCheck,
  Plus,
  Trash2,
  Check,
  X,
  Clock,
  Sparkles,
  TrendingDown,
  Layers,
  ChevronRight,
  ShieldAlert,
  MessageSquare
} from 'lucide-react'

export default function ApprovalsWorkspace() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([])
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [roles, setRoles] = useState<string[]>(['ADMIN', 'MANAGER', 'SALES_REP']) // default roles
  const [isLoading, setIsLoading] = useState(true)

  // Drawer / Form state
  const [isWfModalOpen, setIsWfModalOpen] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfSteps, setWfSteps] = useState<Array<{ name: string; approver_roles: string[] }>>([
    { name: 'Initial Management Review', approver_roles: ['MANAGER'] },
    { name: 'Final Administrator Signoff', approver_roles: ['ADMIN'] }
  ])

  // Request creation state
  const [isReqModalOpen, setIsReqModalOpen] = useState(false)
  const [reqTitle, setReqTitle] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [selectedWfId, setSelectedWfId] = useState('')

  // Action / Decision state
  const [actionComments, setActionComments] = useState('')
  const [activeRequest, setActiveRequest] = useState<ApprovalRequest | null>(null)

  const loadBaseData = async () => {
    try {
      const [wfRes, reqRes] = await Promise.all([
        apiClient.get<ApprovalWorkflow[]>('/approvals/workflows'),
        apiClient.get<ApprovalRequest[]>('/approvals/requests')
      ])
      setWorkflows(wfRes.data)
      setRequests(reqRes.data)
      if (wfRes.data.length > 0) {
        setSelectedWfId(wfRes.data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wfName) return

    try {
      const response = await apiClient.post<ApprovalWorkflow>('/approvals/workflows', {
        name: wfName,
        steps: wfSteps
      })
      setWorkflows([...workflows, response.data])
      setIsWfModalOpen(false)
      setWfName('')
      setWfSteps([
        { name: 'Initial Management Review', approver_roles: ['MANAGER'] },
        { name: 'Final Administrator Signoff', approver_roles: ['ADMIN'] }
      ])
    } catch (err) {
      console.error(err)
      alert('Error creating workflow.')
    }
  }

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this approval workflow?')) return
    try {
      await apiClient.delete(`/approvals/workflows/${id}`)
      setWorkflows(workflows.filter(w => w.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reqTitle || !selectedWfId) return

    try {
      const response = await apiClient.post<ApprovalRequest>('/approvals/requests', {
        workflow_id: selectedWfId,
        title: reqTitle,
        description: reqDesc
      })
      setRequests([response.data, ...requests])
      setIsReqModalOpen(false)
      setReqTitle('')
      setReqDesc('')
    } catch (err) {
      console.error(err)
      alert('Error creating approval request.')
    }
  }

  const handleRequestAction = async (requestId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await apiClient.post<{ status: ApprovalRequest['status']; current_step_index: number }>(
        `/approvals/requests/${requestId}/action`,
        null,
        {
          params: { decision, comments: actionComments }
        }
      )
      // Reload requests list to update status and history immediately
      const reqRes = await apiClient.get<ApprovalRequest[]>('/approvals/requests')
      setRequests(reqRes.data)
      setActionComments('')
      setActiveRequest(null)
      alert(`Request has been transition to: ${response.data.status}`)
    } catch (err) {
      console.error(err)
      alert('Action error. Check if your user role matches the required approver permissions.')
    }
  }

  const addStepInput = () => {
    setWfSteps([...wfSteps, { name: '', approver_roles: ['MANAGER'] }])
  }

  const removeStepInput = (idx: number) => {
    setWfSteps(wfSteps.filter((_, i) => i !== idx))
  }

  const updateStepVal = (idx: number, field: 'name' | 'approver_roles', val: any) => {
    setWfSteps(wfSteps.map((step, i) => {
      if (i === idx) {
        return { ...step, [field]: val }
      }
      return step
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <FileCheck className="h-10 w-10 text-indigo-500 animate-pulse" />
        <span className="ml-3 text-zinc-450 text-sm">Processing Approval Workflows...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-zinc-150">
            <FileCheck className="text-indigo-400 h-5.5 w-5.5" />
            Compliance & Document Approvals
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Build strict multi-step signoff workflows for deals negotiation, quotes validation, or employee expense reviews.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsWfModalOpen(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Manage Workflows
          </button>
          <button
            onClick={() => setIsReqModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer transform hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4" />
            Initiate Approval Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-2 space-y-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Active Requests Feed</span>
          <div className="space-y-3">
            {requests.map(req => (
              <div
                key={req.id}
                onClick={() => setActiveRequest(req)}
                className={`bg-zinc-900/50 p-4 border rounded-2xl cursor-pointer hover:bg-zinc-900/90 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  activeRequest?.id === req.id ? 'border-indigo-600' : 'border-zinc-850/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : req.status === 'REJECTED'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-zinc-650 text-[10px]">Workflow: {req.workflow?.name}</span>
                  </div>
                  <h3 className="font-bold text-zinc-150 text-sm mt-2">{req.title}</h3>
                  <p className="text-xs text-zinc-450 mt-1 line-clamp-1">{req.description || 'No explanation.'}</p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end border-t sm:border-t-0 border-zinc-850 pt-2 sm:pt-0">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Step {req.current_step_index + 1} / {req.workflow?.steps?.length || 1}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 hidden sm:block" />
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="bg-zinc-900/15 border border-zinc-858 rounded-2xl p-12 text-center text-zinc-500 text-xs">
                No compliance or signoff requests logged. Click initiate above.
              </div>
            )}
          </div>
        </div>

        {/* Selected Request Detail Panel */}
        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-850 h-fit space-y-5 block backdrop-blur-sm">
          {activeRequest ? (
            <>
              <div>
                <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider block">Compliance Signoff Details</span>
                <h2 className="text-md font-bold text-zinc-200 mt-2">{activeRequest.title}</h2>
                <span className="text-[10px] text-zinc-550 block mt-0.5">Requested by UserID: {activeRequest.requested_by?.first_name} {activeRequest.requested_by?.last_name}</span>
                <p className="text-xs text-zinc-400 mt-3 bg-zinc-950/50 p-3 rounded-xl border border-zinc-900 leading-relaxed">
                  {activeRequest.description || 'No description provided.'}
                </p>
              </div>

              {/* Steps timeline visual progress */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Workflow Sequence Steps</span>
                <div className="space-y-2">
                  {activeRequest.workflow?.steps?.map((step: any, idx: number) => {
                    const isDone = idx < activeRequest.current_step_index || activeRequest.status === 'APPROVED'
                    const isCurrent = idx === activeRequest.current_step_index && activeRequest.status === 'PENDING'
                    const isRejected = activeRequest.status === 'REJECTED' && idx === activeRequest.current_step_index

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isDone
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                            : isCurrent
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-bold'
                            : isRejected
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-zinc-950/20 border-zinc-900 text-zinc-555'
                        }`}
                      >
                        <span className="truncate max-w-[70%]">{idx + 1}. {step.name}</span>
                        <span className="text-[9px] uppercase font-bold text-zinc-500">
                          {step.approver_roles.join(', ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Log History */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Decision History Logs</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeRequest.history && activeRequest.history.length > 0 ? (
                    activeRequest.history.map((hist: any, hIdx: number) => (
                      <div key={hIdx} className="p-2 bg-zinc-950/40 rounded border border-zinc-900 text-[10px] space-y-1">
                        <div className="flex justify-between items-center text-zinc-400 font-medium">
                          <span>{hist.user_name}</span>
                          <span className={`font-bold ${hist.decision === 'APPROVED' ? 'text-emerald-555' : 'text-red-555'}`}>
                            {hist.decision}
                          </span>
                        </div>
                        {hist.comments && (
                          <div className="text-zinc-650 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <p className="italic">{hist.comments}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-600 block pl-1">No action log entries.</span>
                  )}
                </div>
              </div>

              {/* Action input panel if PENDING */}
              {activeRequest.status === 'PENDING' && (
                <div className="border-t border-zinc-850 pt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Review Comments</label>
                    <input
                      type="text"
                      placeholder="Comment text (optional)..."
                      value={actionComments}
                      onChange={e => setActionComments(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-600 text-zinc-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestAction(activeRequest.id, 'APPROVED')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-lg text-xs flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      Approve Step
                    </button>
                    <button
                      onClick={() => handleRequestAction(activeRequest.id, 'REJECTED')}
                      className="flex-1 py-1.5 bg-red-650 hover:bg-red-500 font-bold text-white rounded-lg text-xs flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                      Reject Workflow
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-550 border border-dashed border-zinc-850 rounded-xl h-64 bg-zinc-950/10">
              <FileCheck className="h-8 w-8 text-zinc-700 mb-3" />
              <span className="text-xs">Select any request on the left feed to evaluate sequence history or execute review actions.</span>
            </div>
          )}
        </div>
      </div>

      {/* Workflows Management Dialog Modal */}
      {isWfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl">
            <div>
              <h2 className="text-sm font-bold text-zinc-200">Compliance Workflows & Step Pipelines</h2>
              <p className="text-[10px] text-zinc-550 mt-1">Roster of compliance templates and steps configuration.</p>
            </div>

            <div className="space-y-2 border-b border-zinc-850 pb-5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block pl-1">Active Workflows</span>
              <div className="space-y-1.5">
                {workflows.map(wf => (
                  <div key={wf.id} className="flex justify-between items-center bg-zinc-900/50 p-2 border border-zinc-850/60 rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-zinc-300">{wf.name}</span>
                      <span className="text-[9px] text-zinc-500 block">Steps Count: {wf.steps?.length || 0}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs font-semibold">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Instantiate New Step Sequence</span>

              <div className="space-y-1">
                <label className="text-zinc-450">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Contract Signoff Pipeline"
                  value={wfName}
                  onChange={e => setWfName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Dynamic steps entry */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-zinc-400">Sequence Steps Definition</label>
                  <button
                    type="button"
                    onClick={addStepInput}
                    className="text-[10px] text-indigo-400 hover:text-indigo-305 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {wfSteps.map((step, sIdx) => (
                    <div key={sIdx} className="flex gap-2 items-center bg-zinc-900/30 p-2 border border-zinc-900 rounded-xl">
                      <input
                        type="text"
                        required
                        placeholder={`Step ${sIdx + 1} Name`}
                        value={step.name}
                        onChange={e => updateStepVal(sIdx, 'name', e.target.value)}
                        className="bg-zinc-950 border border-zinc-900 text-xs px-2 py-1 rounded w-1/2 focus:outline-none text-zinc-300"
                      />
                      <select
                        value={step.approver_roles[0]}
                        onChange={e => updateStepVal(sIdx, 'approver_roles', [e.target.value])}
                        className="bg-zinc-950 border border-zinc-900 text-xs px-2 py-1 rounded w-1/3 focus:outline-none text-zinc-300 cursor-pointer"
                      >
                        <option value="ADMIN">Administrator</option>
                        <option value="MANAGER">Manager</option>
                        <option value="SALES_REP">Sales Rep</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeStepInput(sIdx)}
                        className="p-1 text-zinc-650 hover:text-red-400 rounded cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-500 font-bold text-white rounded-lg text-xs cursor-pointer">
                  Save Workflow Template
                </button>
                <button type="button" onClick={() => setIsWfModalOpen(false)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg cursor-pointer">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests Initiation modal Dialog */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <span className="text-xs font-bold text-zinc-250">File Signoff & Approval Request</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">Select dynamic compliance workflow steps definition.</p>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-zinc-400">Request Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Contract $50k Proposal"
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-650"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">Workflow Sequence Template</label>
                <select
                  value={selectedWfId}
                  onChange={e => setSelectedWfId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-650 cursor-pointer"
                >
                  <option value="">Select template...</option>
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name} ({wf.steps?.length || 0} steps)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">Brief request details</label>
                <input
                  type="text"
                  placeholder="Provide checklist context"
                  value={reqDesc}
                  onChange={e => setReqDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-zinc-305 focus:outline-none focus:border-indigo-650"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-lg text-xs cursor-pointer">
                  Save & Launch Request
                </button>
                <button type="button" onClick={() => setIsReqModalOpen(false)} className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-405 rounded-lg cursor-pointer">
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
