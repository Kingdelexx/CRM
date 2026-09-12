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
  AlertCircle,
  Upload,
  FileText,
  CheckSquare,
  Square,
  Check,
  FileUp
} from 'lucide-react'
import DetailDrawer from '@/components/DetailDrawer'

export interface VCardImportItem {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company_name: string
  address: string
  selected: boolean
}

function decodeQuotedPrintable(str: string): string {
  try {
    return decodeURIComponent(
      str.replace(/=/g, '%').replace(/%([0-9A-F]{2})/gi, (match, hex) => `%${hex}`)
    )
  } catch (e) {
    return str
  }
}

export function parseVCF(vcfText: string): VCardImportItem[] {
  // 1. Strip UTF-8 BOM
  let cleaned = vcfText.replace(/^\uFEFF/, '')
  
  // 2. Unfold lines (CRLF or LF followed by space/tab)
  const unfolded = cleaned.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const cards: VCardImportItem[] = []
  let currentCard: Partial<VCardImportItem> | null = null
  let rawFN: string | null = null
  let rawN: string | null = null

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (!line) continue

    // Support BEGIN:VCARD with potential trailing semicolons or parameters
    if (line.toUpperCase().includes('BEGIN:VCARD')) {
      currentCard = {
        id: `vcard-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        company_name: '',
        address: '',
        selected: true
      }
      rawFN = null
      rawN = null
      continue
    }

    if (line.toUpperCase().includes('END:VCARD')) {
      if (currentCard) {
        if (rawFN) {
          const parts = rawFN.trim().split(/\s+/)
          currentCard.first_name = parts[0] || ''
          currentCard.last_name = parts.slice(1).join(' ') || '.'
        } else if (rawN) {
          const parts = rawN.split(';')
          const surname = (parts[0] || '').trim()
          const givenName = (parts[1] || '').trim()
          currentCard.first_name = givenName || surname || ''
          currentCard.last_name = givenName ? (surname || '.') : '.'
        }

        if (!currentCard.first_name && !currentCard.last_name) {
          if (currentCard.company_name) {
            currentCard.first_name = currentCard.company_name
            currentCard.last_name = '.'
          } else if (currentCard.phone) {
            currentCard.first_name = currentCard.phone
            currentCard.last_name = '.'
          } else if (currentCard.email) {
            currentCard.first_name = currentCard.email.split('@')[0]
            currentCard.last_name = '.'
          } else {
            currentCard.first_name = 'Unknown'
            currentCard.last_name = 'Contact'
          }
        } else if (!currentCard.first_name) {
          currentCard.first_name = currentCard.last_name || 'Contact'
          currentCard.last_name = '.'
        } else if (!currentCard.last_name) {
          currentCard.last_name = '.'
        }

        cards.push(currentCard as VCardImportItem)
      }
      currentCard = null
      continue
    }

    if (!currentCard || !line.includes(':')) continue

    const colonIndex = line.indexOf(':')
    const keyPart = line.substring(0, colonIndex).toUpperCase()
    let valPart = line.substring(colonIndex + 1).trim()

    // Handle Quoted-Printable encoding decoding
    if (keyPart.includes('ENCODING=QUOTED-PRINTABLE') || keyPart.includes('ENCODING=B')) {
      valPart = decodeQuotedPrintable(valPart)
    }

    // Strip property specifiers and item prefixes e.g. ITEM1.TEL -> TEL, ITEM2.EMAIL -> EMAIL
    const primaryKeySpec = keyPart.split(';')[0]
    const keyName = primaryKeySpec.includes('.')
      ? primaryKeySpec.split('.').pop() || primaryKeySpec
      : primaryKeySpec

    if (keyName === 'FN') {
      rawFN = valPart
    } else if (keyName === 'N') {
      rawN = valPart
    } else if ((keyName === 'EMAIL' || keyName.includes('EMAIL')) && !currentCard.email) {
      currentCard.email = valPart
    } else if ((keyName === 'TEL' || keyName.includes('TEL')) && !currentCard.phone) {
      currentCard.phone = valPart
    } else if (keyName === 'TITLE' && !currentCard.job_title) {
      currentCard.job_title = valPart
    } else if (keyName === 'ORG' && !currentCard.company_name) {
      currentCard.company_name = valPart.split(';')[0].trim()
    } else if (keyName === 'ADR' && !currentCard.address) {
      const adrParts = valPart.split(';').map(p => p.trim()).filter(Boolean)
      currentCard.address = adrParts.join(', ')
    }
  }

  return cards
}

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
    address: '',
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

  // VCF Import Modal State
  const [isVcfModalOpen, setIsVcfModalOpen] = useState(false)
  const [vcfFile, setVcfFile] = useState<File | null>(null)
  const [vcfFileName, setVcfFileName] = useState('')
  const [parsedVCardItems, setParsedVCardItems] = useState<VCardImportItem[]>([])
  const [vcfDefaultStatus, setVcfDefaultStatus] = useState('LEAD')
  const [vcfDefaultAssignee, setVcfDefaultAssignee] = useState('')
  const [vcfBypassDuplicates, setVcfBypassDuplicates] = useState(true)
  const [vcfImportError, setVcfImportError] = useState('')
  const [vcfImportSuccess, setVcfImportSuccess] = useState('')
  const [isImportingVcf, setIsImportingVcf] = useState(false)
  const [vcfPreviewSearch, setVcfPreviewSearch] = useState('')

  const handleVcfFileChange = (file: File | null) => {
    if (!file) return
    setVcfFile(file)
    setVcfFileName(file.name)
    setVcfImportError('')
    setVcfImportSuccess('')

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        const parsed = parseVCF(text)
        if (parsed.length === 0) {
          setVcfImportError('No valid vCard contacts found in the selected file.')
        } else {
          setParsedVCardItems(parsed)
        }
      }
    }
    reader.onerror = () => {
      setVcfImportError('Failed to read the VCF file.')
    }
    reader.readAsText(file)
  }

  const toggleSelectAllVCardItems = (select: boolean) => {
    setParsedVCardItems(prev => prev.map(item => ({ ...item, selected: select })))
  }

  const toggleVCardItemSelect = (id: string) => {
    setParsedVCardItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item))
  }

  const updateVCardItemField = (id: string, field: keyof VCardImportItem, value: any) => {
    setParsedVCardItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleVcfImportSubmit = async () => {
    const selectedItems = parsedVCardItems.filter(item => item.selected)
    if (selectedItems.length === 0) {
      setVcfImportError('Please select at least one contact to import.')
      return
    }

    setIsImportingVcf(true)
    setVcfImportError('')

    try {
      const payload = {
        contacts: selectedItems.map(item => ({
          first_name: item.first_name || 'Contact',
          last_name: item.last_name || '.',
          email: item.email || '',
          phone: item.phone || null,
          job_title: item.job_title || null,
          address: item.address || null,
          company_name: item.company_name || null,
          status: vcfDefaultStatus,
          assigned_to_id: vcfDefaultAssignee || null,
        })),
        status: vcfDefaultStatus,
        assigned_to_id: vcfDefaultAssignee || null,
        bypass_duplicates: vcfBypassDuplicates
      }

      const response = await apiClient.post('/contacts/import', payload)
      const { created_count, skipped_count } = response.data

      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setVcfImportSuccess(`Successfully imported ${created_count} contact(s)!${skipped_count ? ` (${skipped_count} skipped)` : ''}`)
      setTimeout(() => {
        setIsVcfModalOpen(false)
        setVcfFile(null)
        setParsedVCardItems([])
        setVcfImportSuccess('')
      }, 1600)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to import VCF contacts.'
      setVcfImportError(msg)
    } finally {
      setIsImportingVcf(false)
    }
  }

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
        address: '',
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
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setVcfImportError('')
              setVcfImportSuccess('')
              setIsVcfModalOpen(true)
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-600/10 cursor-pointer w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" /> Import VCF
          </button>
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

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-semibold">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address, City, State..."
                  className="w-full bg-zinc-905 border border-zinc-800 focus:border-indigo-650 focus:outline-none rounded-lg p-2 text-sm text-zinc-250 placeholder-zinc-650"
                />
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
                                address: '',
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

      {/* VCF IMPORT MODAL OVERLAY */}
      {isVcfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60 p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-md font-bold text-white">Import Contacts from VCF File</h3>
                  <p className="text-xs text-zinc-400">Upload vCard (.vcf) files to bulk import contacts into your workspace</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsVcfModalOpen(false)
                  setVcfFile(null)
                  setParsedVCardItems([])
                }}
                className="text-zinc-450 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {vcfImportError && (
                <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{vcfImportError}</span>
                </div>
              )}

              {vcfImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{vcfImportSuccess}</span>
                </div>
              )}

              {parsedVCardItems.length === 0 ? (
                /* Step 1: Upload File Area */
                <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl p-10 text-center transition-all bg-zinc-900/20 flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">Select or drop a .vcf / .vcard file</h4>
                    <p className="text-xs text-zinc-400 mt-1">Supports vCard 2.1, 3.0, and 4.0 contact format files</p>
                  </div>
                  <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-md shadow-emerald-600/10 inline-flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Browse VCF File
                    <input
                      type="file"
                      accept=".vcf,.vcard,text/vcard,text/x-vcard"
                      onChange={(e) => {
                        const files = e.target.files
                        if (files && files[0]) {
                          handleVcfFileChange(files[0])
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                /* Step 2: Interactive Preview & Batch Configuration */
                <div className="space-y-4">
                  {/* File Info & Global Config Bar */}
                  <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-zinc-200">{vcfFileName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                          {parsedVCardItems.length} Contacts Found
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVcfFile(null)
                          setParsedVCardItems([])
                          setVcfImportError('')
                        }}
                        className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Choose Different File
                      </button>
                    </div>

                    {/* Batch import defaults */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Default CRM Status</label>
                        <select
                          value={vcfDefaultStatus}
                          onChange={(e) => setVcfDefaultStatus(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 cursor-pointer focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="LEAD">Lead</option>
                          <option value="CONTACT">Contact</option>
                          <option value="CUSTOMER">Customer</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Assign To Sales Rep</label>
                        <select
                          value={vcfDefaultAssignee}
                          onChange={(e) => setVcfDefaultAssignee(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 cursor-pointer focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {usersData?.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Duplicates Handling</label>
                        <select
                          value={vcfBypassDuplicates ? 'bypass' : 'skip'}
                          onChange={(e) => setVcfBypassDuplicates(e.target.value === 'bypass')}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 cursor-pointer focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="bypass">Import All (Create Duplicates if needed)</option>
                          <option value="skip">Skip Existing Duplicates</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Filter / Search inside preview */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                      <button
                        type="button"
                        onClick={() => toggleSelectAllVCardItems(true)}
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors text-[11px] cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectAllVCardItems(false)}
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors text-[11px] cursor-pointer"
                      >
                        Deselect All
                      </button>
                      <span className="text-zinc-400 text-xs ml-2">
                        Selected: <strong className="text-emerald-400">{parsedVCardItems.filter(i => i.selected).length}</strong> of {parsedVCardItems.length}
                      </span>
                    </div>

                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search parsed cards..."
                        value={vcfPreviewSearch}
                        onChange={(e) => setVcfPreviewSearch(e.target.value)}
                        className="w-full bg-zinc-950 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Parsed Contacts Preview Table */}
                  <div className="border border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-10 text-center">Select</th>
                          <th className="p-3">First Name</th>
                          <th className="p-3">Last Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Organization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {parsedVCardItems
                          .filter(item => {
                            if (!vcfPreviewSearch.trim()) return true
                            const q = vcfPreviewSearch.toLowerCase()
                            return (
                              item.first_name.toLowerCase().includes(q) ||
                              item.last_name.toLowerCase().includes(q) ||
                              item.email.toLowerCase().includes(q) ||
                              item.phone.toLowerCase().includes(q) ||
                              item.company_name.toLowerCase().includes(q)
                            )
                          })
                          .map(item => (
                            <tr key={item.id} className={`hover:bg-zinc-900/30 transition-colors ${!item.selected ? 'opacity-40' : ''}`}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleVCardItemSelect(item.id)}
                                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.first_name}
                                  onChange={(e) => updateVCardItemField(item.id, 'first_name', e.target.value)}
                                  className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-zinc-200 w-full"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.last_name}
                                  onChange={(e) => updateVCardItemField(item.id, 'last_name', e.target.value)}
                                  className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-zinc-200 w-full"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.email}
                                  onChange={(e) => updateVCardItemField(item.id, 'email', e.target.value)}
                                  placeholder="No email"
                                  className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-zinc-300 w-full text-xs"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.phone}
                                  onChange={(e) => updateVCardItemField(item.id, 'phone', e.target.value)}
                                  placeholder="No phone"
                                  className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-zinc-300 w-full text-xs"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.company_name}
                                  onChange={(e) => updateVCardItemField(item.id, 'company_name', e.target.value)}
                                  placeholder="None"
                                  className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-zinc-400 w-full text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-zinc-900 flex justify-end gap-3 bg-zinc-950">
              <button
                type="button"
                onClick={() => {
                  setIsVcfModalOpen(false)
                  setVcfFile(null)
                  setParsedVCardItems([])
                }}
                className="px-4 py-2 rounded-lg border border-zinc-900 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              {parsedVCardItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleVcfImportSubmit}
                  disabled={isImportingVcf || parsedVCardItems.filter(i => i.selected).length === 0}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isImportingVcf ? (
                    <>
                      <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin"></span>
                      Importing Contacts...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Import {parsedVCardItems.filter(i => i.selected).length} Contacts
                    </>
                  )}
                </button>
              )}
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
