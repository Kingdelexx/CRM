import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Contact, Deal, Activity, Task, User, Stage } from '@/types/crm'
import {
  X,
  Calendar,
  Building,
  Phone,
  Mail,
  Plus,
  Trash2,
  Loader2,
  Check,
  Edit2,
  FileText,
  MessageSquare,
  ChevronDown
} from 'lucide-react'

interface DetailDrawerProps {
  type: 'contact' | 'deal'
  id: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export default function DetailDrawer({ type, id, isOpen, onClose, onUpdate }: DetailDrawerProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'notes' | 'tasks'>('overview')
  const [isEditing, setIsEditing] = useState(false)

  // Quick note/call logger states
  const [quickActivityType, setQuickActivityType] = useState<'NOTE' | 'CALL'>('NOTE')
  const [quickActivityContent, setQuickActivityContent] = useState('')

  // Task creation states
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')

  // 1. Fetch Contact or Deal details
  const { data: itemData, isLoading: isLoadingItem, error: itemError } = useQuery({
    queryKey: [type, id],
    queryFn: async () => {
      if (!id) return null
      const response = await apiClient.get<Contact | Deal>(`/${type}s/${id}`)
      return response.data
    },
    enabled: isOpen && !!id
  })

  // Editable Form states initialized when data loads
  const [editFields, setEditFields] = useState<Record<string, any>>({})
  useEffect(() => {
    if (itemData) {
      if (type === 'contact') {
        const contact = itemData as Contact
        setEditFields({
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          job_title: contact.job_title || '',
          status: contact.status || 'LEAD',
          company_id: contact.company?.id || '',
          assigned_to_id: contact.assigned_to?.id || ''
        })
      } else {
        const deal = itemData as Deal
        setEditFields({
          title: deal.title || '',
          value: deal.value || '',
          status: deal.status || 'OPEN',
          stage_id: deal.stage?.id || '',
          contact_id: deal.contact?.id || '',
          company_id: deal.company?.id || '',
          expected_close_date: deal.expected_close_date || '',
          probability: deal.probability || 0
        })
      }
    }
  }, [itemData, type])

  // Fetch lists for selectors
  const { data: users = [] } = useQuery({
    queryKey: ['users-select'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/accounts/')
      return response.data
    },
    enabled: isOpen
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const response = await apiClient.get<Stage[]>('/stages/')
      return response.data
    },
    enabled: isOpen
  })



  // Fetch Activities for item
  const { data: activitiesData, refetch: refetchActivities } = useQuery({
    queryKey: ['activities', type, id],
    queryFn: async () => {
      if (!id) return []
      const response = await apiClient.get<{ items: Activity[] }>('/activities/', {
        params: {
          [type === 'contact' ? 'contact_id' : 'deal_id']: id,
          limit: 100
        }
      })
      return response.data.items
    },
    enabled: isOpen && !!id
  })

