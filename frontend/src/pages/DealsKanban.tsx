import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Deal, Stage, Contact, Company } from '@/types/crm'
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
  Building
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

  // 1. Fetch Stages
  const { data: stages = [], isLoading: loadingStages, isError: errorStages } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const response = await apiClient.get<Stage[]>('/stages/')
      return response.data
    }
  })

  // 2. Fetch Deals
  const { data: dealsData, isLoading: loadingDeals, isError: errorDeals } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Deal[]; count: number }>('/deals/', {
        params: { limit: 150 }
      })
      return response.data
    }
  })

  // 3. Fetch Contacts for Select Dropdown
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-select'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Contact[] }>('/contacts/', {
        params: { limit: 200 }
      })
      return response.data.items
    }
  })

  // 4. Fetch Companies for Select Dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies-select'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Company[] }>('/companies/', {
        params: { limit: 200 }
      })
      return response.data.items
    }
  })

  // 5. Drag and Drop Mutation with Optimistic Updates
  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId, originalDeal }: { dealId: string; stageId: string; originalDeal: Deal }) => {
      // Put expects full DealCreateSchema fields: title, value, stage_id, contact_id, company_id, expected_close_date, probability, status
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
    // Optimistic UI updates
    onMutate: async ({ dealId, stageId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['deals'] })

      // Snapshot previous deals state
      const previousDealsData = queryClient.getQueryData<{ items: Deal[]; count: number }>(['deals'])

      // Find the target stage object details
      const targetStage = stages.find(s => s.id === stageId)

      if (previousDealsData && targetStage) {
        // Optimistically map over deals and change the stage on target deal ID
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
      // Rollback to previous state
      if (context?.previousDealsData) {
        queryClient.setQueryData(['deals'], context.previousDealsData)
      }
      alert(`Error moving deal: ${err?.message || 'Unauthorized action'}`)
    },
    onSettled: () => {
      // Refresh list from database to ensure correctness
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    }
  })

  // 6. Create Deal Mutation
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

  // DnD drag end handler
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    
    // Dropped outside list
    if (!destination) return
    
    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

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

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Submit Deal
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

  // Group deals by stage
  const deals = dealsData?.items || []
  const dealsByStage = stages.reduce<Record<string, Deal[]>>((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage.id === stage.id)
    return acc
  }, {})

  // Compute aggregate dashboard stats from deals
  const totalPipelineValue = dealsData?.items.reduce((sum, d) => sum + Number(d.value), 0) || 0
  const openDealsCount = dealsData?.items.filter(d => d.status === 'OPEN').length || 0
  const closedWonValue = dealsData?.items.filter(d => d.status === 'WON').reduce((sum, d) => sum + Number(d.value), 0) || 0

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
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Total Pipeline Value</span>
            <h3 className="text-2xl font-bold text-[#1A202C]">${totalPipelineValue.toLocaleString()}</h3>
          </div>
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-200 flex items-center justify-center rounded-lg text-indigo-600 font-bold">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Open Opportunities</span>
            <h3 className="text-2xl font-bold text-[#1A202C]">{openDealsCount}</h3>
          </div>
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-200 flex items-center justify-center rounded-lg text-indigo-600 font-bold">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 rounded-xl flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Closed Won Revenue</span>
            <h3 className="text-2xl font-bold text-emerald-600">${closedWonValue.toLocaleString()}</h3>
          </div>
          <div className="h-10 w-10 bg-emerald-50 border border-emerald-200 flex items-center justify-center rounded-lg text-emerald-600 font-bold">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Kanban Layout Title & Add */}
      <div className="flex justify-between items-center">
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
                    {contactsData?.map((cnt) => (
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
