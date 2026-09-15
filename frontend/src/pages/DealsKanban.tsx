import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Deal, Stage, Contact, Company, User, Shipment, ShipmentEscalation, Invoice, Task, CSRReport } from '@/types/crm'
import {
  DragDropContext,
  Droppable,
  Draggable
} from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  Loader2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Calendar,
  X,
  User as UserIcon,
  Building,
  Users,
  Truck,
  ShieldAlert,
  Receipt,
  CheckSquare,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight
} from 'lucide-react'
import DetailDrawer from '@/components/DetailDrawer'

export default function DealsKanban() {
  const queryClient = useQueryClient()
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Create Deal modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage_id: '',
    contact_id: '',
    company_id: '',
    expected_close_date: '',
    probability: 20
  })

  // 1. Fetch User Profile
  const { data: me } = useQuery<User>({
    queryKey: ['me-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/accounts/me')
      return response.data
    }
  })

  const isAdminOrManager = me?.role === 'ADMIN' || me?.role === 'MANAGER'
  const currentUserId = me?.id

  // 2. Fetch Stages & Deals
  const { data: stages = [], isLoading: loadingStages, isError: errorStages } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const response = await apiClient.get<Stage[]>('/stages/')
      return response.data
    }
  })

  const { data: dealsData, isLoading: loadingDeals, isError: errorDeals } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Deal[]; count: number }>('/deals/', {
        params: { limit: 150 }
      })
      return response.data
    }
  })

  // 3. Fetch Contacts, Companies, Shipments, Escalations, Invoices, Tasks, CSR Reports
  const { data: rawContacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/contacts/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: companiesData } = useQuery({
    queryKey: ['companies-select'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Company[] }>('/companies/', {
        params: { limit: 200 }
      })
      return response.data.items
    }
  })

  const { data: rawShipments = [] } = useQuery<Shipment[]>({
    queryKey: ['shipments-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/shipments/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: rawEscalations = [] } = useQuery<ShipmentEscalation[]>({
    queryKey: ['escalations-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/shipment-escalations/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: rawInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/invoices/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: rawTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/tasks/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: rawReports = [] } = useQuery<CSRReport[]>({
    queryKey: ['csr-reports-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/csr-reports/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  // Role Scoping computations: Admins/Managers see all; Staff see only their own data
  const scopedContacts = useMemo(() => {
    if (isAdminOrManager) return rawContacts
    return rawContacts.filter(c => c.assigned_to?.id === currentUserId || (c as any).created_by?.id === currentUserId)
  }, [rawContacts, isAdminOrManager, currentUserId])

  const scopedShipments = useMemo(() => {
    if (isAdminOrManager) return rawShipments
    return rawShipments.filter(s => s.recorded_by?.id === currentUserId || (s as any).created_by?.id === currentUserId)
  }, [rawShipments, isAdminOrManager, currentUserId])

  const scopedEscalations = useMemo(() => {
    if (isAdminOrManager) return rawEscalations
    return rawEscalations.filter(e => e.escalation_to?.id === currentUserId || e.created_by?.id === currentUserId)
  }, [rawEscalations, isAdminOrManager, currentUserId])

  const scopedInvoices = useMemo(() => {
    if (isAdminOrManager) return rawInvoices
    return rawInvoices.filter(i => (i as any).recorded_by?.id === currentUserId || (i as any).created_by?.id === currentUserId)
  }, [rawInvoices, isAdminOrManager, currentUserId])

  const scopedTasks = useMemo(() => {
    if (isAdminOrManager) return rawTasks
    return rawTasks.filter(t => t.assignee?.id === currentUserId || (t as any).created_by?.id === currentUserId)
  }, [rawTasks, isAdminOrManager, currentUserId])

  // Escalations breakdown: Pending vs Resolved (Resolved disappears after 30 days)
  const { pendingEscalations, resolvedEscalations30Days } = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const pending = scopedEscalations.filter(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS')
    const resolved = scopedEscalations.filter(e => {
      if (e.status !== 'RESOLVED' && e.status !== 'CLOSED') return false
      const resDateStr = e.resolution_date || e.date || e.created_at
      if (!resDateStr) return true
      return new Date(resDateStr) >= thirtyDaysAgo
    })

    return { pendingEscalations: pending, resolvedEscalations30Days: resolved }
  }, [scopedEscalations])

  // Invoices breakdown
  const { paidInvoices, unpaidInvoices, paidAmount, unpaidAmount } = useMemo(() => {
    const paid = scopedInvoices.filter(i => i.status === 'PAID')
    const unpaid = scopedInvoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
    const pAmt = paid.reduce((sum, i) => sum + (Number(i.amount_paid) || Number(i.total_ngn) || 0), 0)
    const uAmt = unpaid.reduce((sum, i) => sum + (Number(i.total_ngn) || 0), 0)
    return { paidInvoices: paid, unpaidInvoices: unpaid, paidAmount: pAmt, unpaidAmount: uAmt }
  }, [scopedInvoices])

  // Tasks breakdown
  const { finishedTasks, unfinishedTasks } = useMemo(() => {
    const finished = scopedTasks.filter(t => t.status === 'DONE')
    const unfinished = scopedTasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS')
    return { finishedTasks: finished, unfinishedTasks: unfinished }
  }, [scopedTasks])

  // Today's Staff Activity Highlights phrase builder
  const dailyActivityPhrases = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const isToday = (dStr?: string) => dStr && dStr.startsWith(todayStr)

    if (isAdminOrManager) {
      const staffMap: Record<string, { name: string; shipments: number; reports: number; escalations: number; tasks: number }> = {}

      const getStaffKey = (u?: User) => {
        if (!u) return null
        const key = u.id
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
        if (!staffMap[key]) {
          staffMap[key] = { name, shipments: 0, reports: 0, escalations: 0, tasks: 0 }
        }
        return key
      }

      rawShipments.forEach(s => {
        if (isToday(s.shipment_date || s.date || s.created_at) && s.recorded_by) {
          const k = getStaffKey(s.recorded_by)
          if (k) staffMap[k].shipments += 1
        }
      })

      rawReports.forEach(r => {
        if (isToday(r.date || r.created_at) && r.staff) {
          const k = getStaffKey(r.staff)
          if (k) staffMap[k].reports += 1
        }
      })

      rawEscalations.forEach(e => {
        if (isToday(e.date || e.created_at) && e.created_by) {
          const k = getStaffKey(e.created_by)
          if (k) staffMap[k].escalations += 1
        }
      })

      rawTasks.forEach(t => {
        if (isToday(t.updated_at || t.due_date || t.created_at) && t.status === 'DONE' && t.assignee) {
          const k = getStaffKey(t.assignee)
          if (k) staffMap[k].tasks += 1
        }
      })

      const phrases: string[] = []
      Object.values(staffMap).forEach(st => {
        const parts: string[] = []
        if (st.reports > 0) parts.push(`${st.reports} report${st.reports > 1 ? 's' : ''}`)
        if (st.shipments > 0) parts.push(`${st.shipments} shipment${st.shipments > 1 ? 's' : ''}`)
        if (st.escalations > 0) parts.push(`${st.escalations} escalation${st.escalations > 1 ? 's' : ''}`)
        if (st.tasks > 0) parts.push(`completed ${st.tasks} task${st.tasks > 1 ? 's' : ''}`)
        if (parts.length > 0) {
          phrases.push(`${st.name} created ${parts.join(', ')} today`)
        }
      })

      return phrases.length > 0 ? phrases : ["No staff creation activity logged yet today."]
    } else {
      let myShipments = 0
      let myReports = 0
      let myTasks = 0
      let myEscalations = 0

      rawShipments.forEach(s => {
        if (isToday(s.shipment_date || s.date || s.created_at) && (s.recorded_by?.id === currentUserId || (s as any).created_by?.id === currentUserId)) {
          myShipments += 1
        }
      })

      rawReports.forEach(r => {
        if (isToday(r.date || r.created_at) && r.staff?.id === currentUserId) {
          myReports += 1
        }
      })

      rawTasks.forEach(t => {
        if (isToday(t.updated_at || t.due_date || t.created_at) && t.status === 'DONE' && t.assignee?.id === currentUserId) {
          myTasks += 1
        }
      })

      rawEscalations.forEach(e => {
        if (isToday(e.date || e.created_at) && (e.created_by?.id === currentUserId || e.escalation_to?.id === currentUserId)) {
          myEscalations += 1
        }
      })

      const parts: string[] = []
      if (myReports > 0) parts.push(`${myReports} report${myReports > 1 ? 's' : ''}`)
      if (myShipments > 0) parts.push(`${myShipments} shipment${myShipments > 1 ? 's' : ''}`)
      if (myEscalations > 0) parts.push(`${myEscalations} escalation${myEscalations > 1 ? 's' : ''}`)
      if (myTasks > 0) parts.push(`completed ${myTasks} task${myTasks > 1 ? 's' : ''}`)

      return parts.length > 0 ? [`You created ${parts.join(', ')} today`] : ["You have no logged activity yet today."]
    }
  }, [isAdminOrManager, currentUserId, rawShipments, rawReports, rawEscalations, rawTasks])

  // Drag and Drop Mutation
  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId, originalDeal }: { dealId: string; stageId: string; originalDeal: Deal }) => {
      const payload = {
        title: originalDeal.title,
        value: Number(originalDeal.value),
        currency: originalDeal.currency || 'USD',
        stage_id: stageId,
        contact_id: originalDeal.contact?.id || null,
        company_id: originalDeal.company?.id || null,
        expected_close_date: originalDeal.expected_close_date || null,
        probability: originalDeal.probability || 0,
        status: originalDeal.status || 'OPEN'
      }
      return apiClient.put(`/deals/${dealId}`, payload)
    },
    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] })
      const previousDealsData = queryClient.getQueryData<{ items: Deal[]; count: number }>(['deals'])
      const targetStage = stages.find(s => s.id === stageId)

      if (previousDealsData && targetStage) {
        const nextItems = previousDealsData.items.map(d => {
          if (d.id === dealId) {
            return { ...d, stage: targetStage }
          }
          return d
        })
        queryClient.setQueryData(['deals'], {
          ...previousDealsData,
          items: nextItems
        })
      }
      return { previousDealsData }
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousDealsData) {
        queryClient.setQueryData(['deals'], context.previousDealsData)
      }
      alert(`Error moving deal: ${err?.message || 'Unauthorized action'}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    }
  })

  // Create Deal Mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const formatted = {
        ...payload,
        value: Number(payload.value),
        contact_id: payload.contact_id || null,
        company_id: payload.company_id || null,
        expected_close_date: payload.expected_close_date || null
      }
      return apiClient.post('/deals/', formatted)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setIsModalOpen(false)
      setFormError('')
      setFormData({
        title: '',
        value: '',
        stage_id: '',
        contact_id: '',
        company_id: '',
        expected_close_date: '',
        probability: 20
      })
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create deal')
    }
  })

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const deals = dealsData?.items || []
    const deal = deals.find(d => d.id === draggableId)
    if (deal) {
      updateDealStageMutation.mutate({
        dealId: deal.id,
        stageId: destination.droppableId,
        originalDeal: deal
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.value.trim() || !formData.stage_id) {
      setFormError('Deal title, value, and stage are required.')
      return
    }
    if (isNaN(Number(formData.value))) {
      setFormError('Deal value must be a valid number.')
      return
    }
    createDealMutation.mutate(formData)
  }

  const deals = dealsData?.items || []
  const dealsByStage = stages.reduce<Record<string, Deal[]>>((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage.id === stage.id)
    return acc
  }, {})

  const totalPipelineValue = dealsData?.items.reduce((sum, d) => sum + Number(d.value), 0) || 0

  if (loadingStages || loadingDeals) {
    return (
      <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-2 justify-center">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <span className="text-xs">Loading active pipelines...</span>
      </div>
    )
  }

  if (errorStages || errorDeals) {
    return (
      <div className="py-20 text-center text-red-400 flex items-center justify-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span className="text-xs">Failed to load Kanban board. Please verify session tokens.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP PIPELINE METRICS ROW (Role-Scoped) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Contacts</span>
            <h3 className="text-2xl font-black text-[#1A202C]">{scopedContacts.length}</h3>
            <span className="text-[10px] text-slate-400 font-semibold block">
              {isAdminOrManager ? 'Organization Total' : 'Assigned to You'}
            </span>
          </div>
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-200 flex items-center justify-center rounded-lg text-indigo-600 font-bold">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Total Shipments Created */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Shipments Created</span>
            <h3 className="text-2xl font-black text-[#1A202C]">{scopedShipments.length}</h3>
            <span className="text-[10px] text-slate-400 font-semibold block">
              {isAdminOrManager ? 'All Staff Total' : 'Recorded by You'}
            </span>
          </div>
          <div className="h-10 w-10 bg-sky-50 border border-sky-200 flex items-center justify-center rounded-lg text-sky-600 font-bold">
            <Truck className="h-5 w-5" />
          </div>
        </div>

        {/* Number of Escalations */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Escalations</span>
            <h3 className="text-2xl font-black text-red-600">{scopedEscalations.length}</h3>
            <span className="text-[10px] text-slate-400 font-semibold block">
              {pendingEscalations.length} Pending | {resolvedEscalations30Days.length} Resolved (30d)
            </span>
          </div>
          <div className="h-10 w-10 bg-red-50 border border-red-200 flex items-center justify-center rounded-lg text-red-600 font-bold">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pipeline Value</span>
            <h3 className="text-2xl font-black text-emerald-600">${totalPipelineValue.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 font-semibold block">Active Opportunities</span>
          </div>
          <div className="h-10 w-10 bg-emerald-50 border border-emerald-200 flex items-center justify-center rounded-lg text-emerald-600 font-bold">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. DAILY STAFF CREATION & ACTIVITY TRACKER CARD */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-yellow-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {isAdminOrManager ? 'Daily Staff Activity Highlights' : 'Your Daily Activity Highlights'}
            </h3>
          </div>
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-yellow-400 font-bold px-2 py-0.5 rounded">
            Live Today
          </span>
        </div>

        <div className="space-y-2">
          {dailyActivityPhrases.map((phrase, idx) => (
            <div key={idx} className="text-xs flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
              <span className="text-white font-medium">
                {phrase.split(/(created|completed|\d+ \w+)/g).map((part, pIdx) => {
                  if (/^\d+/.test(part)) {
                    return <strong key={pIdx} className="text-yellow-400 font-bold">{part}</strong>
                  } else if (part === 'created' || part === 'completed') {
                    return <span key={pIdx} className="text-emerald-400 font-semibold"> {part} </span>
                  }
                  return part
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ESCALATIONS SEGMENT (Pending & Resolved - Disappears after 30 days) */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
            <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">Shipment Escalations Status</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            Resolved items auto-clear after 30 days
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Escalations */}
          <div className="bg-red-50/40 border border-red-200/80 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Pending Escalations</span>
              <span className="bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded text-xs font-black">
                {pendingEscalations.length}
              </span>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {pendingEscalations.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">No pending escalations.</div>
              ) : (
                pendingEscalations.map(esc => (
                  <div key={esc.id} className="bg-white p-2.5 rounded border border-red-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#1A202C]">
                      <span>{esc.customer_name || 'Valued Client'}</span>
                      <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">{esc.priority}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{esc.complaint_summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resolved Escalations (Last 30 Days) */}
          <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Resolved Escalations (Last 30 Days)</span>
              <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded text-xs font-black">
                {resolvedEscalations30Days.length}
              </span>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {resolvedEscalations30Days.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">No resolved escalations in the last 30 days.</div>
              ) : (
                resolvedEscalations30Days.map(esc => (
                  <div key={esc.id} className="bg-white p-2.5 rounded border border-emerald-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#1A202C]">
                      <span>{esc.customer_name || 'Valued Client'}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Resolved</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{esc.resolution || esc.complaint_summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. INVOICES BREAKDOWN & TASKS STATUS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 text-sky-600" />
              <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">Invoices Breakdown</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{scopedInvoices.length} Total Invoices</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Paid Invoices */}
            <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-emerald-700 uppercase block">Paid Invoices</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{paidInvoices.length}</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                ${paidAmount.toLocaleString()} settled
              </span>
            </div>

            {/* Unpaid / Pending Invoices */}
            <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-amber-700 uppercase block">Unpaid / Pending Invoices</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">{unpaidInvoices.length}</span>
              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                ${unpaidAmount.toLocaleString()} outstanding
              </span>
            </div>
          </div>
        </div>

        {/* Tasks Status Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">Tasks Status Checklist</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{scopedTasks.length} Total Tasks</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Finished Tasks */}
            <div className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-indigo-700 uppercase block">Finished Tasks</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{finishedTasks.length}</span>
              <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">✓ Completed</span>
            </div>

            {/* Unfinished Tasks */}
            <div className="bg-slate-100/70 border border-slate-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-slate-700 uppercase block">Unfinished Tasks</span>
              <span className="text-2xl font-black text-slate-700 mt-1 block">{unfinishedTasks.length}</span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">In Progress / Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. KANBAN LAYOUT TITLE & ADD DEAL BUTTON */}
      <div className="flex justify-between items-center pt-4">
        <div>
          <h2 className="text-lg font-bold text-[#1A202C] flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" /> Pipeline Deal Board
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Drag and drop deal cards to change pipeline stages dynamically</p>
        </div>
        <button
          onClick={() => {
            setFormError('')
            setFormData(prev => ({ ...prev, stage_id: stages[0]?.id || '' }))
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
        >
          <Plus className="h-3.5 w-3.5" /> New Deal
        </button>
      </div>

      {/* DRAG AND DROP KANBAN GRID */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
          {stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || []
            const sumValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0)
            
            return (
              <div
                key={stage.id}
                className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 w-72 flex-shrink-0 flex flex-col max-h-[70vh] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                {/* Stage Header */}
                <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9] mb-3 bg-[#FFFFFF]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#1A202C]">{stage.name}</span>
                    <span className="text-[10px] text-slate-500">{stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                      ${sumValue.toLocaleString()}
                    </span>
                    <button
                      onClick={() => {
                        setFormError('')
                        setFormData(prev => ({ ...prev, stage_id: stage.id }))
                        setIsModalOpen(true)
                      }}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                      title={`Add deal to ${stage.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-3 min-h-[300px] p-1 rounded-lg transition-colors ${
                        snapshot.isDraggingOver
                          ? 'bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1]'
                          : stageDeals.length === 0
                          ? 'bg-[#F8FAFC] border border-dashed border-[#CBD5E1] flex flex-col items-center justify-center'
                          : ''
                      }`}
                    >
                      {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center p-4 text-slate-400 text-xs font-medium">
                          No deals in stage
                        </div>
                      )}
                      {stageDeals.map((deal, idx) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => {
                                setSelectedDealId(deal.id)
                                setIsDrawerOpen(true)
                              }}
                              className={`p-3.5 rounded-lg border bg-[#FFFFFF] transition-all hover:border-slate-300 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
                                snap.isDragging
                                  ? 'border-indigo-500 shadow-xl scale-[1.02] rotate-1 bg-white'
                                  : 'border-[#E2E8F0]'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-xs font-bold text-[#1A202C] line-clamp-1">{deal.title}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border flex-shrink-0 ${
                                  deal.status === 'WON'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : deal.status === 'LOST'
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                }`}>
                                  {deal.status}
                                </span>
                              </div>

                              {/* Association details */}
                              <div className="mt-2.5 space-y-1 block">
                                {deal.company && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                    <Building className="h-3 w-3 text-slate-400" />
                                    <span className="line-clamp-1">{deal.company.name}</span>
                                  </div>
                                )}
                                {deal.contact && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                    <UserIcon className="h-3 w-3 text-slate-400" />
                                    <span>{deal.contact.first_name} {deal.contact.last_name}</span>
                                  </div>
                                )}
                                {deal.expected_close_date && (
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>Close: {new Date(deal.expected_close_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>

                              {/* Value footer */}
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center text-[10px]">
                                <span className="text-slate-500">Prob: {deal.probability ?? 0}%</span>
                                <span className="font-bold text-indigo-600 text-xs">${Number(deal.value).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* NEW DEAL MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60 p-4">
          <div className="bg-zinc-950 border border-zinc-905 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-905 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-400" />
                <h3 className="text-md font-bold text-white">Create New Opportunity</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-450 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-semibold">Deal Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enterprise License Upgrade"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                />
              </div>

              {/* Value & Pipeline Stage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Monetary Value ($) *</label>
                  <input
                    type="text"
                    name="value"
                    value={formData.value}
                    onChange={handleInputChange}
                    placeholder="25000"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Pipeline Stage *</label>
                  <select
                    name="stage_id"
                    value={formData.stage_id}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact & Company dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Contact Partner</label>
                  <select
                    name="contact_id"
                    value={formData.contact_id}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  >
                    <option value="">None (Independent)</option>
                    {scopedContacts.map((cnt) => (
                      <option key={cnt.id} value={cnt.id}>
                        {cnt.first_name} {cnt.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Target Company</label>
                  <select
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  >
                    <option value="">None</option>
                    {companiesData?.map((cmp) => (
                      <option key={cmp.id} value={cmp.id}>
                        {cmp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expected Date & Probability */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Expected Close Date</label>
                  <input
                    type="date"
                    name="expected_close_date"
                    value={formData.expected_close_date}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Win Probability (%)</label>
                  <input
                    type="number"
                    name="probability"
                    value={formData.probability}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-905 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-900 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDealMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createDealMutation.isPending && <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin"></span>}
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER SLIDE-OVER */}
      <DetailDrawer
        type="deal"
        id={selectedDealId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['deals'] })
        }}
      />
    </div>
  )
}