  // Fetch Tasks for item
  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', type, id],
    queryFn: async () => {
      if (!id) return []
      const response = await apiClient.get<{ items: Task[] }>('/tasks/', {
        params: {
          [type === 'contact' ? 'contact_id' : 'deal_id']: id,
          limit: 100
        }
      })
      return response.data.items
    },
    enabled: isOpen && !!id
  })

  // Mutations
  const updateItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (type === 'contact') {
        return apiClient.put(`/contacts/${id}`, payload)
      } else {
        const formattedPayload = {
          ...payload,
          value: Number(payload.value),
          probability: Number(payload.probability)
        }
        return apiClient.put(`/deals/${id}`, formattedPayload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type, id] })
      queryClient.invalidateQueries({ queryKey: [type + 's'] }) // contacts or deals list
      setIsEditing(false)
      if (onUpdate) onUpdate()
    },
    onError: (err: any) => {
      alert(`Failed to update: ${err?.message || 'Error occurred'}`)
    }
  })

  // Change Deal Stage directly in header
  const updateStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const deal = itemData as Deal
      const payload = {
        title: deal.title,
        value: Number(deal.value),
        currency: deal.currency || 'USD',
        stage_id: stageId,
        contact_id: deal.contact?.id || null,
        company_id: deal.company?.id || null,
        expected_close_date: deal.expected_close_date || null,
        probability: deal.probability || 0,
        status: deal.status || 'OPEN'
      }
      return apiClient.put(`/deals/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type, id] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      
      // Auto log progress note
      const nextStageName = stages.find(s => s.id === editFields.stage_id)?.name || 'Next Stage'
      logActivityMutation.mutate({
        type: 'NOTE',
        content: `Stage updated to: ${nextStageName}`
      })
      
      if (onUpdate) onUpdate()
    }
  })

  // Change Contact Owner directly in header
  const updateAssigneeMutation = useMutation({
    mutationFn: async (assigneeId: string) => {
      const contact = itemData as Contact
      const payload = {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone || null,
        job_title: contact.job_title || null,
        status: contact.status || 'LEAD',
        company_id: contact.company?.id || null,
        assigned_to_id: assigneeId || null,
        custom_fields: contact.custom_fields || {}
      }
      return apiClient.put(`/contacts/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type, id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      if (onUpdate) onUpdate()
    }
  })

  // Mutation: Log Activity
  const logActivityMutation = useMutation({
    mutationFn: async (payload: { type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING'; content: string }) => {
      const body = {
        ...payload,
        [type === 'contact' ? 'contact_id' : 'deal_id']: id
      }
      return apiClient.post('/activities/', body)
    },
    onSuccess: () => {
      setQuickActivityContent('')
      refetchActivities()
      queryClient.invalidateQueries({ queryKey: ['activities', type, id] })
    }
  })

  // Mutation: Add Task
  const addTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const body = {
        ...payload,
        [type === 'contact' ? 'contact_id' : 'deal_id']: id
      }
      return apiClient.post('/tasks/', body)
    },
    onSuccess: () => {
      setNewTaskTitle('')
      setNewTaskDueDate('')
      refetchTasks()
      queryClient.invalidateQueries({ queryKey: ['tasks', type, id] })
    }
  })

  // Mutation: Toggle Task Check status
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, task }: { taskId: string; task: Task }) => {
      const payload = {
        title: task.title,
        description: task.description || '',
        due_date: task.due_date || null,
        priority: task.priority,
        status: task.status === 'DONE' ? 'TODO' : 'DONE',
        assignee_id: task.assignee?.id || null,
        contact_id: task.contact?.id || null,
        deal_id: task.deal?.id || null,
        company_id: task.company?.id || null
      }
      return apiClient.put(`/tasks/${taskId}`, payload)
    },
    onSuccess: () => {
      refetchTasks()
      queryClient.invalidateQueries({ queryKey: ['tasks', type, id] })
    }
  })

  // Fetch associated deals
  const { data: associatedDeals = [] } = useQuery({
    queryKey: ['associated-deals', id],
    queryFn: async () => {
      if (type !== 'contact' || !id) return []
      const response = await apiClient.get<Deal[]>('/deals/', { params: { contact_id: id } })
      return response.data
    },
    enabled: isOpen && type === 'contact' && !!id
  })

  // Fetch associated projects
  const { data: associatedProjects = [] } = useQuery({
    queryKey: ['associated-projects', id],
    queryFn: async () => {
      if (type !== 'contact' || !id) return []
      const response = await apiClient.get<any[]>('/projects/', { params: { contact_id: id } })
      return response.data
    },
    enabled: isOpen && type === 'contact' && !!id
  })

  // Mutation: Extend Lead Lifecycle
  const extendLifecycleMutation = useMutation({
    mutationFn: async (days: number) => {
      return apiClient.post(`/contacts/${id}/extend`, null, { params: { days } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type, id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      if (onUpdate) onUpdate()
    },
    onError: (err: any) => {
      alert(`Extension failed: ${err?.response?.data?.detail || err.message}`)
    }
  })

  // Mutation: Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiClient.delete(`/tasks/${taskId}`)
    },
    onSuccess: () => {
      refetchTasks()
      queryClient.invalidateQueries({ queryKey: ['tasks', type, id] })
    }
  })

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickActivityContent.trim()) return
    logActivityMutation.mutate({
      type: quickActivityType,
      content: quickActivityContent.trim()
    })
  }

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    addTaskMutation.mutate({
      title: newTaskTitle.trim(),
      due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
      priority: newTaskPriority,
      status: 'TODO'
    })
  }

  const handleSaveOverview = (e: React.FormEvent) => {
    e.preventDefault()
    updateItemMutation.mutate(editFields)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end transition-all select-none">
      {/* Dark overlay backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Drawer Body container */}
      <div className="relative w-full max-w-xl bg-zinc-950/95 border-l border-zinc-900 flex flex-col h-full z-10 shadow-2xl animate-slide-in-right overflow-hidden">
        
        {/* Drawer Close / Header */}
        <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-500/15">
              {type} Details
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent rounded transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {isLoadingItem ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-2.5 text-zinc-400">
            <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
            <span className="text-xs font-medium">Fetching details...</span>
          </div>
        ) : itemError || !itemData ? (
          <div className="flex-1 flex flex-col justify-center items-center text-red-400 p-8 text-center">
            <span className="text-sm font-semibold">Error Loading Detail Context</span>
            <span className="text-xs text-zinc-550 mt-1">Please verify model relation keys.</span>
          </div>
        ) : (
          <>
            {/* DRAWER KEY STATS HEADER */}
            <div className="p-6 bg-zinc-950 border-b border-zinc-900 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Title */}
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white line-clamp-1">
                    {type === 'contact'
                      ? `${(itemData as Contact).first_name} ${(itemData as Contact).last_name}`
                      : (itemData as Deal).title}
                  </h2>
                  <p className="text-xs text-zinc-450 mt-0.5">
                    {type === 'contact'
                      ? (itemData as Contact).job_title || 'No Job Title'
                      : (itemData as Deal).company?.name || 'Standalone Deal'}
                  </p>
                </div>

                {/* Key stats badge */}
                <div className="flex items-center gap-2">
                  {type === 'deal' ? (
                    <div className="bg-indigo-600/10 border border-indigo-600/20 px-3 py-1.5 rounded-lg text-right">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Deal Value</span>
                      <span className="text-md font-bold text-indigo-400">
                        ${Number((itemData as Deal).value).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 text-right">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">CRM Status</span>
                      <span className={`text-xs font-bold uppercase rounded ${
                        (itemData as Contact).status === 'CUSTOMER' ? 'text-emerald-450' : 'text-indigo-400'
                      }`}>
                        {(itemData as Contact).status}
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* Dynamic Assigners drop fields */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    {type === 'deal' ? 'Pipeline Stage' : 'Owner Assignee'}
                  </span>
                  
                  {type === 'deal' ? (
                    <div className="relative">
                      <select
                        value={(itemData as Deal).stage.id}
                        onChange={(e) => updateStageMutation.mutate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md p-1.5 focus:border-indigo-650 cursor-pointer appearance-none pr-8"
                      >
                        {stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name} ({stage.win_probability}%)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-3 w-3 text-zinc-500 absolute right-2 top-2.5 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={(itemData as Contact).assigned_to?.id || ''}
                        onChange={(e) => updateAssigneeMutation.mutate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md p-1.5 focus:border-indigo-650 cursor-pointer appearance-none pr-8"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-3 w-3 text-zinc-500 absolute right-2 top-2.5 pointer-events-none" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Associated Org</span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-900/30 border border-zinc-900 px-2 py-1.5 rounded-md min-h-[31px]">
                    <Building className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="truncate">
                      {type === 'deal'
                        ? (itemData as Deal).company?.name || 'Standalone'
                        : (itemData as Contact).company?.name || 'Standalone'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR HEADER */}
            <div className="flex bg-zinc-950 border-b border-zinc-900 px-6 flex-shrink-0">
              {(['overview', 'activities', 'notes', 'tasks'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-zinc-450 hover:text-zinc-200'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'activities' ? 'Activity Feed' : tab}
                </button>
              ))}
            </div>

            {/* TAB ACTIONS PANEL SCROLL CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* ------------ OVERVIEW TAB ------------ */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-indigo-400" /> General Information
                    </span>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-305 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" /> {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </button>
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {type === 'contact' ? (
                        <>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Job Title</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block">
                              {(itemData as Contact).job_title || 'No Job Title'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Email Address</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-zinc-500" />
                              {(itemData as Contact).email}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Phone Number</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-zinc-500" />
                              {(itemData as Contact).phone || 'No Phone Registered'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">CRM Category</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block uppercase">
                              {(itemData as Contact).status}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Deal Opportunity</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block">
                              {(itemData as Deal).title}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Value Amount</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block">
                              ${Number((itemData as Deal).value).toLocaleString()} ({(itemData as Deal).currency})
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Target Close Date</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-zinc-505" />
                              {(itemData as Deal).expected_close_date
                                ? new Date((itemData as Deal).expected_close_date!).toLocaleDateString()
                                : 'No Date Set'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-medium block">Probability Chance</span>
                            <span className="text-zinc-200 font-semibold bg-zinc-900/20 p-2 rounded block">
                              {(itemData as Deal).probability ?? 0}% Win Rate
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    // EDITABLE FORM VIEWS
                    <form onSubmit={handleSaveOverview} className="space-y-4">
                      {type === 'contact' ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">First Name</label>
                              <input
                                type="text"
                                value={editFields.first_name || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, first_name: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Last Name</label>
                              <input
                                type="text"
                                value={editFields.last_name || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, last_name: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Email Address</label>
                              <input
                                type="email"
                                value={editFields.email || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Phone</label>
                              <input
                                type="text"
                                value={editFields.phone || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Job Title</label>
                              <input
                                type="text"
                                value={editFields.job_title || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, job_title: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Status</label>
                              <select
                                value={editFields.status || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650 cursor-pointer"
                              >
                                <option value="LEAD">Lead</option>
                                <option value="CONTACT">Contact</option>
                                <option value="CUSTOMER">Customer</option>
                              </select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase">Deal Title</label>
                            <input
                              type="text"
                              value={editFields.title || ''}
                              onChange={(e) => setEditFields(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Value ($)</label>
                              <input
                                type="text"
                                value={editFields.value || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, value: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Win Probability (%)</label>
                              <input
                                type="number"
                                value={editFields.probability || 0}
                                onChange={(e) => setEditFields(prev => ({ ...prev, probability: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Target Close Date</label>
                              <input
                                type="date"
                                value={editFields.expected_close_date || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, expected_close_date: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650 cursor-pointer"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Status</label>
                              <select
                                value={editFields.status || ''}
                                onChange={(e) => setEditFields(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650 cursor-pointer"
                              >
                                <option value="OPEN">Open</option>
                                <option value="WON">Won</option>
                                <option value="LOST">Lost</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 border border-zinc-900 rounded text-zinc-400 hover:bg-zinc-90 w hover:text-white tracking-wide cursor-pointer text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={updateItemMutation.isPending}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold cursor-pointer text-xs flex items-center gap-1.5"
                        >
                          {updateItemMutation.isPending && (
                            <span className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                          )}
                          Save Changes
                        </button>
                      </div>
                  )}

                  {/* Lead Lifecycle Extension - for Leads */}
                  {type === 'contact' && (itemData as Contact).status === 'LEAD' && (
                    <div className="bg-amber-955/20 border border-amber-900/35 rounded-xl p-4.5 space-y-3 mt-4">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-amber-500 uppercase tracking-widest">
                          Lead Lifecycle Automations
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                          (itemData as Contact).lifecycle_status === 'ACTIVE'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                        }`}>
                          {(itemData as Contact).lifecycle_status}
                        </span>
                      </div>
                      
                      <div className="p-3 bg-zinc-900/35 border border-zinc-900/80 rounded-lg space-y-2 text-xs font-semibold">
                        <div className="flex justify-between text-zinc-300">
                          <span>Lifecycle Started At:</span>
                          <span className="text-zinc-405">
                            {(itemData as Contact).lifecycle_started_at
                              ? new Date((itemData as Contact).lifecycle_started_at!).toLocaleString()
                              : 'Not Started'}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Extra Days Granted:</span>
                          <span className="text-amber-400">
                            {(itemData as Contact).lifecycle_extension_days || 0} Days
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Grant Extension:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={extendLifecycleMutation.isPending}
                            onClick={() => extendLifecycleMutation.mutate(7)}
                            className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-450 hover:text-amber-300 rounded font-bold text-[10px] uppercase transition-all tracking-wider cursor-pointer"
                          >
                            +7 Days
                          </button>
                          <button
                            type="button"
                            disabled={extendLifecycleMutation.isPending}
                            onClick={() => extendLifecycleMutation.mutate(14)}
                            className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-450 hover:text-amber-300 rounded font-bold text-[10px] uppercase transition-all tracking-wider cursor-pointer"
                          >
                            +14 Days
                          </button>
                          <button
                            type="button"
                            disabled={extendLifecycleMutation.isPending}
                            onClick={() => extendLifecycleMutation.mutate(30)}
                            className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-450 hover:text-amber-300 rounded font-bold text-[10px] uppercase transition-all tracking-wider cursor-pointer"
                          >
                            +30 Days
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Associated Deals & Projects List */}
                  {type === 'contact' && (
                    <div className="space-y-4 pt-2">
                      <div className="border-t border-zinc-900 pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            Connected Deals ({associatedDeals.length})
                          </span>
                        </div>
                        {associatedDeals.length === 0 ? (
                          <div className="py-6 px-4 bg-zinc-900/10 border border-zinc-900/60 rounded-xl text-center text-zinc-650 text-xs italic">
                            No deals associated with this contact yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5">
                            {associatedDeals.map((dl) => (
                              <div key={dl.id} className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-zinc-200 block truncate">{dl.title}</span>
                                  <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">
                                    Stage: {dl.stage?.name || 'Unknown'} • Expect Close: {dl.expected_close_date ? new Date(dl.expected_close_date).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-xs font-bold text-indigo-400 block">${Number(dl.value).toLocaleString()}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-zinc-900 border border-zinc-850 text-zinc-450 font-bold uppercase tracking-wider mt-1 inline-block">
                                    {dl.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            Connected Projects ({associatedProjects.length})
                          </span>
                        </div>
                        {associatedProjects.length === 0 ? (
                          <div className="py-6 px-4 bg-zinc-900/10 border border-zinc-900/60 rounded-xl text-center text-zinc-650 text-xs italic">
                            No projects associated with this contact yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5">
                            {associatedProjects.map((proj) => (
                              <div key={proj.id} className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-zinc-205 block truncate">{proj.name}</span>
                                  <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">
                                    Range: {proj.start_date ? new Date(proj.start_date).toLocaleDateString() : 'N/A'} to {proj.end_date ? new Date(proj.end_date).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider bg-zinc-900 border-zinc-850 text-zinc-400">
                                    {proj.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------ ACTIVITY HIST / TIMELINE TAB ------------ */}
              {(activeTab === 'activities' || activeTab === 'notes') && (
                <div className="space-y-6">
                  
                  {/* QUICK LOGGER PANEL */}
                  <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4.5 space-y-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-zinc-400 uppercase tracking-widest">
                        Quick Activity Logger
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickActivityType('NOTE')}
                          className={`px-3 py-1 rounded-md font-bold uppercase transition-all tracking-wider ${
                            quickActivityType === 'NOTE'
                              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                              : 'text-zinc-500 border border-transparent hover:text-zinc-300'
                          }`}
                        >
                          Note
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickActivityType('CALL')}
                          className={`px-3 py-1 rounded-md font-bold uppercase transition-all tracking-wider ${
                            quickActivityType === 'CALL'
                              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                              : 'text-zinc-500 border border-transparent hover:text-zinc-300'
                          }`}
                        >
                          Call
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleQuickLogSubmit} className="space-y-2">
                      <textarea
                        value={quickActivityContent}
                        onChange={(e) => setQuickActivityContent(e.target.value)}
                        placeholder={
                          quickActivityType === 'NOTE'
                            ? 'Add details for a note regarding this account...'
                            : 'Log call outcomes (e.g. Discussed pricing details...)'
                        }
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-250 placeholder-zinc-650 h-20 focus:outline-none focus:border-indigo-650 resize-y input-fade"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={logActivityMutation.isPending || !quickActivityContent.trim()}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/10 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {logActivityMutation.isPending && (
                            <span className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                          )}
                          Log {quickActivityType === 'NOTE' ? 'Note' : 'Call'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* TIMELINE FEED */}
                  <div className="space-y-4">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">
                      {activeTab === 'notes' ? 'Logged Notes' : 'Interaction Timeline'}
                    </span>

                    {/* Filter local activities based on tab */}
                    {(() => {
                      const list = (activitiesData || []).filter((act) => {
                        if (activeTab === 'notes') return act.type === 'NOTE'
                        return true
                      })

                      if (list.length === 0) {
                        return (
                          <div className="py-10 text-center text-zinc-600 text-xs italic">
                            No activities logged yet. Use the logger above.
                          </div>
                        )
                      }

                      return (
                        <div className="relative border-l border-zinc-900/80 ml-3.5 space-y-6 pt-2 block">
                          {list.map((act) => {
                            const dateStr = new Date(act.activity_date).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })

                            // Pick icon based on type
                            const iconStyles = {
                              NOTE: 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400',
                              CALL: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
                              EMAIL: 'bg-blue-500/15 border-blue-500/25 text-blue-400',
                              MEETING: 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                            }[act.type] || 'bg-zinc-800 text-zinc-400'

                            return (
                              <div key={act.id} className="relative pl-7 group">
                                {/* Timeline Dot Icon */}
                                <div className={`absolute -left-[14px] top-0 h-7 w-7 rounded-full border flex items-center justify-center ${iconStyles}`}>
                                  {act.type === 'NOTE' && <MessageSquare className="h-3.5 w-3.5" />}
                                  {act.type === 'CALL' && <Phone className="h-3.5 w-3.5" />}
                                  {act.type === 'EMAIL' && <Mail className="h-3.5 w-3.5" />}
                                  {act.type === 'MEETING' && <Calendar className="h-3.5 w-3.5" />}
                                </div>

                                {/* Content box */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-zinc-350 uppercase tracking-wide">
                                      {act.type === 'NOTE' && 'Internal Note'}
                                      {act.type === 'CALL' && 'Phone Connection'}
                                      {act.type === 'EMAIL' && 'Email Dispatched'}
                                      {act.type === 'MEETING' && 'Client Meeting'}
                                    </span>
                                    <span className="text-[10px] text-zinc-550 font-medium">
                                      {dateStr}
                                    </span>
                                  </div>
                                  
                                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/10 border border-zinc-900/30 p-2.5 rounded-lg">
                                    {act.content}
                                  </p>

                                  {act.performed_by && (
                                    <div className="text-[9px] text-zinc-550 font-semibold tracking-wide flex items-center gap-1">
                                      <div className="h-3.5 w-3.5 rounded-full bg-zinc-800/80 flex items-center justify-center font-bold text-[8px] uppercase">
                                        {act.performed_by.first_name[0]}{act.performed_by.last_name[0]}
                                      </div>
                                      Logged by {act.performed_by.first_name} {act.performed_by.last_name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ------------ TASKS CHECKLIST TAB ------------ */}
              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  
                  {/* TASK CREATION FORM */}
                  <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4.5 space-y-3">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      Define New Task Task
                    </span>

                    <form onSubmit={handleAddTaskSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Task Name *</label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Follow-up on product feedback next Monday..."
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">Target Due Date</label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="w-full bg-zinc-905 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">Priority Tier</label>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value as any)}
                            className="w-full bg-zinc-905 border border-zinc-800 rounded p-2 text-xs text-zinc-205 focus:outline-none focus:border-indigo-650 cursor-pointer"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={addTaskMutation.isPending || !newTaskTitle.trim()}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Append Task
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* ACTIVE/INACTIVE TASKS LIST */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-zinc-505 font-bold uppercase tracking-widest block">
                      Tasks Checklist
                    </span>

                    {(!tasksData || tasksData.length === 0) ? (
                      <div className="py-10 text-center text-zinc-650 text-xs italic">
                        No tasks registered. Append a new task above.
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {tasksData.map((task) => {
                          const isCompleted = task.status === 'DONE'
                          const dateText = task.due_date
                            ? new Date(task.due_date).toLocaleDateString()
                            : null

                          const priorityBadge = {
                            LOW: 'bg-zinc-900 border-zinc-850 text-zinc-450',
                            MEDIUM: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                            HIGH: 'bg-rose-500/10 border-rose-500/20 text-rose-405'
                          }[task.priority] || 'bg-zinc-800 text-zinc-400'

                          return (
                            <div
                              key={task.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                isCompleted
                                  ? 'bg-[#09090b]/40 border-zinc-950 opacity-60'
                                  : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Toggle Button checkbox */}
                                <button
                                  type="button"
                                  onClick={() => toggleTaskMutation.mutate({ taskId: task.id, task })}
                                  className={`h-5 w-5 rounded border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                                    isCompleted
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'
                                  }`}
                                >
                                  {isCompleted && <Check className="h-3 w-3" />}
                                </button>
                                
                                <div className="min-w-0">
                                  <span className={`text-xs font-semibold block truncate ${
                                    isCompleted ? 'line-through text-zinc-550' : 'text-zinc-200'
                                  }`}>
                                    {task.title}
                                  </span>
                                  {dateText && (
                                    <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">
                                      Due: {dateText}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${priorityBadge}`}>
                                  {task.priority}
                                </span>
                                
                                <button
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="text-zinc-550 hover:text-red-405 p-1 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                                  title="Delete task item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
