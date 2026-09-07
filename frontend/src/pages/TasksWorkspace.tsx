import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Task, User, Team, Deal, Contact, Company, ChecklistItem, TaskComment } from '@/types/crm'
import {
  List as ListIcon,
  Kanban as KanbanIcon,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Users as UsersIcon,
  CheckSquare,
  MessageSquare,
  Paperclip,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'

// Component
export default function TasksWorkspace() {
  const queryClient = useQueryClient()
  
  // Workspace Views: 'list' | 'kanban' | 'calendar'
  const [currentView, setCurrentView] = useState<'list' | 'kanban' | 'calendar'>('list')
  
  // Filter States
  const [filterAssignee, setFilterAssignee] = useState<string>('')
  const [filterTeam, setFilterTeam] = useState<string>('')
  const [filterOverdue, setFilterOverdue] = useState<boolean | null>(null)
  
  // Selected / Active Task for Drawer Detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  // New Task Dialog state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    start_date: '',
    due_date: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    status: 'TODO' as 'TODO' | 'IN_PROGRESS' | 'DONE',
    assignee_id: '',
    task_team_id: '',
    deal_id: '',
    contact_id: '',
    partner_id: '',
    company_id: ''
  })

  // Checklist / Comment inputs inside details modal
  const [newChecklistText, setNewChecklistText] = useState('')
  const [newCommentText, setNewCommentText] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')

  // Calendar Date State (Current focused month)
  const [calendarDate, setCalendarDate] = useState(() => new Date())

  // Queries
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['workspace-tasks', filterAssignee, filterTeam, filterOverdue],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 200 }
      if (filterAssignee) params.assignee_id = filterAssignee
      if (filterTeam) params.team_id = filterTeam
      if (filterOverdue !== null) params.overdue = filterOverdue
      
      const response = await apiClient.get<any>('/tasks/', { params })
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['workspace-users'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/accounts/')
      return Array.isArray(response.data) ? response.data : (response.data as any)?.items || []
    }
  })

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['workspace-teams'],
    queryFn: async () => {
      const response = await apiClient.get<Team[]>('/accounts/teams')
      return Array.isArray(response.data) ? response.data : (response.data as any)?.items || []
    }
  })

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ['workspace-deals'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/deals/', { params: { limit: 100 } })
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['workspace-contacts'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/contacts/')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  const { data: partners = [] } = useQuery<Contact[]>({
    queryKey: ['workspace-partners'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/contacts/partners')
      return Array.isArray(response.data) ? response.data : (response.data?.items || [])
    }
  })

  // Selected Task details query
  const { data: taskDetails, refetch: refetchTaskDetails } = useQuery<Task>({
    queryKey: ['task-details', selectedTaskId],
    queryFn: async () => {
      const response = await apiClient.get<Task>(`/tasks/${selectedTaskId}`)
      return response.data
    },
    enabled: !!selectedTaskId
  })

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (body: typeof newTaskForm) => {
      const formatted = {
        title: body.title,
        description: body.description || null,
        start_date: body.start_date ? new Date(body.start_date).toISOString() : null,
        due_date: body.due_date ? new Date(body.due_date).toISOString() : null,
        priority: body.priority,
        status: body.status,
        assignee_id: body.assignee_id || null,
        task_team_id: body.task_team_id || null,
        deal_id: body.deal_id || null,
        contact_id: body.contact_id || null,
        partner_id: body.partner_id || null,
        company_id: body.company_id || null
      }
      return apiClient.post('/tasks/', formatted)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks'] })
      setIsCreateModalOpen(false)
      setErrorMessage(null)
      setNewTaskForm({
        title: '',
        description: '',
        start_date: '',
        due_date: '',
        priority: 'MEDIUM',
        status: 'TODO',
        assignee_id: '',
        task_team_id: '',
        deal_id: '',
        contact_id: '',
        partner_id: '',
        company_id: ''
      })
    },
    onError: (err: any) => {
      console.error("Task creation failed:", err)
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (Array.isArray(detail)) {
          setErrorMessage(detail.map((e: any) => `${e.loc?.join(' -> ')}: ${e.msg}`).join(', '))
        } else if (typeof detail === 'string') {
          setErrorMessage(detail)
        } else {
          setErrorMessage("Failed to create task.")
        }
      } else {
        setErrorMessage("Failed to create task. Please check input data.")
      }
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Task> & { assignee_id?: string | null; task_team_id?: string | null } }) => {
      // Find full models or convert keys
      const existing = tasks.find(t => t.id === id)
      if (!existing) throw new Error("Task not found locally")
      
      const payload = {
        title: body.title !== undefined ? body.title : existing.title,
        description: body.description !== undefined ? body.description : (existing.description || ''),
        start_date: body.start_date !== undefined ? body.start_date : (existing.start_date || null),
        due_date: body.due_date !== undefined ? body.due_date : (existing.due_date || null),
        priority: body.priority !== undefined ? body.priority : existing.priority,
        status: body.status !== undefined ? body.status : existing.status,
        assignee_id: body.assignee_id !== undefined ? body.assignee_id : (existing.assignee?.id || null),
        task_team_id: body.task_team_id !== undefined ? body.task_team_id : (existing.task_team?.id || null),
        deal_id: existing.deal?.id || null,
        contact_id: existing.contact?.id || null,
        company_id: existing.company?.id || null,
        attachments: body.attachments !== undefined ? body.attachments : (existing.attachments || []),
        checklist: body.checklist !== undefined ? body.checklist : (existing.checklist || []),
        comments: body.comments !== undefined ? body.comments : (existing.comments || [])
      }

      return apiClient.put(`/tasks/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks'] })
      if (selectedTaskId) {
        refetchTaskDetails()
      }
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks'] })
      setSelectedTaskId(null)
    }
  })

  // Quick close/toggle function
  const handleQuickToggleStatus = (task: Task) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    updateTaskMutation.mutate({
      id: task.id,
      body: { status: nextStatus }
    })
  }

  // --- Checklist helper handlers ---
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistText.trim() || !taskDetails) return
    const newItem: ChecklistItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      title: newChecklistText.trim(),
      is_completed: false
    }
    const currentList = taskDetails.checklist || []
    updateTaskMutation.mutate({
      id: taskDetails.id,
      body: { checklist: [...currentList, newItem] }
    })
    setNewChecklistText('')
  }

  const handleToggleChecklistItem = (item: ChecklistItem) => {
    if (!taskDetails) return
    const list = (taskDetails.checklist || []).map(x => 
      x.id === item.id ? { ...x, is_completed: !x.is_completed } : x
    )
    updateTaskMutation.mutate({
      id: taskDetails.id,
      body: { checklist: list }
    })
  }

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!taskDetails) return
    const list = (taskDetails.checklist || []).filter(x => x.id !== itemId)
    updateTaskMutation.mutate({
      id: taskDetails.id,
      body: { checklist: list }
    })
  }

  // --- Comments logic ---
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || !taskDetails) return
    const currentUserRaw = localStorage.getItem('current_user')
    const userObj = currentUserRaw ? JSON.parse(currentUserRaw) : null
    const authorName = userObj ? `${userObj.first_name} ${userObj.last_name}` : 'Unknown Author'
    
    const newComment: TaskComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      content: newCommentText.trim(),
      author: authorName,
      created_at: new Date().toISOString()
    }
    const currentList = taskDetails.comments || []
    updateTaskMutation.mutate({
      id: taskDetails.id,
      body: { comments: [...currentList, newComment] }
    })
    setNewCommentText('')
  }

  // --- Attachments logic ---
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAttachmentUrl.trim() || !taskDetails) return
    const attachments = taskDetails.attachments || []
    updateTaskMutation.mutate({
      id: taskDetails.id,
      body: { attachments: [...attachments, newAttachmentUrl.trim()] }
    })
    setNewAttachmentUrl('')
  }

  const handleDeleteAttachment = (indexToRemove: number) => {
    if (!taskDetails) return
    const attachments = (taskDetails.attachments || []).filter((_, idx) => idx !== indexToRemove)
    updateTaskMutation.mutate({
      id: taskDetails.id,
      body: { attachments }
    })
  }

  // --- Calendar Builder ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Start offset (how many days to buffer from previous month to align Monday/Sunday)
    // 0 is Sunday, 1 is Monday... let's align Sunday (0)
    const startDayOfWeek = firstDay.getDay()
    const days: Date[] = []

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    // Next month filler days to complete a 42-day calendar grid (6 rows)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }
    return days
  }

  const changeCalendarMonth = (offset: number) => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const calendarDaysList = getDaysInMonth(calendarDate)

  return (
    <div className="space-y-6">
      {/* Workspace Sub Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 shadow-lg shadow-zinc-950/40">
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('list')}
              className={`p-2 rounded-md ${currentView === 'list' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'} transition-all cursor-pointer`}
              title="List View"
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className={`p-2 rounded-md ${currentView === 'kanban' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'} transition-all cursor-pointer`}
              title="Kanban Board"
            >
              <KanbanIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={`p-2 rounded-md ${currentView === 'calendar' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'} transition-all cursor-pointer`}
              title="Calendar grid"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white pl-2">
            Tasks Workspace
          </h1>
        </div>

        {/* Global Task Filtering controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-550 font-bold uppercase tracking-wider text-[10px]">Assignee</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md p-1.5 focus:border-indigo-650 focus:outline-none text-zinc-300 cursor-pointer"
            >
              <option value="">All Members</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-550 font-bold uppercase tracking-wider text-[10px]">Team</span>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md p-1.5 focus:border-indigo-650 focus:outline-none text-zinc-300 cursor-pointer"
            >
              <option value="">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Overdue filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-550 font-bold uppercase tracking-wider text-[10px]">Status Duration</span>
            <select
              value={filterOverdue === null ? 'all' : filterOverdue.toString()}
              onChange={(e) => {
                const val = e.target.value
                if (val === 'all') setFilterOverdue(null)
                else setFilterOverdue(val === 'true')
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-md p-1.5 focus:border-indigo-650 focus:outline-none text-zinc-300 cursor-pointer"
            >
              <option value="all">All Tasks</option>
              <option value="true">Overdue only</option>
              <option value="false">Active / Completed</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {isLoadingTasks ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <span className="text-sm font-semibold">Loading task board...</span>
        </div>
      ) : (
        <>
          {/* =================== LIST VIEW =================== */}
          {currentView === 'list' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-xl shadow-zinc-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">Status</th>
                      <th className="py-3 px-4">Task Details</th>
                      <th className="py-3 px-4 w-28">Priority</th>
                      <th className="py-3 px-4 w-32">Due Date</th>
                      <th className="py-3 px-4 w-36">Assignee</th>
                      <th className="py-3 px-4 w-36">Team Unit</th>
                      <th className="py-3 px-4 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-zinc-650 italic">
                          No tasks match the active filters.
                        </td>
                      </tr>
                    ) : (
                      tasks.map((task) => {
                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE'
                        return (
                          <tr key={task.id} className="hover:bg-zinc-900/30 transition-all border-b border-zinc-900/60">
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={task.status === 'DONE'}
                                onChange={() => handleQuickToggleStatus(task)}
                                className="h-4.5 w-4.5 rounded border-zinc-800 text-indigo-650 focus:ring-indigo-650/45 cursor-pointer bg-zinc-900"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <button
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className="font-bold text-zinc-200 hover:text-indigo-400 transition-colors text-left"
                                >
                                  {task.title}
                                </button>
                                {task.description && (
                                  <p className="text-zinc-550 line-clamp-1 max-w-lg">{task.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block font-extrabold uppercase text-[9px] px-2 py-0.5 rounded border ${
                                task.priority === 'HIGH'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                  : task.priority === 'MEDIUM'
                                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                              }`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {task.due_date ? (
                                <span className={`flex items-center gap-1.5 font-medium ${isOverdue ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                                  <Clock className="h-3.5 w-3.5" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-zinc-650">No Date</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {task.assignee ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-350 flex items-center justify-center uppercase">
                                    {(task.assignee.first_name[0] + task.assignee.last_name[0]).toUpperCase()}
                                  </div>
                                  <span className="text-zinc-300 font-medium truncate">
                                    {task.assignee.first_name} {task.assignee.last_name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-650 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {task.task_team ? (
                                <div className="flex items-center gap-1.5 text-zinc-450 font-semibold">
                                  <UsersIcon className="h-3.5 w-3.5 text-zinc-655" />
                                  <span className="truncate">{task.task_team.name}</span>
                                </div>
                              ) : (
                                <span className="text-zinc-650">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                className="p-1 hover:bg-red-500/10 text-zinc-550 hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================== KANBAN VIEW =================== */}
          {currentView === 'kanban' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => {
                const columnTasks = tasks.filter(t => t.status === status)
                const statusTitle = {
                  TODO: 'To Do',
                  IN_PROGRESS: 'In Progress',
                  DONE: 'Completed'
                }[status]

                const statusColor = {
                  TODO: 'bg-zinc-500',
                  IN_PROGRESS: 'bg-amber-500',
                  DONE: 'bg-emerald-500'
                }[status]

                return (
                  <div key={status} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col h-[650px]">
                    <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900 mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                        <span className="text-sm font-bold text-zinc-200">{statusTitle}</span>
                        <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">
                          {columnTasks.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                      {columnTasks.length === 0 ? (
                        <div className="border border-dashed border-zinc-900 h-28 rounded-lg flex items-center justify-center text-zinc-650 text-xs italic">
                          No tasks in this stage.
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE'
                          return (
                            <div
                              key={task.id}
                              className="bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800/80 rounded-xl p-4 transition-all duration-200 shadow-md flex flex-col justify-between space-y-3 cursor-default"
                            >
                              <div className="space-y-1">
                                <span className={`inline-block font-extrabold uppercase text-[8px] px-1.5 py-0.5 rounded border ${
                                  task.priority === 'HIGH'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                    : task.priority === 'MEDIUM'
                                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                                }`}>
                                  {task.priority} Priority
                                </span>

                                <button
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className="font-bold text-zinc-250 hover:text-indigo-400 text-xs text-left block leading-snug line-clamp-2 w-full mt-1.5"
                                >
                                  {task.title}
                                </button>

                                {task.description && (
                                  <p className="text-[11px] text-zinc-550 line-clamp-2 pt-0.5">{task.description}</p>
                                )}
                              </div>

                              <div className="border-t border-zinc-900/60 pt-3 flex items-center justify-between text-[11px] text-zinc-500">
                                <div className="flex items-center gap-1.5">
                                  {task.due_date ? (
                                    <span className={`flex items-center gap-1 font-semibold ${isOverdue ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                                      <Clock className="h-3 w-3" />
                                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-650">No CloseDate</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {task.task_team && (
                                    <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 rounded-md px-1.5 py-0.5">
                                      {task.task_team.name}
                                    </span>
                                  )}
                                  
                                  {task.assignee ? (
                                    <div
                                      className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-300 flex items-center justify-center uppercase"
                                      title={`${task.assignee.first_name} ${task.assignee.last_name}`}
                                    >
                                      {(task.assignee.first_name[0] + task.assignee.last_name[0]).toUpperCase()}
                                    </div>
                                  ) : (
                                    <UserIcon className="h-4.5 w-4.5 text-zinc-650" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* =================== CALENDAR VIEW =================== */}
          {currentView === 'calendar' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
              {/* Calendar header controls */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-900/35">
                <h3 className="text-sm font-bold text-zinc-200">
                  {calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeCalendarMonth(-1)}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:text-white transition-colors cursor-pointer text-zinc-400"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date())}
                    className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => changeCalendarMonth(1)}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:text-white transition-colors cursor-pointer text-zinc-400"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day names headers */}
              <div className="grid grid-cols-7 border-b border-zinc-900 text-center font-bold text-zinc-550 uppercase tracking-widest text-[9px] py-2 bg-zinc-950">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Days grid layout */}
              <div className="grid grid-cols-7 grid-rows-6 h-[600px] divide-x divide-y divide-zinc-900 bg-zinc-950/20">
                {calendarDaysList.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === calendarDate.getMonth()
                  const isToday = day.toDateString() === new Date().toDateString()
                  
                  // Filter tasks due on this date (based on local user timezone date strings)
                  const dayTasks = tasks.filter((t) => {
                    if (!t.due_date) return false
                    const dueDate = new Date(t.due_date)
                    return dueDate.getFullYear() === day.getFullYear() &&
                           dueDate.getMonth() === day.getMonth() &&
                           dueDate.getDate() === day.getDate()
                  })

                  return (
                    <div
                      key={idx}
                      className={`p-2 flex flex-col justify-between group overflow-hidden ${
                        isCurrentMonth ? 'bg-zinc-950/10' : 'bg-zinc-950/40 opacity-30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                          isToday ? 'bg-indigo-600 text-white font-extrabold' : 'text-zinc-450'
                        }`}>
                          {day.getDate()}
                        </span>

                        {dayTasks.length > 0 && (
                          <span className="text-[9px] font-bold text-indigo-400 md:hidden bg-indigo-500/10 px-1 rounded">
                            {dayTasks.length}t
                          </span>
                        )}
                      </div>

                      {/* Display small task badges */}
                      <div className="flex-1 mt-1 space-y-1 overflow-y-auto block custom-scrollbar">
                        {dayTasks.map((t) => {
                          const priorityColor = {
                            HIGH: 'border-red-500/30 bg-red-650/10 text-red-400',
                            MEDIUM: 'border-yellow-500/30 bg-yellow-650/10 text-yellow-405',
                            LOW: 'border-emerald-500/30 bg-emerald-650/10 text-emerald-450'
                          }[t.priority] || 'border-zinc-800 bg-zinc-900 text-zinc-400'

                          return (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTaskId(t.id)}
                              className={`w-full text-left truncate text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityColor} block hover:opacity-80 transition-opacity`}
                              title={t.title}
                            >
                              {t.status === 'DONE' && '✓ '}{t.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* =================== CREATE TASK DIALOG =================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative bg-zinc-950 border border-zinc-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl z-10 animate-scale-in">
            <div className="px-6 py-4.5 border-b border-zinc-900 flex justify-between items-center text-sm">
              <h3 className="font-bold text-white text-md">Create New Workspace Task</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-zinc-450 hover:text-white rounded hover:bg-zinc-905 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createTaskMutation.mutate(newTaskForm)
              }}
              className="p-6 space-y-4 text-xs font-semibold text-zinc-400"
            >
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Task Owner (Staff) & Subject */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Task Owner (Staff)</label>
                  <select
                    value={newTaskForm.assignee_id}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, assignee_id: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="Task subject..."
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                  />
                </div>
              </div>

              {/* Due Date & Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Contact</label>
                  <select
                    value={newTaskForm.contact_id}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, contact_id: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="">No Contact</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name || ''} ({c.phone || c.email || 'No contact info'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Partner & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Partner</label>
                  <select
                    value={newTaskForm.partner_id}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, partner_id: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="">No Partner</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : (p.company?.name || 'Partner')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Status</label>
                <select
                  value={newTaskForm.status}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Completed</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Description</label>
                <textarea
                  placeholder="Task description details..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-250 h-20 resize-none focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-zinc-900 hover:bg-zinc-900 rounded text-zinc-400 hover:text-white font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                >
                  {createTaskMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================== TASK DETAILED OVERLAY =================== */}
      {selectedTaskId && taskDetails && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedTaskId(null)} />
          
          <div className="relative w-full max-w-xl bg-zinc-950 border-l border-zinc-900 flex flex-col h-full z-10 shadow-2xl animate-slide-in-right overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center text-sm">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-500/15">
                Task Workspace details
              </span>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="p-1 text-zinc-405 hover:text-white rounded hover:bg-zinc-900 border border-transparent transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Scroll area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-400">
              
              {/* Title & Desc */}
              <div className="space-y-2 border-b border-zinc-900 pb-5">
                <h2 className="text-lg font-bold text-white leading-snug">{taskDetails.title}</h2>
                <p className="text-zinc-400 text-xs italic bg-zinc-900/30 border border-zinc-900 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {taskDetails.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-zinc-550 pt-1 font-bold">
                  <span>Status:</span>
                  <span className="text-indigo-400 uppercase">{taskDetails.status}</span>
                  <span className="px-1.5">•</span>
                  <span>Priority:</span>
                  <span className="text-yellow-405 uppercase">{taskDetails.priority}</span>
                </div>
              </div>

              {/* Date/Assignee grid */}
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-5 text-[11px]">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-550 font-bold uppercase tracking-wider text-[9px]">Assignee</span>
                    <span className="text-zinc-300 font-semibold truncate max-w-[120px]">
                      {taskDetails.assignee ? `${taskDetails.assignee.first_name} ${taskDetails.assignee.last_name}` : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-550 font-bold uppercase tracking-wider text-[9px]">Team Unit</span>
                    <span className="text-zinc-300 font-semibold truncate max-w-[120px]">
                      {taskDetails.task_team?.name || '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-550 font-bold uppercase tracking-wider text-[9px]">Start Date</span>
                    <span className="text-zinc-300 font-semibold">
                      {taskDetails.start_date ? new Date(taskDetails.start_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-550 font-bold uppercase tracking-wider text-[9px]">Due Date</span>
                    <span className="text-zinc-300 font-semibold">
                      {taskDetails.due_date ? new Date(taskDetails.due_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checklist panel */}
              <div className="space-y-3.5 border-b border-zinc-900 pb-5">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-indigo-400" /> Task Checklist
                </span>
                
                <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add checklist sub-task..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-650"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded transition-all cursor-pointer">
                    Add
                  </button>
                </form>

                <div className="space-y-2 shadow-inner max-h-40 overflow-y-auto block">
                  {(taskDetails.checklist || []).length === 0 ? (
                    <span className="text-zinc-650 italic text-[11px]">No checklist elements configured.</span>
                  ) : (
                    (taskDetails.checklist || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-zinc-900/35 border border-zinc-900/70 p-2 rounded-lg">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={() => handleToggleChecklistItem(item)}
                            className="h-4.5 w-4.5 rounded border-zinc-800 text-indigo-650 focus:ring-indigo-650/45 cursor-pointer bg-zinc-900"
                          />
                          <span className={`text-[11px] ${item.is_completed ? 'line-through text-zinc-650' : 'text-zinc-250 font-medium'}`}>
                            {item.title}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="text-zinc-550 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attachments panel */}
              <div className="space-y-3.5 border-b border-zinc-900 pb-5">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-indigo-400" /> Task URL Attachments
                </span>
                
                <form onSubmit={handleAddAttachment} className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/asset.pdf"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-650"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded transition-all cursor-pointer">
                    Attach
                  </button>
                </form>

                <div className="space-y-2">
                  {(taskDetails.attachments || []).length === 0 ? (
                    <span className="text-zinc-650 italic text-[11px]">No link attachments added yet.</span>
                  ) : (
                    (taskDetails.attachments || []).map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-zinc-900/35 border border-zinc-900/70 p-2 rounded-lg">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 truncate font-semibold max-w-[400px]"
                        >
                          {url}
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(idx)}
                          className="text-zinc-550 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comments list timeline */}
              <div className="space-y-3.5">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-indigo-400" /> Interaction Comments
                </span>

                <form onSubmit={handleAddComment} className="space-y-2">
                  <textarea
                    placeholder="Write a comment query info..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-250 placeholder-zinc-650 h-16 focus:outline-none focus:border-indigo-650 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>

                <div className="space-y-3 pt-2">
                  {(taskDetails.comments || []).length === 0 ? (
                    <span className="text-zinc-650 italic text-[11px] block text-center py-4">No comments logged.</span>
                  ) : (
                    (taskDetails.comments || []).slice().reverse().map((c) => (
                      <div key={c.id} className="bg-zinc-900/35 border border-zinc-900/70 p-3 rounded-lg space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-indigo-400 font-bold">{c.author}</span>
                          <span className="text-zinc-550">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed leading-normal">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
