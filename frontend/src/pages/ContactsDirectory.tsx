import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Contact, Company, User } from '@/types/crm'
import {
  useLegacyTable as useReactTable,
  getCoreRowModel
} from '@tanstack/react-table/legacy'
import { flexRender } from '@tanstack/react-table'
import {
  Search,
  User as UserIcon,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Building,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react'
import DetailDrawer from '@/components/DetailDrawer'

export default function ContactsDirectory() {
  const queryClient = useQueryClient()
  
  // States (Search, Filter, Pagination)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Current user parsing
  const currentUser = useMemo(() => {
    const saved = localStorage.getItem('current_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return null
      }
    }
    return null
  }, [])

  // Memoized Saved View Type
  const activeSavedView = useMemo(() => {
    if (statusFilter === 'LEAD' && !assigneeFilter) return 'leads'
    if (statusFilter === 'CUSTOMER' && !assigneeFilter) return 'customers'
    if (!statusFilter && assigneeFilter && currentUser && String(assigneeFilter) === String(currentUser.id)) return 'assigned_to_me'
    if (!statusFilter && !assigneeFilter) return 'all'
    return 'custom'
  }, [statusFilter, assigneeFilter, currentUser])

  // New Contact Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    status: 'LEAD',
    company_id: '',
    assigned_to_id: ''
  })
  const [formError, setFormError] = useState('')
  
  // Duplicate detection states
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([])
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  // 1. Fetch contacts
  const limit = pagination.pageSize
  const offset = pagination.pageIndex * pagination.pageSize
  
  const { data: contactsData, isLoading, isError } = useQuery({
    queryKey: ['contacts', searchTerm, statusFilter, assigneeFilter, limit, offset],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Contact[]; count: number }>('/contacts/', {
        params: {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          assigned_to_id: assigneeFilter || undefined,
          limit,
          offset
        }
      })
      return response.data
    }
  })

  // 2. Fetch companies for select dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies-select'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Company[] }>('/companies/', {
        params: { limit: 200 }
      })
      return response.data.items
    }
  })

  // 3. Fetch users (team members) for select dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users-select'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/accounts/')
      return response.data
    }
  })

  // 4. Create Contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (payload: typeof formData & { bypass_duplicate_check?: boolean }) => {
      const formattedPayload = {
        ...payload,
        company_id: payload.company_id || null,
        assigned_to_id: payload.assigned_to_id || null
      }
      const bypass = payload.bypass_duplicate_check ? 'true' : 'false'
      return apiClient.post(`/contacts/?bypass_duplicate_check=${bypass}`, formattedPayload)
    },
    onSuccess: () => {
      // Invalidate contacts queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setIsModalOpen(false)
      setFormError('')
      setShowDuplicateDialog(false)
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        status: 'LEAD',
        company_id: '',
        assigned_to_id: ''
      })
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || ''
      if (err?.response?.status === 409 && detail.startsWith('DUPLICATE_DETECTED|')) {
        try {
          const jsonStr = detail.substring('DUPLICATE_DETECTED|'.length)
          const candidates = JSON.parse(jsonStr)
          setDuplicateCandidates(candidates)
          setDuplicateMessage('A potential duplicate contact was identified. Consolidate into existing, bypass to create duplicate, or cancel.')
          setShowDuplicateDialog(true)
          return
        } catch (e) {
          console.error("Failed to parse duplicates:", e)
        }
      }
      const errMsg = err?.response?.data?.detail || err?.message || 'Failed to create contact'
      setFormError(errMsg)
    }
  })

  // Table columns setup
  const columns = useMemo(() => [
    {
      id: 'fullName',
      header: 'Name',
      cell: (info: any) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
            {info.row.original.first_name[0]}{info.row.original.last_name[0]}
          </div>
          <div>
            <div className="font-semibold text-zinc-200">
              {info.row.original.first_name} {info.row.original.last_name}
            </div>
            <div className="text-xs text-zinc-500">{info.row.original.job_title || 'No Job Title'}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'email',
      header: 'Email / Contact',
      cell: (info: any) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Mail className="h-3.5 w-3.5 text-zinc-500" />
            {info.getValue()}
          </div>
          {info.row.original.phone && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Phone className="h-3.5 w-3.5 text-zinc-500" />
              {info.row.original.phone}
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: (info: any) => {
        const company = info.row.original.company
        if (!company) return <span className="text-zinc-600 text-xs italic">-</span>
        return (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Building className="h-3.5 w-3.5 text-indigo-400/70" />
            <span>{company.name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info: any) => {
        const status = info.getValue()
        const styles = {
          LEAD: 'bg-indigo-500/10 text-indigo-405 border-indigo-500/20',
          CONTACT: 'bg-blue-500/10 text-blue-450 border-blue-500/20',
          CUSTOMER: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
        }[status as 'LEAD' | 'CONTACT' | 'CUSTOMER'] || 'bg-zinc-500/10 text-zinc-400 border-zinc-550'
        
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles}`}>
            {status}
          </span>
        )
      }
    },
    {
      accessorKey: 'assigned_to',
      header: 'Assignee',
      cell: (info: any) => {
        const user = info.row.original.assigned_to
        if (!user) return <span className="text-zinc-600 text-xs italic">-</span>
        return (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase animate-fade">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <span>{user.first_name} {user.last_name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Date Added',
      cell: (info: any) => (
        <span className="text-xs text-zinc-400">
          {new Date(info.getValue()).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      )
    }
  ], [])

  // Table hook instance
  const table = useReactTable({
    data: contactsData?.items || [],
    columns,
    pageCount: Math.ceil((contactsData?.count || 0) / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true
  })

  // Filter handlers
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setAssigneeFilter('')
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }

  // Handle Form Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('First name and last name are required.')
      return
    }
    if (!formData.email.trim()) {
      setFormError('Email is required.')
      return
    }
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setFormError('Please enter a valid email address.')
      return
    }
    createContactMutation.mutate(formData)
  }

  const paginationCount = contactsData?.count || 0
  const pageStart = pagination.pageIndex * pagination.pageSize + 1
  const pageEnd = Math.min(pageStart + pagination.pageSize - 1, paginationCount)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Contacts Directory</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage and assign leads, contacts, and customer directories</p>
        </div>
        <button
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-600/10 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> New Contact
        </button>
      </div>

      {/* SAVED VIEWS PRESET TABS */}
      <div className="flex gap-2 border-b border-zinc-900 pb-2 overflow-x-auto">
        <button
          onClick={() => {
            setStatusFilter('')
            setAssigneeFilter('')
            setPagination(p => ({ ...p, pageIndex: 0 }))
          }}
          className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border ${
            activeSavedView === 'all'
              ? 'bg-indigo-650 border-indigo-600 text-white shadow-xl shadow-indigo-650/10'
              : 'bg-zinc-950/80 border-zinc-900 text-zinc-450 hover:text-zinc-200'
          }`}
        >
          All Contacts
        </button>
        <button
          onClick={() => {
            setStatusFilter('LEAD')
            setAssigneeFilter('')
            setPagination(p => ({ ...p, pageIndex: 0 }))
          }}
          className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border ${
            activeSavedView === 'leads'
              ? 'bg-indigo-650 border-indigo-600 text-white shadow-xl shadow-indigo-650/10'
              : 'bg-zinc-950/80 border-zinc-900 text-zinc-450 hover:text-zinc-200'
          }`}
        >
          Active Leads
        </button>
        <button
          onClick={() => {
            setStatusFilter('CUSTOMER')
            setAssigneeFilter('')
            setPagination(p => ({ ...p, pageIndex: 0 }))
          }}
          className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border ${
            activeSavedView === 'customers'
              ? 'bg-indigo-650 border-indigo-600 text-white shadow-xl shadow-indigo-650/10'
              : 'bg-zinc-950/80 border-zinc-900 text-zinc-455 hover:text-zinc-200'
          }`}
        >
          Customers
        </button>
        {currentUser && (
          <button
            onClick={() => {
              setStatusFilter('')
              setAssigneeFilter(currentUser.id)
              setPagination(p => ({ ...p, pageIndex: 0 }))
            }}
            className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border ${
              activeSavedView === 'assigned_to_me'
                ? 'bg-indigo-650 border-indigo-600 text-white shadow-xl shadow-indigo-650/10'
                : 'bg-zinc-950/80 border-zinc-900 text-zinc-450 hover:text-zinc-200'
            }`}
          >
            Assigned To Me
          </button>
        )}
      </div>

      {/* FILTER BAR PANEL */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPagination(p => ({ ...p, pageIndex: 0 }))
            }}
            className="w-full bg-zinc-950 pl-10 pr-4 py-2 rounded-lg border border-zinc-900 focus:border-indigo-650 focus:outline-none text-sm text-zinc-200 placeholder-zinc-500"
          />
        </div>

        {/* Action filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-900 text-xs">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPagination(p => ({ ...p, pageIndex: 0 }))
              }}
              className="bg-transparent text-zinc-305 border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="LEAD">Leads</option>
              <option value="CONTACT">Contacts</option>
              <option value="CUSTOMER">Customers</option>
            </select>
          </div>

          {/* Owner Dropdown */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-900 text-xs">
            <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setPagination(p => ({ ...p, pageIndex: 0 }))
              }}
              className="bg-transparent text-zinc-305 border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value="">All Assignees</option>
              {usersData?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || statusFilter || assigneeFilter) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-305 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* TABLE PANEL */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-2">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
            <span className="text-xs">Loading contact directories...</span>
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-red-400 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Failed to fetch contacts. Please verify auth token session.</span>
          </div>
        ) : contactsData?.items.length === 0 ? (
          <div className="py-20 text-center text-zinc-505 flex flex-col items-center justify-center gap-1">
            <Users className="h-8 w-8 text-zinc-700" />
            <p className="text-semibold text-sm">No contacts found</p>
            <p className="text-xs">Try clearing filters or create a new contact</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  {table.getHeaderGroups().map((hg: any) => (
                    <tr key={hg.id} className="border-b border-zinc-900 bg-zinc-950/80">
                      {hg.headers.map((h: any) => (
                        <th key={h.id} className="px-6 py-3 font-semibold text-zinc-400 text-xs uppercase tracking-wider">
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {table.getRowModel().rows.map((row: any) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        setSelectedContactId(row.original.id)
                        setIsDrawerOpen(true)
                      }}
                      className="hover:bg-zinc-900/20 transition-colors cursor-pointer"
                    >
                      {row.getVisibleCells().map((c: any) => (
                        <td key={c.id} className="px-6 py-4.5 whitespace-nowrap text-zinc-303">
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="px-6 py-4.5 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-400">
              <div>
                Showing <span className="font-semibold text-zinc-305">{pageStart}</span> to{' '}
                <span className="font-semibold text-zinc-305">{pageEnd}</span> of{' '}
                <span className="font-semibold text-zinc-305">{paginationCount}</span> contacts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1 px-2.5 rounded-lg border border-zinc-905 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:bg-zinc-950 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1 px-2.5 rounded-lg border border-zinc-905 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:bg-zinc-950 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* NEW CONTACT MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60 p-4">
          <div className="bg-zinc-950 border border-zinc-905 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-905 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h3 className="text-md font-bold text-white">Create New Contact</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-450 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 flex-1">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Names row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Wile"
                    required
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Coyote"
                    required
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-255 placeholder-zinc-655"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="wile@acme.com"
                    required
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                  />
                </div>
              </div>

              {/* Job Title & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Job Title</label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    placeholder="Director of Acquisitions"
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">CRM Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="CONTACT">Contact</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                </div>
              </div>

              {/* Company & Assignee */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Associated Company</label>
                  <select
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  >
                    <option value="">None (Standalone)</option>
                    {companiesData?.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Assigned Sales Team</label>
                  <select
                    name="assigned_to_id"
                    value={formData.assigned_to_id}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {usersData?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
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
                  disabled={createContactMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createContactMutation.isPending && <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin"></span>}
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUPLICATE WARNING MODAL */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60 p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-8">
            <div className="px-6 py-4.5 border-b border-zinc-900 flex justify-between items-center bg-amber-950/20">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Duplicate Contact Detected</h3>
              </div>
              <button
                onClick={() => setShowDuplicateDialog(false)}
                className="text-zinc-450 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-zinc-350">
              <p className="text-zinc-300 text-xs font-medium leading-relaxed">{duplicateMessage}</p>
              
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Existing Leads/Contacts in Workspace:</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {duplicateCandidates.map((cand) => (
                    <div key={cand.id} className="p-3 bg-zinc-900/50 border border-zinc-900 rounded-lg flex justify-between items-center gap-3">
                      <div>
                        <div className="font-bold text-zinc-205">{cand.first_name} {cand.last_name}</div>
                        <div className="text-[10px] text-zinc-500">{cand.email} • {cand.phone || 'No Phone'}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-zinc-850 border border-zinc-800 text-indigo-400 font-bold uppercase">
                          {cand.status}
                        </span>
                        
                        <button
                          type="button"
                          disabled={isMerging}
                          onClick={async () => {
                            try {
                              setIsMerging(true)
                              const createResponse = await apiClient.post('/contacts/?bypass_duplicate_check=true', {
                                ...formData,
                                company_id: formData.company_id || null,
                                assigned_to_id: formData.assigned_to_id || null
                              })
                              const newContactId = createResponse.data.id
                              
                              await apiClient.post(`/contacts/${cand.id}/merge`, null, {
                                params: { candidate_id: newContactId }
                              })
                              
                              queryClient.invalidateQueries({ queryKey: ['contacts'] })
                              setShowDuplicateDialog(false)
                              setIsModalOpen(false)
                              setFormData({
                                first_name: '',
                                last_name: '',
                                email: '',
                                phone: '',
                                job_title: '',
                                status: 'LEAD',
                                company_id: '',
                                assigned_to_id: ''
                              })
                            } catch (e: any) {
                              alert(e?.response?.data?.detail || e.message || 'Failed to merge contacts')
                            } finally {
                              setIsMerging(false)
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-all text-[10px] uppercase cursor-pointer"
                        >
                          {isMerging ? 'Merging...' : 'Merge Into'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-4 flex flex-col gap-2">
                <div className="text-[10px] text-zinc-500 uppercase font-black">Or force a new duplicate record:</div>
                <div className="flex gap-2.5 justify-end text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShowDuplicateDialog(false)}
                    className="px-4 py-2 border border-zinc-900 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      createContactMutation.mutate({ ...formData, bypass_duplicate_check: true })
                    }}
                    className="px-4 py-2 bg-amber-600/10 border border-amber-500/25 text-amber-400 hover:bg-amber-600/20 hover:text-amber-300 rounded transition-all cursor-pointer"
                  >
                    Create Separate Duplicate
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER SLIDE-OVER */}
      <DetailDrawer
        type="contact"
        id={selectedContactId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] })
        }}
      />
    </div>
  )
}
