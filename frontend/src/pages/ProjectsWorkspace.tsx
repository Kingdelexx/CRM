import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import type { Project, User, Deal } from '@/types/crm'
import {
  FolderKanban,
  Plus,
  Calendar,
  User as UserIcon,
  Layers,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Users2
} from 'lucide-react'

export default function ProjectsWorkspace() {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer / Form States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'PLANNING' as Project['status'],
    start_date: '',
    end_date: '',
    manager_id: '',
    deal_id: '',
    progress: 0,
    members_ids: [] as string[],
    newAttachment: ''
  })

  // Details drawer
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [projRes, userRes, dealRes] = await Promise.all([
        apiClient.get<any>('/projects/'),
        apiClient.get<User[]>('/accounts/'),
        apiClient.get<any>('/deals/')
      ])
      const projList = Array.isArray(projRes.data) ? projRes.data : projRes.data?.items || []
      setProjects(projList)
      setUsers(userRes.data)
      
      // Some endpoints return nested lists, let's normalize deals list
      const dealsList = Array.isArray(dealRes.data) ? dealRes.data : dealRes.data?.items || dealRes.data?.results || []
      setDeals(dealsList)
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError('Failed to load workspace data. Please make sure the backend is active.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  const handleOpenCreatePopup = () => {
    setEditingProject(null)
    setFormData({
      name: '',
      description: '',
      status: 'PLANNING',
      start_date: '',
      end_date: '',
      manager_id: '',
      deal_id: '',
      progress: 0,
      members_ids: [],
      newAttachment: ''
    })
    setIsDrawerOpen(true)
  }

  const handleOpenEditPopup = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      manager_id: project.manager?.id || '',
      deal_id: project.deal?.id || '',
      progress: project.progress || 0,
      members_ids: project.members?.map(m => m.id) || [],
      newAttachment: ''
    })
    setIsDrawerOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    const payload = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      manager_id: formData.manager_id || null,
      deal_id: formData.deal_id || null,
      progress: Number(formData.progress),
      members_ids: formData.members_ids
    }

    try {
      if (editingProject) {
        const response = await apiClient.put<Project>(`/projects/${editingProject.id}`, payload)
        setProjects(projects.map(p => p.id === editingProject.id ? response.data : p))
        if (selectedProject?.id === editingProject.id) {
          setSelectedProject(response.data)
        }
      } else {
        const response = await apiClient.post<Project>('/projects/', payload)
        setProjects([response.data, ...projects])
      }
      setIsDrawerOpen(false)
    } catch (err) {
      console.error(err)
      alert('Error saving project.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    try {
      await apiClient.delete(`/projects/${id}`)
      setProjects(projects.filter(p => p.id !== id))
      if (selectedProject?.id === id) setSelectedProject(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddAttachment = async () => {
    if (!selectedProject || !formData.newAttachment) return
    const updatedAttachments = [...(selectedProject.attachments || []), formData.newAttachment]
    try {
      const response = await apiClient.put<Project>(`/projects/${selectedProject.id}`, {
        name: selectedProject.name,
        description: selectedProject.description,
        status: selectedProject.status,
        progress: selectedProject.progress,
        attachments: updatedAttachments,
        start_date: selectedProject.start_date,
        end_date: selectedProject.end_date,
        manager_id: selectedProject.manager?.id,
        deal_id: selectedProject.deal?.id
      })
      setSelectedProject(response.data)
      setProjects(projects.map(p => p.id === selectedProject.id ? response.data : p))
      setFormData(prev => ({ ...prev, newAttachment: '' }))
    } catch (err) {
      console.error(err)
    }
  }

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'PLANNING':
        return <Clock className="h-4.5 w-4.5 text-blue-400" />
      case 'IN_PROGRESS':
        return <TrendingUp className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
      case 'READY':
        return <AlertCircle className="h-4.5 w-4.5 text-purple-400" />
      case 'DELIVERED':
        return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <FolderKanban className="h-10 w-10 text-indigo-500 animate-bounce" />
        <span className="ml-3 text-zinc-400 text-sm">Processing Projects Workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative min-h-full">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-zinc-150">
            <FolderKanban className="text-indigo-400 h-5.5 w-5.5" />
            Projects Workspace
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Accelerate your client onboarding, tracking milestone progress, and coordinate deliverable attachments.
          </p>
        </div>
        <button
          onClick={handleOpenCreatePopup}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer transform hover:scale-[1.02] transition-all"
        >
          <Plus className="h-4 w-4" />
          Create New Project
        </button>
      </div>

      {/* Main Grid splitting display & project details drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(proj => (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`bg-zinc-900/60 p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-48 hover:border-indigo-650/40 hover:bg-zinc-900/95 ${
                  selectedProject?.id === proj.id ? 'border-indigo-600 ring-1 ring-indigo-600/20' : 'border-zinc-800/70'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 flex items-center gap-1.5 capitalize">
                      {getStatusIcon(proj.status)}
                      {proj.status.replace('_', ' ').toLowerCase()}
                    </span>
                    <span className="text-xs font-bold text-indigo-400">{proj.progress}%</span>
                  </div>
                  <h3 className="font-bold text-zinc-100 text-sm mt-3.5 line-clamp-1">{proj.name}</h3>
                  <p className="text-xs text-zinc-450 mt-1.5 line-clamp-2 h-8">{proj.description || 'No description provided.'}</p>
                </div>

                <div className="border-t border-zinc-850 pt-3 flex justify-between items-center mt-3">
                  <div className="flex items-center gap-1.5 text-zinc-450 text-[11px]">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[100px]">
                      {proj.manager ? `${proj.manager.first_name} ${proj.manager.last_name[0]}.` : 'No manager'}
                    </span>
                  </div>

                  {proj.members && proj.members.length > 0 && (
                    <div className="flex -space-x-2.5 overflow-hidden">
                      {proj.members.slice(0, 3).map((m, idx) => (
                        <div
                          key={idx}
                          className="h-5.5 w-5.5 rounded-full bg-indigo-750 border border-zinc-900 flex items-center justify-center text-[10px] font-bold text-indigo-250 uppercase"
                          title={`${m.first_name} ${m.last_name}`}
                        >
                          {m.first_name[0]}{m.last_name[0]}
                        </div>
                      ))}
                      {proj.members.length > 3 && (
                        <div className="h-5.5 w-5.5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                          +{proj.members.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="col-span-2 bg-zinc-900/20 border border-zinc-850 rounded-2xl p-12 text-center text-zinc-500 text-xs">
                No active projects found. Create a project to start planning.
              </div>
            )}
          </div>
        </div>

        {/* Selected Project Detailed Glass Panel */}
        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-850 h-fit space-y-5 block backdrop-blur-md">
          {selectedProject ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Project Details</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditPopup(selectedProject)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedProject.id)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <h2 className="text-md font-bold text-zinc-200 mt-2">{selectedProject.name}</h2>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                  {selectedProject.description || 'No detailed description.'}
                </p>
              </div>

              {/* Progress Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-450 font-medium">Deliverable Progress</span>
                  <span className="font-bold text-zinc-350">{selectedProject.progress}%</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-900">
                  <div className="bg-indigo-650 h-full transition-all duration-500" style={{ width: `${selectedProject.progress}%` }}></div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-950/20 p-3.5 rounded-xl border border-zinc-900/60">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Start Date</span>
                  <span className="text-zinc-300 flex items-center gap-1.5 mt-1 font-semibold">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    {selectedProject.start_date || 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Deadline Date</span>
                  <span className="text-zinc-300 flex items-center gap-1.5 mt-1 font-semibold">
                    <Calendar className="h-3.5 w-3.5 text-zinc-550" />
                    {selectedProject.end_date || 'TBD'}
                  </span>
                </div>
              </div>

              {/* Team Members List */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Assigned Workgroup</span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 bg-zinc-950/30 rounded-xl border border-zinc-900/50">
                    <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                      {selectedProject.manager ? selectedProject.manager.first_name[0] : 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-300 block">
                        {selectedProject.manager ? `${selectedProject.manager.first_name} ${selectedProject.manager.last_name}` : 'Unassigned'}
                      </span>
                      <span className="text-[9px] text-zinc-550 block font-bold uppercase">Project Manager</span>
                    </div>
                  </div>

                  {selectedProject.members?.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-950/10 rounded-xl border border-zinc-900/20">
                      <div className="h-6 w-6 rounded-full bg-zinc-805 flex items-center justify-center text-xs font-semibold text-zinc-400 uppercase border border-zinc-800">
                        {m.first_name[0]}
                      </div>
                      <div>
                        <span className="text-xs font-medium text-zinc-400 block">{m.first_name} {m.last_name}</span>
                        <span className="text-[9px] text-zinc-550 block font-bold uppercase">{m.role}</span>
                      </div>
                    </div>
                  ))}
                  {(!selectedProject.members || selectedProject.members.length === 0) && (
                    <span className="text-[11px] text-zinc-600 block pl-1">No additional shared members.</span>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Deliverable Documents</span>
                <div className="space-y-1.5">
                  {selectedProject.attachments?.map((at, idx) => (
                    <a
                      key={idx}
                      href={at}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded bg-zinc-950/40 border border-zinc-900 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900/80 transition-all font-medium"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                        {at}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                  {(!selectedProject.attachments || selectedProject.attachments.length === 0) && (
                    <span className="text-[11px] text-zinc-600 block pl-1">No attachment links provided.</span>
                  )}

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Add Document Link (HTTP/HTTPS)..."
                      value={formData.newAttachment}
                      onChange={e => setFormData({ ...formData, newAttachment: e.target.value })}
                      className="bg-zinc-950/70 border border-zinc-900/90 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-650 flex-1 text-zinc-305 placeholder-zinc-700"
                    />
                    <button
                      onClick={handleAddAttachment}
                      className="px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-xs font-semibold text-zinc-200 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-550 border border-dashed border-zinc-850 rounded-xl h-64 bg-zinc-950/10">
              <FolderKanban className="h-8 w-8 text-zinc-650 mb-3" />
              <span className="text-xs font-medium">Select a project in the active roster to view document tracking, milestones, and details.</span>
            </div>
          )}
        </div>
      </div>

      {/* Slider-based Editing & Create Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border-l border-zinc-900 h-full p-8 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h2 className="text-md font-bold text-zinc-200">
                  {editingProject ? `Update Project: ${editingProject.name}` : 'Instantiate New Project'}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Configure project metadata parameters and assign workspace members.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-zinc-400">Project Reference Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-250 focus:outline-none focus:border-indigo-650"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-400">Brief Overview Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-250 focus:outline-none focus:border-indigo-650 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-400">Project Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-205 focus:outline-none focus:border-indigo-650"
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="READY">Ready</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-400">Progress Tracker ({formData.progress}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={e => setFormData({ ...formData, progress: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-850 h-2 accent-indigo-600 rounded-lg cursor-pointer mt-3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-400">Kickoff Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-400">Target Deadline</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-400">Project Lead (PM)</label>
                    <select
                      value={formData.manager_id}
                      onChange={e => setFormData({ ...formData, manager_id: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">Choose Project Manager</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-400">Linked Deal Conversion</label>
                    <select
                      value={formData.deal_id}
                      onChange={e => setFormData({ ...formData, deal_id: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">Unlinked / Independent</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.title} (${d.value})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multiselect workspace members list view */}
                <div className="space-y-1.5">
                  <label className="text-zinc-400 flex items-center gap-1.5">
                    <Users2 className="h-3.5 w-3.5 text-zinc-550" />
                    Access-Granted Operational Group Members
                  </label>
                  <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-lg max-h-36 overflow-y-auto space-y-1.5">
                    {users.map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.members_ids.includes(u.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData({ ...formData, members_ids: [...formData.members_ids, u.id] })
                            } else {
                              setFormData({ ...formData, members_ids: formData.members_ids.filter(id => id !== u.id) })
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-650"
                        />
                        <span>{u.first_name} {u.last_name} ({u.role.toLowerCase()})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold cursor-pointer text-center text-xs"
                  >
                    {editingProject ? 'Apply Changes' : 'Initialize Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-905 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg font-medium cursor-pointer text-center text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
