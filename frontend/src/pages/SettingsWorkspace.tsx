import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { 
  User, Organization, Department, Team, CustomRole, Stage,
  OrganizationLifecycleSettings, LeadLifecycleRule, CustomModule
} from '@/types/crm'
import {
  Building,
  UserCheck,
  ShieldAlert,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit2,
  X,
  Shield,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Save,
  Grid,
  Clock,
  AlertTriangle
} from 'lucide-react'

export default function SettingsWorkspace() {
  const queryClient = useQueryClient()
  
  // Settings Tab Selector: 'general' | 'hierarchy' | 'roles' | 'members' | 'lifecycle' | 'modules'
  const [activeTab, setActiveTab] = useState<'general' | 'hierarchy' | 'roles' | 'members' | 'lifecycle' | 'modules'>('general')

  // Lifecycle settings query and mutations
  const { data: lifecycleSettings, refetch: refetchLifecycleSettings } = useQuery<OrganizationLifecycleSettings>({
    queryKey: ['settings-lifecycle-settings'],
    queryFn: async () => {
      const response = await apiClient.get<OrganizationLifecycleSettings>('/crm-settings/lifecycle')
      return response.data
    }
  })

  const [lifecycleSettingsForm, setLifecycleSettingsForm] = useState<OrganizationLifecycleSettings>({
    lead_lifecycle_timer_enabled: false,
    default_lead_lifecycle_days: 30
  })

  // Sync lifecycle settings form
  useEffect(() => {
    if (lifecycleSettings) {
      setLifecycleSettingsForm(lifecycleSettings)
    }
  }, [lifecycleSettings])

  const updateLifecycleSettingsMutation = useMutation({
    mutationFn: async (body: OrganizationLifecycleSettings) => {
      return apiClient.put('/crm-settings/lifecycle', body)
    },
    onSuccess: () => {
      refetchLifecycleSettings()
      alert("Settings saved.")
    }
  })

  // Rules query and mutations
  const { data: lifecycleRules = [], refetch: refetchRulesList } = useQuery<LeadLifecycleRule[]>({
    queryKey: ['settings-lifecycle-rules'],
    queryFn: async () => {
      const response = await apiClient.get<LeadLifecycleRule[]>('/crm-settings/lifecycle-rules')
      return response.data
    }
  })

  const createRuleMutation = useMutation({
    mutationFn: async (body: any) => {
      return apiClient.post('/crm-settings/lifecycle-rules', body)
    },
    onSuccess: () => {
      refetchRulesList()
      alert("Lifecycle rule created.")
    }
  })

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/crm-settings/lifecycle-rules/${id}`)
    },
    onSuccess: () => {
      refetchRulesList()
    }
  })

  // Custom stage query for Change Stage action dropdown
  const { data: stagesSelect = [] } = useQuery<Stage[]>({
    queryKey: ['settings-stages-select'],
    queryFn: async () => {
      const response = await apiClient.get<Stage[]>('/stages/')
      return response.data
    }
  })

  // Custom list of modules
  const { data: customModulesList = [], refetch: refetchModules } = useQuery<CustomModule[]>({
    queryKey: ['settings-custom-modules'],
    queryFn: async () => {
      const response = await apiClient.get<CustomModule[]>('/custom-modules/')
      return response.data
    }
  })

  const createModuleMutation = useMutation({
    mutationFn: async (body: any) => {
      return apiClient.post('/custom-modules/', body)
    },
    onSuccess: () => {
      refetchModules()
      setNewModuleForm({ name: '', singular_name: '', icon: 'Grid', fields: [] })
      alert("Custom module created successfully!")
    },
    onError: (err: any) => {
      alert(`Error: ${err?.response?.data?.detail || err.message}`)
    }
  })

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/custom-modules/${id}`)
    },
    onSuccess: () => {
      refetchModules()
    }
  })

  // State builder for Custom Modules schema
  const [newModuleForm, setNewModuleForm] = useState({
    name: '',
    singular_name: '',
    icon: 'Grid',
    fields: [] as any[]
  })
  const [fieldDraft, setFieldDraft] = useState({
    name: '',
    type: 'TEXT' as 'TEXT' | 'NUMBER' | 'DATE' | 'CHECKBOX',
    required: false
  })

  // Lifecycle rule form
  const [newRuleFormState, setNewRuleFormState] = useState({
    day: 1,
    action_type: 'CREATE_TASK' as any,
    config: {} as Record<string, any>
  })

  // Selected User for configuration
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'SALES_REP' as 'ADMIN' | 'MANAGER' | 'SALES_REP'
  })
  
  // Organization Editing Form State loaded from request.user
  const { data: me, refetch: refetchMe } = useQuery<User>({
    queryKey: ['settings-me'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/accounts/me')
      return response.data
    }
  })

  // States for general org edits
  const [orgForm, setOrgForm] = useState({
    name: '',
    logo: '',
    industry: '',
    currency: 'USD',
    primary_color: '#4f46e5',
    timezone: 'UTC',
    address: '',
    billing_emails: ''
  })

  // Populate Org form when me is loaded
  const populateOrg = () => {
    if (me?.organization) {
      const org = me.organization
      setOrgForm({
        name: org.name || '',
        logo: org.logo || '',
        industry: org.industry || '',
        currency: org.currency || 'USD',
        primary_color: org.primary_color || '#4f46e5',
        timezone: org.timezone || 'UTC',
        address: org.address || '',
        billing_emails: org.billing_emails || ''
      })
    }
  }

  // Load lists
  const { data: users = [], refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['settings-users'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/accounts/')
      return response.data
    }
  })

  const { data: departments = [], refetch: refetchDepts } = useQuery<Department[]>({
    queryKey: ['settings-depts'],
    queryFn: async () => {
      const response = await apiClient.get<Department[]>('/accounts/departments')
      return response.data
    }
  })

  const { data: teams = [], refetch: refetchTeams } = useQuery<Team[]>({
    queryKey: ['settings-teams'],
    queryFn: async () => {
      const response = await apiClient.get<Team[]>('/accounts/teams')
      return response.data
    }
  })

  const { data: roles = [], refetch: refetchRoles } = useQuery<CustomRole[]>({
    queryKey: ['settings-roles'],
    queryFn: async () => {
      const response = await apiClient.get<CustomRole[]>('/accounts/roles')
      return response.data
    }
  })

  // Mutations
  const updateOrgMutation = useMutation({
    mutationFn: async (body: typeof orgForm) => {
      return apiClient.put('/accounts/organization', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-me'] })
      alert("Organization parameters updated successfully.")
    }
  })

  const inviteUserMutation = useMutation({
    mutationFn: async (body: typeof inviteForm) => {
      return apiClient.post('/accounts/users', null, {
        params: body
      })
    },
    onSuccess: () => {
      refetchUsers()
      setInviteForm({ email: '', first_name: '', last_name: '', role: 'SALES_REP' })
      alert("Employee added successfully.")
    },
    onError: (err: any) => {
      alert(`Conflict: ${err?.response?.data?.detail || err.message}`)
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      return apiClient.put(`/accounts/users/${id}`, body)
    },
    onSuccess: () => {
      refetchUsers()
      setEditingUser(null)
    }
  })

  // Add Hierarchy items states
  const [newDeptForm, setNewDeptForm] = useState({ name: '', manager_id: '' })
  const [newTeamForm, setNewTeamForm] = useState({ name: '', department_id: '', manager_id: '' })
  const [newRoleForm, setNewRoleForm] = useState({ name: '', permissions: {} })

  const createDeptMutation = useMutation({
    mutationFn: async (body: typeof newDeptForm) => {
      return apiClient.post('/accounts/departments', {
        name: body.name,
        manager_id: body.manager_id || null
      })
    },
    onSuccess: () => {
      refetchDepts()
      setNewDeptForm({ name: '', manager_id: '' })
    }
  })

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/accounts/departments/${id}`)
    },
    onSuccess: () => refetchDepts()
  })

  const createTeamMutation = useMutation({
    mutationFn: async (body: typeof newTeamForm) => {
      return apiClient.post('/accounts/teams', {
        name: body.name,
        department_id: body.department_id,
        manager_id: body.manager_id || null
      })
    },
    onSuccess: () => {
      refetchTeams()
      setNewTeamForm({ name: '', department_id: '', manager_id: '' })
    }
  })

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/accounts/teams/${id}`)
    },
    onSuccess: () => refetchTeams()
  })

  const createRoleMutation = useMutation({
    mutationFn: async (body: typeof newRoleForm) => {
      return apiClient.post('/accounts/roles', body)
    },
    onSuccess: () => {
      refetchRoles()
      setNewRoleForm({ name: '', permissions: {} })
    }
  })

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/accounts/roles/${id}`)
    },
    onSuccess: () => refetchRoles()
  })

  const handleUpdatePermissionValue = (role: CustomRole, key: string, val: boolean) => {
    const updatedPermissions = { ...role.permissions, [key]: val }
    updateRoleMutation.mutate({
      id: role.id,
      body: { name: role.name, permissions: updatedPermissions }
    })
  }

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      return apiClient.put(`/accounts/roles/${id}`, body)
    },
    onSuccess: () => refetchRoles()
  })

  const isUserAdmin = me?.role === 'ADMIN'

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
      
      {/* Sidebar Settings menu */}
      <aside className="w-full lg:w-60 bg-zinc-950 border border-zinc-900 rounded-xl p-4.5 space-y-1.5 h-max flex-shrink-0">
        <span className="text-[10px] text-zinc-550 font-extrabold uppercase tracking-widest block px-2.5 pb-2">Settings Menu</span>
        
        <button
          onClick={() => { setActiveTab('general'); populateOrg(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
            activeTab === 'general'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>General Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
            activeTab === 'hierarchy'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Departments & Teams</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
            activeTab === 'roles'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Roles & Permissions</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
            activeTab === 'members'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Member Management</span>
        </button>

        <button
          onClick={() => { setActiveTab('lifecycle'); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
            activeTab === 'lifecycle'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Lead Lifecycle Timer</span>
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
            activeTab === 'modules'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Custom Modules Schemas</span>
        </button>
      </aside>

      {/* Main settings panel */}
      <main className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-xl space-y-6 text-xs text-zinc-400">
        
        {/* ================= GENERAL SETTINGS ================= */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-indigo-400" /> Organization Configurations
              </h2>
              <span className="text-[11px] text-zinc-500 italic">Manage company parameters, currency models, and branding values.</span>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); updateOrgMutation.mutate(orgForm); }}
              className="space-y-4 font-semibold"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-550 font-bold uppercase">Organization Name</label>
                  <input
                    type="text"
                    required
                    disabled={!isUserAdmin}
                    value={orgForm.name}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-555 font-bold uppercase">Company Logo Link</label>
                  <input
                    type="text"
                    disabled={!isUserAdmin}
                    value={orgForm.logo}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, logo: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-555 font-bold uppercase">Vertical / Industry</label>
                  <input
                    type="text"
                    disabled={!isUserAdmin}
                    value={orgForm.industry}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-555 font-bold uppercase">Default Currency</label>
                  <select
                    disabled={!isUserAdmin}
                    value={orgForm.currency}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-555 font-bold uppercase">Global Timezone</label>
                  <select
                    disabled={!isUserAdmin}
                    value={orgForm.timezone}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                  >
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="EST">EST (GMT-5)</option>
                    <option value="PST">PST (GMT-8)</option>
                    <option value="IST">IST (GMT+5:30)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-555 font-bold uppercase">Billing emails (comma-separated)</label>
                <input
                  type="text"
                  disabled={!isUserAdmin}
                  value={orgForm.billing_emails}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, billing_emails: e.target.value }))}
                  placeholder="billing@company.com, admin@company.com"
                  className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-555 font-bold uppercase">Address Settings</label>
                <textarea
                  disabled={!isUserAdmin}
                  value={orgForm.address}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 h-16 resize-none"
                />
              </div>

              {isUserAdmin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updateOrgMutation.isPending}
                    className="bg-indigo-600 hover:bg-slate-650 text-white font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Org Config</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ================= DEPARTMENTS & TEAMS ================= */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-8">
            {/* Departments list creation */}
            <div className="space-y-4">
              <div className="border-b border-zinc-900 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Departments List</h2>
                <span className="text-[11px] text-zinc-500 italic text-[10px]">Define main company functional areas and their managers.</span>
              </div>

              {isUserAdmin && (
                <form
                  onSubmit={(e) => { e.preventDefault(); createDeptMutation.mutate(newDeptForm); }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-zinc-900/20 p-4 border border-zinc-890 rounded-xl"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Dept Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sales Department"
                      value={newDeptForm.name}
                      onChange={(e) => setNewDeptForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Dept Manager</label>
                    <select
                      value={newDeptForm.manager_id}
                      onChange={(e) => setNewDeptForm(prev => ({ ...prev, manager_id: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded transition-all cursor-pointer text-center text-xs">
                    Create Department
                  </button>
                </form>
              )}

              <div className="bg-zinc-900/35 border border-zinc-900 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Department Unit</th>
                      <th className="py-2.5 px-4 w-48">Manager Assigned</th>
                      <th className="py-2.5 px-4 w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-zinc-650 italic">No departments configured yet.</td>
                      </tr>
                    ) : (
                      departments.map(d => (
                        <tr key={d.id} className="hover:bg-zinc-900/10">
                          <td className="py-2.5 px-4 font-bold text-zinc-250">{d.name}</td>
                          <td className="py-2.5 px-4 text-zinc-400">
                            {d.manager ? `${d.manager.first_name} ${d.manager.last_name}` : 'Unassigned'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              disabled={!isUserAdmin}
                              onClick={() => deleteDeptMutation.mutate(d.id)}
                              className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-20"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teams list creation mapping */}
            <div className="space-y-4">
              <div className="border-b border-zinc-900 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sub-Teams Divisions</h2>
                <span className="text-[11px] text-zinc-500 italic text-[10px]">Define structural sub-teams nested under Department parent units.</span>
              </div>

              {isUserAdmin && (
                <form
                  onSubmit={(e) => { e.preventDefault(); createTeamMutation.mutate(newTeamForm); }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-zinc-900/20 p-4 border border-zinc-800 rounded-xl animate-fade-in"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Team Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Inbound Sales"
                      value={newTeamForm.name}
                      onChange={(e) => setNewTeamForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Department Parent</label>
                    <select
                      required
                      value={newTeamForm.department_id}
                      onChange={(e) => setNewTeamForm(prev => ({ ...prev, department_id: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                    >
                      <option value="">Select Dept</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Team Lead/Manager</label>
                    <select
                      value={newTeamForm.manager_id}
                      onChange={(e) => setNewTeamForm(prev => ({ ...prev, manager_id: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded transition-all cursor-pointer text-center text-xs">
                    Create Team
                  </button>
                </form>
              )}

              <div className="bg-zinc-900/35 border border-zinc-900 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Team Unit</th>
                      <th className="py-2.5 px-4 w-48">Department Parent</th>
                      <th className="py-2.5 px-4 w-48">Team Lead</th>
                      <th className="py-2.5 px-4 w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {teams.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-655 italic animate-pulse">No teams configured yet.</td>
                      </tr>
                    ) : (
                      teams.map(t => (
                        <tr key={t.id} className="hover:bg-zinc-900/10">
                          <td className="py-2.5 px-4 font-bold text-zinc-250">{t.name}</td>
                          <td className="py-2.5 px-4 text-zinc-400">{t.department?.name || 'Department Missing'}</td>
                          <td className="py-2.5 px-4 text-zinc-400">
                            {t.manager ? `${t.manager.first_name} ${t.manager.last_name}` : 'Unassigned'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              disabled={!isUserAdmin}
                              onClick={() => deleteTeamMutation.mutate(t.id)}
                              className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-20"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ================= CUSTOM ROLES & ACCESS CONTROL MATRIX ================= */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-indigo-400" /> Custom Roles & Access Matrix
              </h2>
              <span className="text-[11px] text-zinc-500 italic">Fine-tune fine-grained action permissions for different organization functions.</span>
            </div>

            {isUserAdmin && (
              <form
                onSubmit={(e) => { e.preventDefault(); createRoleMutation.mutate(newRoleForm); }}
                className="flex items-end gap-3 bg-zinc-900/20 p-4 border border-zinc-800 rounded-xl"
              >
                <div className="space-y-1 flex-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Role Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Superuser"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                  />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded transition-all cursor-pointer text-xs">
                  Create Role
                </button>
              </form>
            )}

            <div className="space-y-4">
              {roles.length === 0 ? (
                <div className="py-8 border border-zinc-900 rounded-xl text-center text-zinc-650 italic">No custom roles mapped. Standard Django-role levels apply.</div>
              ) : (
                roles.map((typeRole) => {
                  const checkPerm = (key: string) => !!typeRole.permissions[key]
                  return (
                    <div key={typeRole.id} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-4.5 space-y-4">
                      
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-900/70">
                        <span className="text-sm font-bold text-zinc-200">{typeRole.name}</span>
                        <button
                          disabled={!isUserAdmin}
                          onClick={() => deleteRoleMutation.mutate(typeRole.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-20"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      {/* Check toggles matrix mapping */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5">
                        {[
                          { key: 'can_create_leads', label: 'Create Leads & Contacts' },
                          { key: 'can_assign_leads', label: 'Re-assign Leads Owners' },
                          { key: 'can_delete_deals', label: 'Delete Deal Opportunity' },
                          { key: 'can_edit_pipelines', label: 'Edit Stages Pipelines' },
                          { key: 'can_export_reports', label: 'Export Analytics Reports' },
                        ].map((permission) => {
                          const isTrue = checkPerm(permission.key)
                          return (
                            <div key={permission.key} className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-950/70">
                              <span className="text-[11px] font-semibold text-zinc-350">{permission.label}</span>
                              <button
                                type="button"
                                disabled={!isUserAdmin}
                                onClick={() => handleUpdatePermissionValue(typeRole, permission.key, !isTrue)}
                                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-30 cursor-pointer"
                              >
                                {isTrue ? (
                                  <ToggleRight className="h-6 w-6 text-indigo-500" />
                                ) : (
                                  <ToggleLeft className="h-6 w-6 text-zinc-550" />
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>

                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

        {/* ================= MEMBER MANAGEMENT ================= */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-indigo-400" /> Member Directory
              </h2>
              <span className="text-[11px] text-zinc-500 italic">Invite and assign roles, managers, departments, and teams.</span>
            </div>

            {isUserAdmin && (
              <div className="bg-zinc-900/20 p-4 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Add New Team Employee</span>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    inviteUserMutation.mutate(inviteForm)
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-555 font-bold uppercase">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John"
                      value={inviteForm.first_name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-555 font-bold uppercase">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={inviteForm.last_name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-555 font-bold uppercase">Email Account</label>
                    <input
                      type="email"
                      required
                      placeholder="john.doe@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-505 text-white font-bold p-2.5 rounded transition-all cursor-pointer text-xs">
                    Invite Member
                  </button>
                </form>
              </div>
            )}

            <div className="bg-zinc-900/35 border border-zinc-900 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-4">Employee Full Name</th>
                    <th className="py-3 px-4">Email Account</th>
                    <th className="py-3 px-4 w-28">Standard Role</th>
                    <th className="py-3 px-4 w-28">Custom Role</th>
                    <th className="py-3 px-4 w-32">Department</th>
                    <th className="py-3 px-4 w-16 text-center">Status</th>
                    <th className="py-3 px-4 w-16 text-center">Configure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-900/10">
                      <td className="py-3 px-4 font-bold text-zinc-250">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[8px] bg-zinc-900 border border-zinc-800 ${
                          u.role === 'ADMIN' ? 'text-indigo-400 border-indigo-500/20' : u.role === 'MANAGER' ? 'text-blue-400 border-blue-500/20' : 'text-zinc-500 border-transparent'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 font-medium">
                        {u.custom_role?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 font-medium">
                        {u.department?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-extrabold text-[9px] px-1.5 rouded uppercase ${u.is_active ? 'text-emerald-450' : 'text-zinc-650'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={!isUserAdmin}
                          onClick={() => setEditingUser(u)}
                          className="text-indigo-400 hover:text-indigo-350 cursor-pointer disabled:opacity-20 font-bold"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ================= LEAD LIFECYCLE SETTINGS ================= */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-indigo-400" /> Lead Lifecycle Alarm & Rules Scheduler
              </h2>
              <span className="text-[11px] text-zinc-500 italic">Configure duration monitors and automated rules for processing aging leads.</span>
            </div>

            <div className="bg-zinc-905 border border-zinc-900 rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase">Timer Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between border border-zinc-900/50 bg-zinc-950 p-3 rounded-lg">
                  <span className="font-bold">Toggle Timer Monitoring</span>
                  <button
                    type="button"
                    onClick={() => setLifecycleSettingsForm(prev => ({
                      ...prev,
                      lead_lifecycle_timer_enabled: !prev.lead_lifecycle_timer_enabled
                    }))}
                    className="indigo-400 hover:text-indigo-350 cursor-pointer"
                  >
                    {lifecycleSettingsForm.lead_lifecycle_timer_enabled ? (
                      <ToggleRight className="h-7 w-7 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-zinc-600" />
                    )}
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Standard SLA Alert Line (Days)</label>
                  <input
                    type="number"
                    value={lifecycleSettingsForm.default_lead_lifecycle_days}
                    onChange={(e) => setLifecycleSettingsForm(prev => ({
                      ...prev,
                      default_lead_lifecycle_days: parseInt(e.target.value) || 0
                    }))}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded p-2 text-xs text-zinc-250 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => updateLifecycleSettingsMutation.mutate(lifecycleSettingsForm)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold cursor-pointer transition-all"
              >
                Save Timeline SLA Config
              </button>
            </div>

            {/* Rules Section */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <h3 className="text-xs font-bold text-white uppercase">Automated Lifecycle Rules</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Rules List */}
                <div className="lg:col-span-2 space-y-2">
                  {lifecycleRules.length === 0 ? (
                    <div className="p-4 border border-dashed border-zinc-850 text-center text-zinc-550 rounded-lg">
                      No automated rules. Define one on the right to start executing.
                    </div>
                  ) : (
                    lifecycleRules.map(rule => (
                      <div key={rule.id} className="flex justify-between items-center p-3 bg-zinc-900/30 border border-zinc-900 rounded-lg">
                        <div>
                          <div className="font-bold text-zinc-200">
                            Day {rule.day}: <span className="text-indigo-400">{rule.action_type}</span>
                          </div>
                          <div className="text-[10px] text-zinc-550">
                            {JSON.stringify(rule.config)}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Create Rule Form */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 space-y-3">
                  <h4 className="text-[10px] uppercase font-bold text-white tracking-wider">Create Rule Trigger</h4>
                  <div>
                    <label className="text-[10px] text-zinc-550 block mb-0.5">Execution Day</label>
                    <input
                      type="number"
                      value={newRuleFormState.day}
                      onChange={(e) => setNewRuleFormState(prev => ({ ...prev, day: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded p-1.5 text-zinc-250 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-550 block mb-0.5">Action Trigger</label>
                    <select
                      value={newRuleFormState.action_type}
                      onChange={(e) => setNewRuleFormState(prev => ({ ...prev, action_type: e.target.value as any, config: {} }))}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded p-1.5 text-zinc-250 focus:outline-none cursor-pointer"
                    >
                      <option value="CREATE_TASK">CREATE_TASK</option>
                      <option value="NOTIFY_EMPLOYEE">NOTIFY_EMPLOYEE</option>
                      <option value="NOTIFY_MANAGER">NOTIFY_MANAGER</option>
                      <option value="CHANGE_STAGE">CHANGE_STAGE</option>
                      <option value="MARK_INACTIVE">MARK_INACTIVE</option>
                    </select>
                  </div>

                  {newRuleFormState.action_type === 'CREATE_TASK' && (
                    <div className="space-y-2 border-t border-zinc-900 pt-2">
                      <input
                        type="text"
                        placeholder="Task Title"
                        value={newRuleFormState.config.task_title || ''}
                        onChange={(e) => setNewRuleFormState(prev => ({
                          ...prev,
                          config: { ...prev.config, task_title: e.target.value }
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded p-1 text-xs text-zinc-255"
                      />
                      <textarea
                        placeholder="Task Description"
                        value={newRuleFormState.config.task_description || ''}
                        onChange={(e) => setNewRuleFormState(prev => ({
                          ...prev,
                          config: { ...prev.config, task_description: e.target.value }
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded p-1 text-xs text-zinc-255 h-12"
                      />
                    </div>
                  )}

                  {(newRuleFormState.action_type === 'NOTIFY_EMPLOYEE' || newRuleFormState.action_type === 'NOTIFY_MANAGER') && (
                    <div className="space-y-2 border-t border-zinc-900 pt-2">
                      <input
                        type="text"
                        placeholder="Subject Line"
                        value={newRuleFormState.config.subject || ''}
                        onChange={(e) => setNewRuleFormState(prev => ({
                          ...prev,
                          config: { ...prev.config, subject: e.target.value }
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded p-1 text-xs text-zinc-255"
                      />
                      <textarea
                        placeholder="Reminder Body Template"
                        value={newRuleFormState.config.body || ''}
                        onChange={(e) => setNewRuleFormState(prev => ({
                          ...prev,
                          config: { ...prev.config, body: e.target.value }
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded p-1 text-xs text-zinc-255 h-12"
                      />
                    </div>
                  )}

                  {newRuleFormState.action_type === 'CHANGE_STAGE' && (
                    <div className="space-y-2 border-t border-zinc-900 pt-2">
                      <select
                        value={newRuleFormState.config.stage_id || ''}
                        onChange={(e) => setNewRuleFormState(prev => ({
                          ...prev,
                          config: { ...prev.config, stage_id: e.target.value }
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded p-1 text-xs text-zinc-255 focus:outline-none cursor-pointer"
                      >
                        <option value="">Select Destination Stage</option>
                        {stagesSelect.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.win_probability}%)</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!newRuleFormState.day || newRuleFormState.day < 0) {
                        alert("Please select a day parameter.")
                        return 
                      }
                      createRuleMutation.mutate(newRuleFormState)
                    }}
                    className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded font-bold cursor-pointer text-center text-xs"
                  >
                    Add Trigger Rule
                  </button>

                </div>

              </div>
            </div>

          </div>
        )}

        {/* ================= CUSTOM MODULES BUILDER ================= */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Grid className="h-4.5 w-4.5 text-indigo-400" /> Custom Database Modules Schemas
              </h2>
              <span className="text-[11px] text-zinc-500 italic">Provision new database objects and fields to adapt the workspace in real-time.</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Modules list */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase">Active Custom Modules</h3>
                {customModulesList.length === 0 ? (
                  <div className="p-4 border border-dashed border-zinc-850 text-center text-zinc-550 rounded-lg">
                    No custom schemas deployed yet. Define one using the schema designer panel on the right.
                  </div>
                ) : (
                  customModulesList.map(mod => (
                    <div key={mod.id} className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white text-sm tracking-wide">{mod.name} (singular: {mod.singular_name})</span>
                        <button
                          onClick={() => deleteModuleMutation.mutate(mod.id)}
                          className="px-2 py-1 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded border border-red-950 font-bold transition-all cursor-pointer text-[10px] uppercase"
                        >
                          Tear Down Schema
                        </button>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-bold">Fields:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.fields.map((f: any, idx: number) => (
                          <span key={idx} className="bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded text-[10px] text-zinc-400">
                            {f.name} ({f.type}) {f.required && <span className="text-red-500 font-bold">*</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Module Form Builder */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Custom Schema Designer</h3>
                <div className="space-y-3 font-semibold text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Plural Folder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Properties"
                      value={newModuleForm.name}
                      onChange={(e) => setNewModuleForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded p-1.5 text-zinc-250 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Singular Entity Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Property"
                      value={newModuleForm.singular_name}
                      onChange={(e) => setNewModuleForm(prev => ({ ...prev, singular_name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded p-1.5 text-zinc-250 focus:outline-none"
                    />
                  </div>

                  {/* Fields lists under assembly */}
                  <div className="pt-2 border-t border-zinc-900 space-y-2">
                    <label className="text-[10px] text-zinc-450 uppercase font-black tracking-wide block">Assemble Schema Fields</label>
                    <div className="space-y-1 max-h-24 overflow-y-auto mb-2 pr-1">
                      {newModuleForm.fields.length === 0 ? (
                        <div className="text-[10px] text-zinc-650 italic">No fields configured. Draft a field below to start.</div>
                      ) : (
                        newModuleForm.fields.map((f, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] bg-zinc-900 p-1.5 rounded">
                            <span>{f.name} ({f.type}) {f.required && ' *Required'}</span>
                            <button
                              type="button"
                              onClick={() => setNewModuleForm(prev => ({
                                ...prev,
                                fields: prev.fields.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-450 hover:text-red-300 font-bold"
                            >
                              remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-900 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Field name"
                          value={fieldDraft.name}
                          onChange={(e) => setFieldDraft(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-800 rounded p-1 text-[10px] text-zinc-250 focus:outline-none placeholder:text-zinc-655"
                        />
                        <select
                          value={fieldDraft.type}
                          onChange={(e) => setFieldDraft(prev => ({ ...prev, type: e.target.value as any }))}
                          className="bg-zinc-950 border border-zinc-800 rounded p-1 text-[10px] text-zinc-250 focus:outline-none cursor-pointer"
                        >
                          <option value="TEXT">TEXT</option>
                          <option value="NUMBER">NUMBER</option>
                          <option value="DATE">DATE</option>
                          <option value="CHECKBOX">CHECKBOX</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldDraft.required}
                            onChange={(e) => setFieldDraft(prev => ({ ...prev, required: e.target.checked }))}
                            className="bg-zinc-950 border-zinc-800 rounded focus:ring-0 text-indigo-650"
                          />
                          <span>Required validation</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!fieldDraft.name.trim()) return
                            setNewModuleForm(prev => ({
                              ...prev,
                              fields: [...prev.fields, { ...fieldDraft, name: fieldDraft.name.trim() }]
                            }))
                            setFieldDraft({ name: '', type: 'TEXT', required: false })
                          }}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded text-[10px] text-zinc-300 font-bold"
                        >
                          Push Field
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!newModuleForm.name.trim() || !newModuleForm.singular_name.trim()) {
                        alert("Plural folder name and Singular entity name are required parameters.")
                        return 
                      }
                      if (newModuleForm.fields.length === 0) {
                        alert("Please define at least one field validation rule.")
                        return 
                      }
                      createModuleMutation.mutate(newModuleForm)
                    }}
                    className="w-full py-2 bg-indigo-655 hover:bg-indigo-600 text-white rounded font-bold transition-all text-center cursor-pointer block border-none shadow-md mt-4 text-xs"
                  >
                    Deploy Custom Schema
                  </button>

                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ================= EDIT USER DETAILS DIALOG ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-zinc-950 border border-zinc-900 rounded-xl w-full max-w-md overflow-hidden shadow-2xl z-10 animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center text-sm">
              <h3 className="font-bold text-white text-md">Configure Employee Assignment</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-zinc-450 hover:text-white rounded hover:bg-zinc-900 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-zinc-405">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Configure details for:</span>
                <div className="text-zinc-200 text-sm font-bold">{editingUser.first_name} {editingUser.last_name}</div>
              </div>

              {/* Standard Role Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Standard system level role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const nextVal = e.target.value as any
                    setEditingUser(prev => prev ? { ...prev, role: nextVal } : null)
                  }}
                  className="w-full bg-zinc-900 border border-zinc-805 rounded p-2 text-xs text-zinc-250 focus:outline-none focus:border-indigo-650 cursor-pointer"
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SALES_REP">Sales Representative</option>
                </select>
              </div>

              {/* Custom Permissions Role (MAPPED FROM DB) */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Custom Role Mapping</label>
                <select
                  value={editingUser.custom_role?.id || ''}
                  onChange={(e) => {
                    const nextVal = e.target.value
                    const matchedRole = roles.find(r => r.id === nextVal) || undefined
                    setEditingUser(prev => prev ? { ...prev, custom_role: matchedRole } : null)
                  }}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded p-2 text-xs text-zinc-250 focus:outline-none"
                >
                  <option value="">None</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Parent Department */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-505 font-bold uppercase">Assign Department</label>
                <select
                  value={editingUser.department?.id || ''}
                  onChange={(e) => {
                    const nextVal = e.target.value
                    const matched = departments.find(d => d.id === nextVal) || undefined
                    setEditingUser(prev => prev ? { ...prev, department: matched } : null)
                  }}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded p-2 text-xs text-zinc-250 focus:outline-none"
                >
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Sub Team Parent */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-505 font-bold uppercase">Assign Team Unit</label>
                <select
                  value={editingUser.team?.id || ''}
                  onChange={(e) => {
                    const nextVal = e.target.value
                    const matched = teams.find(t => t.id === nextVal) || undefined
                    setEditingUser(prev => prev ? { ...prev, team: matched } : null)
                  }}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded p-2 text-xs text-zinc-250 focus:outline-none"
                >
                  <option value="">None</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Manager Parent */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-505 font-bold uppercase">Reporting Manager</label>
                <select
                  value={editingUser.manager?.id || ''}
                  onChange={(e) => {
                    const nextVal = e.target.value
                    const matched = users.find(u => u.id === nextVal) || undefined
                    setEditingUser(prev => prev ? { ...prev, manager: matched } : null)
                  }}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded p-2 text-xs text-zinc-250 focus:outline-none"
                >
                  <option value="">None</option>
                  {users.filter(u => u.id !== editingUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Toggle isActive button */}
              <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Employee Active Status</span>
                <button
                  type="button"
                  onClick={() => setEditingUser(prev => prev ? { ...prev, is_active: !prev.is_active } : null)}
                  className="text-indigo-400 hover:text-indigo-350 cursor-pointer"
                >
                  {editingUser.is_active ? (
                    <div className="flex items-center gap-1.5 text-emerald-450 font-bold">
                      <ToggleRight className="h-6 w-6 text-emerald-500" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-zinc-550 font-bold">
                      <ToggleLeft className="h-6 w-6" />
                      <span>Disabled</span>
                    </div>
                  )}
                </button>
              </div>

              <div className="flex gap-2.5 justify-end border-t border-zinc-900 pt-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-zinc-900 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateUserMutation.mutate({
                      id: editingUser.id,
                      body: {
                        role: editingUser.role,
                        custom_role_id: editingUser.custom_role?.id || null,
                        department_id: editingUser.department?.id || null,
                        team_id: editingUser.team?.id || null,
                        manager_id: editingUser.manager?.id || null,
                        is_active: editingUser.is_active
                      }
                    })
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white transition-all cursor-pointer"
                >
                  Save Config
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
