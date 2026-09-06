import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Contact, User } from '@/types/crm'
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
  X,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  AlertCircle,
  Handshake,
  UserCheck
} from 'lucide-react'
import DetailDrawer from '@/components/DetailDrawer'

export default function PartnersWorkspace() {
  const queryClient = useQueryClient()
  
  // Search, Filter, Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Partner Form State - uses single full_name field
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    city: '',
    state: '',
    assigned_to_id: '',
    status: 'PARTNER'
  })
  const [formError, setFormError] = useState('')

  // 1. Fetch partners (status = PARTNER)
  const limit = pagination.pageSize
  const offset = pagination.pageIndex * pagination.pageSize
  
  const { data: partnersData, isLoading, isError } = useQuery({
    queryKey: ['partners-workspace', searchTerm, assigneeFilter, limit, offset],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Contact[]; count: number }>('/contacts/', {
        params: {
          search: searchTerm || undefined,
          status: 'PARTNER',
          assigned_to_id: assigneeFilter || undefined,
          limit,
          offset
        }
      })
      return response.data
    }
  })

  // 2. Fetch staff members for Partner Owner select dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users-select'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/accounts/')
      return response.data
    }
  })

  // Calculate metrics
  const totalPartners = partnersData?.count || 0
  const metrics = useMemo(() => {
    const items = partnersData?.items || []
    let assignedCount = 0
    const citiesSet = new Set<string>()
    items.forEach((item) => {
      if (item.assigned_to) assignedCount++
      if (item.city) citiesSet.add(item.city.toLowerCase())
    })
    return { assignedCount, uniqueCities: citiesSet.size }
  }, [partnersData])

  // 3. Create Partner mutation (splits full_name into first_name and last_name for Contact model compatibility)
  const createPartnerMutation = useMutation({
    mutationFn: async (payload: typeof formData & { bypass_duplicate_check?: boolean }) => {
      const trimmedParts = payload.full_name.trim().split(' ')
      const first_name = trimmedParts[0] || ''
      const last_name = trimmedParts.slice(1).join(' ') || '.'

      const formattedPayload = {
        first_name,
        last_name,
        email: payload.email,
        phone: payload.phone || null,
        whatsapp_number: payload.whatsapp_number || null,
        city: payload.city || null,
        state: payload.state || null,
        assigned_to_id: payload.assigned_to_id || null,
        status: 'PARTNER'
      }
      const bypass = payload.bypass_duplicate_check ? 'true' : 'false'
      return apiClient.post(`/contacts/?bypass_duplicate_check=${bypass}`, formattedPayload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners-workspace'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setIsModalOpen(false)
      setFormError('')
      // Reset form
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        whatsapp_number: '',
        city: '',
        state: '',
        assigned_to_id: '',
        status: 'PARTNER'
      })
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.detail || err?.message || 'Failed to create partner'
      setFormError(errMsg)
    }
  })

  // Table columns setup
  const columns = useMemo(() => [
    {
      id: 'fullName',
      header: 'Partner Full Name',
      cell: (info: any) => {
        const fn = info.row.original.first_name || ''
        const ln = info.row.original.last_name || ''
        const fullName = [fn, ln === '.' ? '' : ln].filter(Boolean).join(' ')
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase flex-shrink-0">
              {fn[0] || 'P'}{(ln && ln !== '.') ? ln[0] : ''}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-zinc-100 truncate">
                {fullName}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {info.row.original.job_title || 'Strategic Partner'}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'assigned_to',
      header: 'Partner Owner',
      cell: (info: any) => {
        const user = info.row.original.assigned_to
        if (!user) return <span className="text-zinc-600 text-xs italic">Unassigned</span>
        return (
          <div className="flex items-center gap-2 text-xs text-zinc-200">
            <div className="h-6 w-6 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center text-[10px] text-indigo-400 font-bold uppercase flex-shrink-0">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <span className="truncate">{user.first_name} {user.last_name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'email',
      header: 'Contact Information',
      cell: (info: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Mail className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <span className="truncate">{info.getValue()}</span>
          </div>
          {info.row.original.phone && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Phone className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
              <span>{info.row.original.phone}</span>
            </div>
          )}
          {info.row.original.whatsapp_number && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span>{info.row.original.whatsapp_number}</span>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'address',
      header: 'Address (City, State)',
      cell: (info: any) => {
        const city = info.row.original.city
        const state = info.row.original.state
        if (!city && !state) return <span className="text-zinc-600 text-xs italic">-</span>
        return (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>{[city, state].filter(Boolean).join(', ')}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Date Onboarded',
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
    data: partnersData?.items || [],
    columns,
    pageCount: Math.ceil((partnersData?.count || 0) / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim()) {
      setFormError('Partner Full Name is required.')
      return
    }
    if (!formData.email.trim()) {
      setFormError('Email address is required.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setFormError('Please enter a valid email address.')
      return
    }
    createPartnerMutation.mutate(formData)
  }

  const paginationCount = partnersData?.count || 0
  const pageStart = paginationCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const pageEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, paginationCount)

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Handshake className="h-6 w-6 text-emerald-400" />
            Partners Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Register, assign, and track strategic business partners</p>
        </div>
        <button
          onClick={() => {
            setFormError('')
            setIsModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4.5 w-4.5" /> Add Partner
        </button>
      </div>

      {/* METRICS CARDS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Total Partners</span>
            <span className="text-2xl font-black text-white mt-1 block">{totalPartners}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Handshake className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Assigned Partners</span>
            <span className="text-2xl font-black text-indigo-400 mt-1 block">
              {metrics.assignedCount}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Cities Covered</span>
            <span className="text-2xl font-black text-sky-400 mt-1 block">
              {metrics.uniqueCities}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <MapPin className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search partners by name, email, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPagination(p => ({ ...p, pageIndex: 0 }))
            }}
            className="w-full bg-zinc-950 pl-10 pr-4 py-2 rounded-lg border border-zinc-900 focus:border-emerald-600 focus:outline-none text-sm text-zinc-200 placeholder-zinc-500"
          />
        </div>

        {/* Partner Owner Filter Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 text-xs w-full md:w-auto">
            <UserIcon className="h-4 w-4 text-zinc-500" />
            <span className="text-zinc-400 font-medium">Owner:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setPagination(p => ({ ...p, pageIndex: 0 }))
              }}
              className="bg-transparent text-zinc-200 border-none outline-none focus:ring-0 cursor-pointer font-semibold"
            >
              <option value="" className="bg-zinc-950">All Partner Owners</option>
              {usersData?.map((user) => (
                <option key={user.id} value={user.id} className="bg-zinc-950">
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || assigneeFilter) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setAssigneeFilter('')
                setPagination(p => ({ ...p, pageIndex: 0 }))
              }}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* PARTNERS DIRECTORY TABLE */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-2">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            <span className="text-xs">Loading partners directory...</span>
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-red-400 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Failed to fetch partners. Please check connection.</span>
          </div>
        ) : partnersData?.items.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <Handshake className="h-10 w-10 text-zinc-700" />
            <p className="text-semibold text-sm text-zinc-300">No active partners found</p>
            <p className="text-xs text-zinc-500">Click "+ Add Partner" to register a new strategic partner</p>
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
                      className="hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    >
                      {row.getVisibleCells().map((c: any) => (
                        <td key={c.id} className="px-6 py-4 whitespace-nowrap text-zinc-300">
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-400">
              <div>
                Showing <span className="font-semibold text-zinc-200">{pageStart}</span> to{' '}
                <span className="font-semibold text-zinc-200">{pageEnd}</span> of{' '}
                <span className="font-semibold text-zinc-200">{paginationCount}</span> partners
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1 px-3 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:bg-zinc-950 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1 px-3 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:bg-zinc-950 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE PARTNER MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/70 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-emerald-400" />
                <h3 className="text-md font-bold text-white">Create New Partner</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[80vh]">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Partner Owner */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5 text-emerald-400" /> Partner Owner
                </label>
                <select
                  name="assigned_to_id"
                  value={formData.assigned_to_id}
                  onChange={handleInputChange}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                >
                  <option value="" className="bg-zinc-950">Select Partner Owner (Staff Member)</option>
                  {usersData?.map((user) => (
                    <option key={user.id} value={user.id} className="bg-zinc-950">
                      {user.first_name} {user.last_name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Partner Full Name (Single Input Field) */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5 text-zinc-400" /> Partner Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Acme Ventures Ltd / Jane Doe"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                />
              </div>

              {/* 3. Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> Partner Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="partner@company.com"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                />
              </div>

              {/* 4. Phone & WhatsApp Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-zinc-400" /> Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+234 801 234 5678"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp Number
                  </label>
                  <input
                    type="text"
                    name="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={handleInputChange}
                    placeholder="+234 801 234 5678"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* 5. Address (City & State) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" /> City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Abuja"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" /> State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="FCT"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPartnerMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {createPartnerMutation.isPending && (
                    <span className="h-3.5 w-3.5 rounded-full border border-white border-t-transparent animate-spin"></span>
                  )}
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Detail Drawer */}
      <DetailDrawer
        isOpen={isDrawerOpen}
        type="contact"
        id={selectedContactId}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedContactId(null)
        }}
      />
    </div>
  )
}
