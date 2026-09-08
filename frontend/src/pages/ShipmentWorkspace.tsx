import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Shipment, Contact, User, ShipmentEscalation, EscalationType, EscalationPriority, EscalationStatus } from '@/types/crm'
import {
  useLegacyTable as useReactTable,
  getCoreRowModel
} from '@tanstack/react-table/legacy'
import { flexRender } from '@tanstack/react-table'
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Truck,
  Package,
  DollarSign,
  User as UserIcon,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Handshake,
  Tag,
  AlertOctagon,
  ShieldAlert,
  MessageSquare,
  UserCheck,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Check
} from 'lucide-react'

export default function ShipmentWorkspace() {
  const queryClient = useQueryClient()
  
  // Primary Workspace Tab
  const [workspaceTab, setWorkspaceTab] = useState<'shipments' | 'escalations'>('shipments')

  // Search & Filters for Shipments
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  
  // Search & Filters for Escalations
  const [escalationSearchTerm, setEscalationSearchTerm] = useState('')
  const [escalationTypeFilter, setEscalationTypeFilter] = useState('')
  const [escalationPriorityFilter, setEscalationPriorityFilter] = useState('')
  const [escalationStatusFilter, setEscalationStatusFilter] = useState('')
  
  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'shipment' | 'package'>('shipment')
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // Escalation Modal & Drawer State
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false)
  const [selectedEscalation, setSelectedEscalation] = useState<ShipmentEscalation | null>(null)
  const [isEscalationDrawerOpen, setIsEscalationDrawerOpen] = useState(false)


  // Form State
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_id: '',
    receiver_name: '',
    receiver_id: '',
    receiver_phone: '',
    receiver_email: '',
    receiver_address: '',
    date: new Date().toISOString().split('T')[0],
    shipment_status: 'PENDING',
    payment_status: 'UNPAID',
    currency: 'NGN',
    conversion_rate: '1.0000',
    amount: '',
    invoice_number: '',
    number_of_carton: '1',
    partner_id: '',
    partner_name: '',
    // Package Details
    item_received: '',
    items_shipped: '',
    items_recieved: '',
    weight_kg: '',
    tracking_id: '',
    value: '',
    note: '',
    recorded_by_id: ''
  })
  const [formError, setFormError] = useState('')

  // Escalation Form State
  const [escalationFormData, setEscalationFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shipment_id: '',
    customer_id: '',
    customer_name: '',
    escalation_type: 'DELAY' as EscalationType,
    priority: 'MEDIUM' as EscalationPriority,
    complaint_summary: '',
    status: 'OPEN' as EscalationStatus,
    internal: '',
    escalation_to_id: '',
    resolution: '',
    resolution_date: ''
  })
  const [escalationFormError, setEscalationFormError] = useState('')

  // 1. Fetch Shipments list
  const { data: shipmentsData, isLoading, isError } = useQuery({
    queryKey: ['shipments', searchTerm, statusFilter, paymentFilter],
    queryFn: async () => {
      const response = await apiClient.get<Shipment[]>('/shipments/', {
        params: {
          search: searchTerm || undefined,
          shipment_status: statusFilter || undefined,
          payment_status: paymentFilter || undefined
        }
      })
      return response.data
    }
  })

  // 1b. Fetch Shipment Escalations list
  const { data: escalationsData, isLoading: isEscalationsLoading, isError: isEscalationsError } = useQuery({
    queryKey: ['shipment-escalations', escalationSearchTerm, escalationTypeFilter, escalationPriorityFilter, escalationStatusFilter],
    queryFn: async () => {
      const response = await apiClient.get<ShipmentEscalation[]>('/shipment-escalations/', {
        params: {
          search: escalationSearchTerm || undefined,
          escalation_type: escalationTypeFilter || undefined,
          priority: escalationPriorityFilter || undefined,
          status: escalationStatusFilter || undefined
        }
      })
      return response.data
    }
  })

  // Escalation Metrics Summary
  const escalationMetrics = useMemo(() => {
    const items = Array.isArray(escalationsData) ? escalationsData : []
    const total = items.length
    const open = items.filter(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS').length
    const urgent = items.filter(e => e.priority === 'URGENT' || e.priority === 'HIGH').length
    const resolved = items.filter(e => e.status === 'RESOLVED' || e.status === 'CLOSED').length
    return { total, open, urgent, resolved }
  }, [escalationsData])

  // Create Escalation Mutation
  const createEscalationMutation = useMutation({
    mutationFn: async (payload: typeof escalationFormData) => {
      const formatted = {
        date: payload.date || null,
        shipment_id: payload.shipment_id || null,
        customer_id: payload.customer_id || null,
        customer_name: payload.customer_name || null,
        escalation_type: payload.escalation_type,
        priority: payload.priority,
        complaint_summary: payload.complaint_summary,
        status: payload.status,
        internal: payload.internal || null,
        escalation_to_id: payload.escalation_to_id || null,
        resolution: payload.resolution || null,
        resolution_date: payload.resolution_date || null
      }
      return apiClient.post('/shipment-escalations/', formatted)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-escalations'] })
      setIsEscalationModalOpen(false)
      setEscalationFormError('')
      resetEscalationForm()
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      let errMsg = 'Failed to create escalation'
      if (typeof detail === 'string') errMsg = detail
      else if (err?.message) errMsg = err.message
      setEscalationFormError(errMsg)
    }
  })

  // Update Escalation Mutation
  const updateEscalationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiClient.put(`/shipment-escalations/${id}`, data)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-escalations'] })
      if (res.data) {
        setSelectedEscalation(res.data)
      }
    }
  })

  // Delete Escalation Mutation
  const deleteEscalationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/shipment-escalations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-escalations'] })
      setIsEscalationDrawerOpen(false)
      setSelectedEscalation(null)
    }
  })

  const resetEscalationForm = () => {
    setEscalationFormData({
      date: new Date().toISOString().split('T')[0],
      shipment_id: '',
      customer_id: '',
      customer_name: '',
      escalation_type: 'DELAY',
      priority: 'MEDIUM',
      complaint_summary: '',
      status: 'OPEN',
      internal: '',
      escalation_to_id: '',
      resolution: '',
      resolution_date: ''
    })
  }

  const handleEscalateShipment = (shipment: Shipment) => {
    setEscalationFormData({
      date: new Date().toISOString().split('T')[0],
      shipment_id: shipment.id,
      customer_id: shipment.receiver?.id || shipment.sender?.id || '',
      customer_name: shipment.receiver_name || shipment.sender_name || '',
      escalation_type: 'DELAY',
      priority: 'HIGH',
      complaint_summary: `Escalation issue logged for shipment tracking ID: ${shipment.tracking_id}`,
      status: 'OPEN',
      internal: '',
      escalation_to_id: '',
      resolution: '',
      resolution_date: ''
    })
    setIsDetailDrawerOpen(false)
    setIsEscalationModalOpen(true)
  }


  // 2. Fetch Contacts for Sender / Receiver / Partner selection
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-select'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Contact[] }>('/contacts/?limit=100')
      return response.data?.items || []
    }
  })

  // Filter partners (status === 'PARTNER')
  const partnersList = useMemo(() => {
    return contactsData?.filter(c => c.status === 'PARTNER') || []
  }, [contactsData])

  // 3. Fetch Staff Members for "Recorded By" dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users-select'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/accounts/')
      return response.data
    }
  })

  // Metrics summary calculations
  const metrics = useMemo(() => {
    const items = Array.isArray(shipmentsData) ? shipmentsData : []
    const total = items.length
    const inTransit = items.filter(s => s.shipment_status === 'IN_TRANSIT').length
    const delivered = items.filter(s => s.shipment_status === 'DELIVERED').length
    const totalRevenue = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    return { total, inTransit, delivered, totalRevenue }
  }, [shipmentsData])

  // Create Shipment Mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const formatted = {
        sender_id: payload.sender_id || null,
        sender_name: payload.sender_name || null,
        receiver_id: payload.receiver_id || null,
        receiver_name: payload.receiver_name,
        receiver_phone: payload.receiver_phone || null,
        receiver_email: payload.receiver_email || null,
        receiver_address: payload.receiver_address || null,
        date: payload.date || null,
        shipment_status: payload.shipment_status,
        payment_status: payload.payment_status,
        currency: payload.currency,
        conversion_rate: parseFloat(payload.conversion_rate) || 1.0,
        amount: parseFloat(payload.amount) || 0.0,
        invoice_number: payload.invoice_number || null,
        number_of_carton: parseInt(payload.number_of_carton) || 1,
        partner_id: payload.partner_id || null,
        partner_name: payload.partner_name || null,
        item_received: payload.item_received || null,
        items_shipped: payload.items_shipped || null,
        items_recieved: payload.items_recieved || null,
        weight_kg: parseFloat(payload.weight_kg) || 0.0,
        tracking_id: payload.tracking_id || null,
        value: parseFloat(payload.value) || 0.0,
        note: payload.note || null,
        recorded_by_id: payload.recorded_by_id || null
      }
      return apiClient.post('/shipments/', formatted)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      setIsModalOpen(false)
      setFormError('')
      resetForm()
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      let errMsg = 'Failed to create shipment'
      if (typeof detail === 'string') {
        errMsg = detail
      } else if (Array.isArray(detail)) {
        errMsg = detail.map((d: any) => {
          if (typeof d === 'string') return d
          const loc = Array.isArray(d?.loc) ? d.loc.filter((l: any) => l !== 'body').join('.') : ''
          const msg = d?.msg || JSON.stringify(d)
          return loc ? `${loc}: ${msg}` : msg
        }).join(', ')
      } else if (detail && typeof detail === 'object') {
        errMsg = JSON.stringify(detail)
      } else if (err?.message) {
        errMsg = err.message
      }
      setFormError(errMsg)
    }
  })

  const resetForm = () => {
    setFormData({
      sender_name: '',
      sender_id: '',
      receiver_name: '',
      receiver_id: '',
      receiver_phone: '',
      receiver_email: '',
      receiver_address: '',
      date: new Date().toISOString().split('T')[0],
      shipment_status: 'PENDING',
      payment_status: 'UNPAID',
      currency: 'NGN',
      conversion_rate: '1.0000',
      amount: '',
      invoice_number: '',
      number_of_carton: '1',
      partner_id: '',
      partner_name: '',
      item_received: '',
      items_shipped: '',
      items_recieved: '',
      weight_kg: '',
      tracking_id: '',
      value: '',
      note: '',
      recorded_by_id: ''
    })
    setActiveTab('shipment')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSenderSelect = (contactId: string) => {
    const contact = contactsData?.find(c => c.id === contactId)
    if (contact) {
      const fullName = [contact.first_name, contact.last_name === '.' ? '' : contact.last_name].filter(Boolean).join(' ')
      setFormData(prev => ({ ...prev, sender_id: contactId, sender_name: fullName }))
    } else {
      setFormData(prev => ({ ...prev, sender_id: '', sender_name: '' }))
    }
  }

  const handleReceiverSelect = (contactId: string) => {
    const contact = contactsData?.find(c => c.id === contactId)
    if (contact) {
      const fullName = [contact.first_name, contact.last_name === '.' ? '' : contact.last_name].filter(Boolean).join(' ')
      setFormData(prev => ({
        ...prev,
        receiver_id: contactId,
        receiver_name: fullName,
        receiver_phone: contact.phone || prev.receiver_phone,
        receiver_email: contact.email || prev.receiver_email,
        receiver_address: [contact.city, contact.state, contact.country].filter(Boolean).join(', ') || prev.receiver_address
      }))
    } else {
      setFormData(prev => ({ ...prev, receiver_id: '' }))
    }
  }

  const handlePartnerSelect = (partnerId: string) => {
    const partner = partnersList.find(p => p.id === partnerId)
    if (partner) {
      const fullName = [partner.first_name, partner.last_name === '.' ? '' : partner.last_name].filter(Boolean).join(' ')
      setFormData(prev => ({ ...prev, partner_id: partnerId, partner_name: fullName }))
    } else {
      setFormData(prev => ({ ...prev, partner_id: '', partner_name: '' }))
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.receiver_name.trim()) {
      setFormError('Receiver Name is required.')
      setActiveTab('shipment')
      return
    }
    createShipmentMutation.mutate(formData)
  }

  // Helper badge renderers
  const getEscalationPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20"><AlertOctagon className="h-3 w-3" /> URGENT</span>
      case 'HIGH':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="h-3 w-3" /> HIGH</span>
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">MEDIUM</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">LOW</span>
    }
  }

  const getEscalationStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><AlertCircle className="h-3 w-3" /> Open</span>
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><RefreshCw className="h-3 w-3" /> In Progress</span>
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Resolved</span>
      case 'CLOSED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700"><Check className="h-3 w-3" /> Closed</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">{status}</span>
    }
  }

  const getEscalationTypeLabel = (type: string) => {
    switch (type) {
      case 'DELAY': return 'Delay in Delivery'
      case 'DAMAGED_GOODS': return 'Damaged Goods'
      case 'MISSING_ITEM': return 'Missing Item'
      case 'BILLING_ISSUE': return 'Billing Issue'
      case 'CUSTOMS_HOLD': return 'Customs Hold'
      case 'WRONG_DELIVERY': return 'Wrong Delivery'
      default: return type || 'Other'
    }
  }

  const getStatusBadge = (status: string) => {

    switch (status) {
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20"><Truck className="h-3 w-3" /> In Transit</span>
      case 'DELIVERED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Delivered</span>
      case 'CUSTOMS_HOLD':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="h-3 w-3" /> Customs Hold</span>
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><X className="h-3 w-3" /> Cancelled</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700"><Clock className="h-3 w-3" /> Pending</span>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400">Paid</span>
      case 'PARTIALLY_PAID':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400">Partial</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400">Unpaid</span>
    }
  }

  // Table Columns Setup
  const columns = useMemo(() => [
    {
      accessorKey: 'tracking_id',
      header: 'Tracking ID / Invoice',
      cell: (info: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
            <Package className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{info.getValue() || 'TRK-PENDING'}</span>
          </div>
          {info.row.original.invoice_number && (
            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{info.row.original.invoice_number}</span>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'receiver',
      header: 'Receiver Information',
      cell: (info: any) => (
        <div className="space-y-1">
          <div className="font-semibold text-zinc-100 text-xs truncate">
            {info.row.original.receiver_name || 'N/A'}
          </div>
          {info.row.original.receiver_phone && (
            <div className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Phone className="h-3 w-3 text-zinc-500" />
              <span>{info.row.original.receiver_phone}</span>
            </div>
          )}
          {info.row.original.receiver_email && (
            <div className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 text-zinc-500" />
              <span>{info.row.original.receiver_email}</span>
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'shipment_status',
      header: 'Status',
      cell: (info: any) => getStatusBadge(info.getValue())
    },
    {
      id: 'amount',
      header: 'Amount & Currency',
      cell: (info: any) => {
        const amt = Number(info.row.original.amount) || 0
        const curr = info.row.original.currency || 'NGN'
        return (
          <div className="space-y-1">
            <div className="font-bold text-zinc-200 text-xs">
              {curr} {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div>{getPaymentBadge(info.row.original.payment_status)}</div>
          </div>
        )
      }
    },
    {
      id: 'packageDetails',
      header: 'Cartons & Weight',
      cell: (info: any) => (
        <div className="space-y-1 text-xs text-zinc-300">
          <div className="flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-emerald-400" />
            <span>{info.row.original.number_of_carton || 1} Carton(s)</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Weight: <span className="text-zinc-300 font-medium">{info.row.original.weight_kg || 0} kg</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'partner_name',
      header: 'Partner',
      cell: (info: any) => {
        const pName = info.getValue()
        if (!pName) return <span className="text-zinc-600 text-xs italic">-</span>
        return (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
            <Handshake className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{pName}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: (info: any) => {
        const val = info.getValue()
        if (!val) return <span className="text-xs text-zinc-400">-</span>
        const d = new Date(val)
        return (
          <span className="text-xs text-zinc-400">
            {isNaN(d.getTime()) ? '-' : d.toLocaleDateString()}
          </span>
        )
      }
    }
  ], [])

  const tableData = useMemo(() => (Array.isArray(shipmentsData) ? shipmentsData : []), [shipmentsData])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  // Escalation Columns Setup
  const escalationColumns = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: (info: any) => {
        const val = info.getValue()
        if (!val) return <span className="text-xs text-zinc-500">-</span>
        return <span className="text-xs text-zinc-300 font-medium">{val}</span>
      }
    },
    {
      id: 'shipment',
      header: 'Escalating For',
      cell: (info: any) => {
        const sh = info.row.original.shipment
        if (!sh) return <span className="text-xs text-zinc-500 italic">Unlinked Shipment</span>
        return (
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              <span>{sh.tracking_id}</span>
            </div>
            {sh.receiver_name && <div className="text-[11px] text-zinc-400">To: {sh.receiver_name}</div>}
          </div>
        )
      }
    },
    {
      id: 'customer',
      header: 'Customer / Partner',
      cell: (info: any) => {
        const cName = info.row.original.customer_name || (info.row.original.customer ? `${info.row.original.customer.first_name} ${info.row.original.customer.last_name || ''}` : 'N/A')
        return (
          <div className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <span className="truncate">{cName}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'escalation_type',
      header: 'Escalation Type',
      cell: (info: any) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium">
          <Tag className="h-3 w-3 text-amber-400" />
          {getEscalationTypeLabel(info.getValue())}
        </span>
      )
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: (info: any) => getEscalationPriorityBadge(info.getValue())
    },
    {
      accessorKey: 'complaint_summary',
      header: 'Complaint Summary',
      cell: (info: any) => (
        <p className="text-xs text-zinc-300 line-clamp-2 max-w-xs" title={info.getValue()}>
          {info.getValue()}
        </p>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info: any) => getEscalationStatusBadge(info.getValue())
    },
    {
      id: 'escalation_to',
      header: 'Escalated To',
      cell: (info: any) => {
        const admin = info.row.original.escalation_to
        if (!admin) return <span className="text-xs text-zinc-600 italic">Unassigned</span>
        return (
          <div className="flex items-center gap-1.5 text-xs text-indigo-300">
            <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
              {admin.first_name?.[0] || 'A'}
            </div>
            <span>{admin.first_name} {admin.last_name || ''}</span>
          </div>
        )
      }
    }
  ], [])

  const escalationTableData = useMemo(() => (Array.isArray(escalationsData) ? escalationsData : []), [escalationsData])

  const escalationTable = useReactTable({
    data: escalationTableData,
    columns: escalationColumns,
    getCoreRowModel: getCoreRowModel()
  })


  return (
    <div className="space-y-6">
      {/* Workspace Header & Navigation Tabs */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-400" />
            Shipment Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Create, track, escalate and resolve parcel shipments and customer complaints</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setWorkspaceTab('shipments')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                workspaceTab === 'shipments'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Package className="h-4 w-4" /> All Shipments
            </button>
            <button
              onClick={() => setWorkspaceTab('escalations')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                workspaceTab === 'escalations'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldAlert className="h-4 w-4" /> Escalations & Complaints
              {escalationMetrics.open > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-black">
                  {escalationMetrics.open}
                </span>
              )}
            </button>
          </div>

          {workspaceTab === 'shipments' ? (
            <button
              onClick={() => {
                resetForm()
                setFormError('')
                setIsModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Shipment
            </button>
          ) : (
            <button
              onClick={() => {
                resetEscalationForm()
                setEscalationFormError('')
                setIsEscalationModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Log Escalation
            </button>
          )}
        </div>
      </div>

      {workspaceTab === 'escalations' ? (
        <div className="space-y-6">
          {/* ESCALATIONS METRICS BANNER */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Total Escalations</span>
                <span className="text-2xl font-black text-white mt-1 block">{escalationMetrics.total}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Open / In Progress</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">{escalationMetrics.open}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Urgent / High Priority</span>
                <span className="text-2xl font-black text-red-400 mt-1 block">{escalationMetrics.urgent}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertOctagon className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Resolved Escalations</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{escalationMetrics.resolved}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* ESCALATION FILTER TOOLBAR */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search complaint, customer, tracking ID..."
                value={escalationSearchTerm}
                onChange={(e) => setEscalationSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 pl-10 pr-4 py-2 rounded-lg border border-zinc-900 focus:border-red-600 focus:outline-none text-sm text-zinc-200 placeholder-zinc-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Type Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 text-xs">
                <Tag className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400 font-medium">Type:</span>
                <select
                  value={escalationTypeFilter}
                  onChange={(e) => setEscalationTypeFilter(e.target.value)}
                  className="bg-transparent text-zinc-200 border-none outline-none focus:ring-0 cursor-pointer font-semibold"
                >
                  <option value="" className="bg-zinc-950">All Types</option>
                  <option value="DELAY" className="bg-zinc-950">Delay in Delivery</option>
                  <option value="DAMAGED_GOODS" className="bg-zinc-950">Damaged Goods</option>
                  <option value="MISSING_ITEM" className="bg-zinc-950">Missing Item</option>
                  <option value="BILLING_ISSUE" className="bg-zinc-950">Billing Issue</option>
                  <option value="CUSTOMS_HOLD" className="bg-zinc-950">Customs Hold</option>
                  <option value="WRONG_DELIVERY" className="bg-zinc-950">Wrong Delivery</option>
                  <option value="OTHER" className="bg-zinc-950">Other</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 text-xs">
                <AlertOctagon className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400 font-medium">Priority:</span>
                <select
                  value={escalationPriorityFilter}
                  onChange={(e) => setEscalationPriorityFilter(e.target.value)}
                  className="bg-transparent text-zinc-200 border-none outline-none focus:ring-0 cursor-pointer font-semibold"
                >
                  <option value="" className="bg-zinc-950">All Priorities</option>
                  <option value="URGENT" className="bg-zinc-950">Urgent</option>
                  <option value="HIGH" className="bg-zinc-950">High</option>
                  <option value="MEDIUM" className="bg-zinc-950">Medium</option>
                  <option value="LOW" className="bg-zinc-950">Low</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 text-xs">
                <Clock className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400 font-medium">Status:</span>
                <select
                  value={escalationStatusFilter}
                  onChange={(e) => setEscalationStatusFilter(e.target.value)}
                  className="bg-transparent text-zinc-200 border-none outline-none focus:ring-0 cursor-pointer font-semibold"
                >
                  <option value="" className="bg-zinc-950">All Statuses</option>
                  <option value="OPEN" className="bg-zinc-950">Open</option>
                  <option value="IN_PROGRESS" className="bg-zinc-950">In Progress</option>
                  <option value="RESOLVED" className="bg-zinc-950">Resolved</option>
                  <option value="CLOSED" className="bg-zinc-950">Closed</option>
                </select>
              </div>

              {(escalationSearchTerm || escalationTypeFilter || escalationPriorityFilter || escalationStatusFilter) && (
                <button
                  onClick={() => {
                    setEscalationSearchTerm('')
                    setEscalationTypeFilter('')
                    setEscalationPriorityFilter('')
                    setEscalationStatusFilter('')
                  }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* ESCALATIONS TABLE */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
            {isEscalationsLoading ? (
              <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-2">
                <div className="h-6 w-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
                <span className="text-xs">Loading shipment escalations...</span>
              </div>
            ) : isEscalationsError ? (
              <div className="py-20 text-center text-red-400 flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs">Failed to fetch shipment escalations.</span>
              </div>
            ) : escalationTableData.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                <ShieldAlert className="h-10 w-10 text-zinc-700" />
                <p className="text-semibold text-sm text-zinc-300">No shipment escalations recorded</p>
                <p className="text-xs text-zinc-500">Click "+ Log Escalation" to record a customer complaint or issue</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    {escalationTable.getHeaderGroups().map((hg: any) => (
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
                    {escalationTable.getRowModel().rows.map((row: any) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedEscalation(row.original)
                          setIsEscalationDrawerOpen(true)
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
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* METRICS CARDS BANNER */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Total Shipments</span>
                <span className="text-2xl font-black text-white mt-1 block">{metrics.total}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Package className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">In Transit</span>
                <span className="text-2xl font-black text-sky-400 mt-1 block">{metrics.inTransit}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Truck className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Delivered</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{metrics.delivered}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Total Revenue</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  NGN {metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="h-5 w-5" />
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
                placeholder="Search by Tracking ID, Receiver, Invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 pl-10 pr-4 py-2 rounded-lg border border-zinc-900 focus:border-emerald-600 focus:outline-none text-sm text-zinc-200 placeholder-zinc-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Shipment Status */}
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 text-xs">
                <Truck className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-zinc-200 border-none outline-none focus:ring-0 cursor-pointer font-semibold"
                >
                  <option value="" className="bg-zinc-950">All Statuses</option>
                  <option value="PENDING" className="bg-zinc-950">Pending</option>
                  <option value="IN_TRANSIT" className="bg-zinc-950">In Transit</option>
                  <option value="DELIVERED" className="bg-zinc-950">Delivered</option>
                  <option value="CUSTOMS_HOLD" className="bg-zinc-950">Customs Hold</option>
                  <option value="CANCELLED" className="bg-zinc-950">Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900 text-xs">
                <DollarSign className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400 font-medium">Payment:</span>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-transparent text-zinc-200 border-none outline-none focus:ring-0 cursor-pointer font-semibold"
                >
                  <option value="" className="bg-zinc-950">All Payments</option>
                  <option value="UNPAID" className="bg-zinc-950">Unpaid</option>
                  <option value="PARTIALLY_PAID" className="bg-zinc-950">Partially Paid</option>
                  <option value="PAID" className="bg-zinc-950">Paid</option>
                </select>
              </div>

              {(searchTerm || statusFilter || paymentFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                    setPaymentFilter('')
                  }}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* SHIPMENTS TABLE */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-2">
                <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                <span className="text-xs">Loading shipments directory...</span>
              </div>
            ) : isError ? (
              <div className="py-20 text-center text-red-400 flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs">Failed to fetch shipments. Please check backend API.</span>
              </div>
            ) : tableData.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                <Truck className="h-10 w-10 text-zinc-700" />
                <p className="text-semibold text-sm text-zinc-300">No shipments found</p>
                <p className="text-xs text-zinc-500">Click "+ Create Shipment" to register a new shipment</p>
              </div>
            ) : (
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
                          setSelectedShipment(row.original)
                          setIsDetailDrawerOpen(true)
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
            )}
          </div>
        </div>
      )}


      {/* CREATE SHIPMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/75 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-md font-bold text-white">Create New Shipment</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-zinc-900 bg-zinc-950 px-6 pt-2 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('shipment')}
                className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'shipment'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="h-4 w-4" /> 1. Shipment Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('package')}
                className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'package'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Package className="h-4 w-4" /> 2. Package Details
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[75vh]">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* TAB 1: SHIPMENT DETAILS */}
              {activeTab === 'shipment' && (
                <div className="space-y-4">
                  {/* Sender & Receiver Selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-400" /> Sender Name / Contact
                      </label>
                      <select
                        value={formData.sender_id}
                        onChange={(e) => handleSenderSelect(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer mb-1"
                      >
                        <option value="" className="bg-zinc-950">Select existing contact as sender...</option>
                        {contactsData?.map(c => (
                          <option key={c.id} value={c.id} className="bg-zinc-950">
                            {c.first_name} {c.last_name === '.' ? '' : c.last_name} ({c.email})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="sender_name"
                        value={formData.sender_name}
                        onChange={handleInputChange}
                        placeholder="Or enter custom sender name..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5 text-emerald-400" /> Receiver Name / Contact *
                      </label>
                      <select
                        value={formData.receiver_id}
                        onChange={(e) => handleReceiverSelect(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer mb-1"
                      >
                        <option value="" className="bg-zinc-950">Select existing contact as receiver...</option>
                        {contactsData?.map(c => (
                          <option key={c.id} value={c.id} className="bg-zinc-950">
                            {c.first_name} {c.last_name === '.' ? '' : c.last_name} ({c.email})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="receiver_name"
                        value={formData.receiver_name}
                        onChange={handleInputChange}
                        placeholder="Enter Receiver Full Name *"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Receiver Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" /> Receiver Phone
                      </label>
                      <input
                        type="text"
                        name="receiver_phone"
                        value={formData.receiver_phone}
                        onChange={handleInputChange}
                        placeholder="+234 801 234 5678"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-zinc-400" /> Receiver Email
                      </label>
                      <input
                        type="email"
                        name="receiver_email"
                        value={formData.receiver_email}
                        onChange={handleInputChange}
                        placeholder="receiver@email.com"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Receiver Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Receiver Address
                    </label>
                    <textarea
                      name="receiver_address"
                      value={formData.receiver_address}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Street address, City, State, Country..."
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                    />
                  </div>

                  {/* Date & Shipment Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-emerald-400" /> Shipment Status
                      </label>
                      <select
                        name="shipment_status"
                        value={formData.shipment_status}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                      >
                        <option value="PENDING" className="bg-zinc-950">Pending</option>
                        <option value="IN_TRANSIT" className="bg-zinc-950">In Transit</option>
                        <option value="DELIVERED" className="bg-zinc-950">Delivered</option>
                        <option value="CUSTOMS_HOLD" className="bg-zinc-950">Customs Hold</option>
                        <option value="CANCELLED" className="bg-zinc-950">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Currency, Conversion Rate & Amount */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Currency</label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                      >
                        <option value="NGN" className="bg-zinc-950">NGN (₦)</option>
                        <option value="USD" className="bg-zinc-950">USD ($)</option>
                        <option value="GBP" className="bg-zinc-950">GBP (£)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Conversion Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        name="conversion_rate"
                        value={formData.conversion_rate}
                        onChange={handleInputChange}
                        placeholder="1.0000"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Shipment Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Cartons, Payment Status, Invoice # & Partner */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Number of Cartons</label>
                      <input
                        type="number"
                        name="number_of_carton"
                        value={formData.number_of_carton}
                        onChange={handleInputChange}
                        placeholder="1"
                        min="1"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Payment Status</label>
                      <select
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                      >
                        <option value="UNPAID" className="bg-zinc-950">Unpaid</option>
                        <option value="PARTIALLY_PAID" className="bg-zinc-950">Partially Paid</option>
                        <option value="PAID" className="bg-zinc-950">Paid</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Invoice Number</label>
                      <input
                        type="text"
                        name="invoice_number"
                        value={formData.invoice_number}
                        onChange={handleInputChange}
                        placeholder="e.g. INV-SHIP-1001 (Auto if blank)"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Handshake className="h-3.5 w-3.5 text-indigo-400" /> Partner Assignment
                      </label>
                      <select
                        value={formData.partner_id}
                        onChange={(e) => handlePartnerSelect(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                      >
                        <option value="" className="bg-zinc-950">Select Partner (Optional)</option>
                        {partnersList.map(p => (
                          <option key={p.id} value={p.id} className="bg-zinc-950">
                            {p.first_name} {p.last_name === '.' ? '' : p.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PACKAGE DETAILS */}
              {activeTab === 'package' && (
                <div className="space-y-4">
                  {/* Items Received & Items Shipped */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Item Received</label>
                      <textarea
                        name="item_received"
                        value={formData.item_received}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="List items received at warehouse..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Items Shipped</label>
                      <textarea
                        name="items_shipped"
                        value={formData.items_shipped}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="List items shipped in transit..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Items Received at Destination & Tracking ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Items Recieved (At Destination)</label>
                      <textarea
                        name="items_recieved"
                        value={formData.items_recieved}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="List items verified upon arrival..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-emerald-400" /> Tracking ID
                      </label>
                      <input
                        type="text"
                        name="tracking_id"
                        value={formData.tracking_id}
                        onChange={handleInputChange}
                        placeholder="e.g. TRK-20260905-1001 (Auto if blank)"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Weight (kg), Declared Value & Recorded By */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="weight_kg"
                        value={formData.weight_kg}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold">Declared Value</label>
                      <input
                        type="number"
                        step="0.01"
                        name="value"
                        value={formData.value}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-400" /> Recorded By (Staff)
                      </label>
                      <select
                        name="recorded_by_id"
                        value={formData.recorded_by_id}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                      >
                        <option value="" className="bg-zinc-950">Select Staff Member</option>
                        {usersData?.map(u => (
                          <option key={u.id} value={u.id} className="bg-zinc-950">
                            {u.first_name} {u.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Special Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-300 font-semibold">Special Note</label>
                    <textarea
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Add any special handling instructions or notes..."
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-zinc-900 flex justify-between items-center">
                {activeTab === 'shipment' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('package')}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Next: Package Details <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('shipment')}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back to Shipment Details
                  </button>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createShipmentMutation.isPending}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {createShipmentMutation.isPending && (
                      <span className="h-3.5 w-3.5 rounded-full border border-white border-t-transparent animate-spin"></span>
                    )}
                    Save Shipment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER FOR VIEWING SHIPMENT */}
      {isDetailDrawerOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 flex justify-end backdrop-blur-sm bg-black/60">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-md h-full p-6 overflow-y-auto space-y-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-white">Shipment Details</h3>
              </div>
              <button
                onClick={() => {
                  setIsDetailDrawerOpen(false)
                  setSelectedShipment(null)
                }}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1 text-sm text-zinc-300">
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tracking ID</span>
                  <span className="font-bold text-emerald-400 text-sm">{selectedShipment.tracking_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Invoice Number</span>
                  <span className="font-mono text-zinc-200 text-xs">{selectedShipment.invoice_number || '-'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Shipment Status</span>
                  {getStatusBadge(selectedShipment.shipment_status)}
                </div>
              </div>

              {/* Quick Escalate Action */}
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Report issue or customer complaint?</span>
                </div>
                <button
                  onClick={() => handleEscalateShipment(selectedShipment)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Escalate
                </button>
              </div>

              {/* Receiver & Sender */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Receiver Info</h4>
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 space-y-1 text-xs">
                  <p className="font-semibold text-white">{selectedShipment.receiver_name || 'N/A'}</p>
                  <p className="text-zinc-400">{selectedShipment.receiver_phone || 'No phone'}</p>
                  <p className="text-zinc-400">{selectedShipment.receiver_email || 'No email'}</p>
                  <p className="text-zinc-400 italic pt-1">{selectedShipment.receiver_address || 'No address'}</p>
                </div>
              </div>

              {/* Package & Financial Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Financial & Package Info</h4>
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Amount:</span>
                    <span className="font-bold text-white">
                      {selectedShipment.currency} {Number(selectedShipment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Conversion Rate:</span>
                    <span className="text-zinc-300 font-mono">{selectedShipment.conversion_rate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Cartons & Weight:</span>
                    <span className="text-zinc-300">{selectedShipment.number_of_carton} Carton(s) / {selectedShipment.weight_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Declared Value:</span>
                    <span className="text-zinc-300">{selectedShipment.currency} {selectedShipment.value}</span>
                  </div>
                </div>
              </div>

              {/* Package Items & Notes */}
              {(selectedShipment.item_received || selectedShipment.items_shipped || selectedShipment.note) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Package Notes & Items</h4>
                  <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 space-y-2 text-xs">
                    {selectedShipment.item_received && (
                      <div>
                        <span className="text-zinc-500 block">Item Received:</span>
                        <p className="text-zinc-300">{selectedShipment.item_received}</p>
                      </div>
                    )}
                    {selectedShipment.items_shipped && (
                      <div>
                        <span className="text-zinc-500 block">Items Shipped:</span>
                        <p className="text-zinc-300">{selectedShipment.items_shipped}</p>
                      </div>
                    )}
                    {selectedShipment.note && (
                      <div>
                        <span className="text-zinc-500 block">Note:</span>
                        <p className="text-zinc-300 italic">{selectedShipment.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE SHIPMENT ESCALATION MODAL */}
      {isEscalationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/75 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h3 className="text-md font-bold text-white">Log Shipment Escalation</h3>
              </div>
              <button
                onClick={() => setIsEscalationModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!escalationFormData.complaint_summary.trim()) {
                  setEscalationFormError('Complaint Summary is required.')
                  return
                }
                createEscalationMutation.mutate(escalationFormData)
              }}
              className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[75vh]"
            >
              {escalationFormError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{escalationFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Date */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Date
                  </label>
                  <input
                    type="date"
                    value={escalationFormData.date}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200"
                  />
                </div>

                {/* 2. Escalating For (Shipment) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 text-zinc-400" /> Escalating For (Shipment)
                  </label>
                  <select
                    value={escalationFormData.shipment_id}
                    onChange={(e) => {
                      const selectedSh = shipmentsData?.find(s => s.id === e.target.value)
                      setEscalationFormData(prev => ({
                        ...prev,
                        shipment_id: e.target.value,
                        customer_name: selectedSh?.receiver_name || prev.customer_name
                      }))
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Select Shipment (Tracking ID)</option>
                    {shipmentsData?.map(s => (
                      <option key={s.id} value={s.id} className="bg-zinc-950">
                        {s.tracking_id} - {s.receiver_name || 'No Receiver'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Customer Name / Partner */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5 text-zinc-400" /> Customer Name (Contact Partner)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={escalationFormData.customer_id}
                      onChange={(e) => {
                        const contact = contactsData?.find(c => c.id === e.target.value)
                        const name = contact ? [contact.first_name, contact.last_name === '.' ? '' : contact.last_name].filter(Boolean).join(' ') : ''
                        setEscalationFormData(prev => ({
                          ...prev,
                          customer_id: e.target.value,
                          customer_name: name || prev.customer_name
                        }))
                      }}
                      className="bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                    >
                      <option value="" className="bg-zinc-950">Select Existing Contact</option>
                      {contactsData?.map(c => (
                        <option key={c.id} value={c.id} className="bg-zinc-950">
                          {c.first_name} {c.last_name === '.' ? '' : c.last_name} ({c.phone || c.email || 'Contact'})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Or type customer name..."
                      value={escalationFormData.customer_name}
                      onChange={(e) => setEscalationFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                    />
                  </div>
                </div>

                {/* 4. Escalation Type */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-zinc-400" /> Escalation Type
                  </label>
                  <select
                    value={escalationFormData.escalation_type}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, escalation_type: e.target.value as EscalationType }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                  >
                    <option value="DELAY" className="bg-zinc-950">Delay in Delivery</option>
                    <option value="DAMAGED_GOODS" className="bg-zinc-950">Damaged Goods</option>
                    <option value="MISSING_ITEM" className="bg-zinc-950">Missing Item</option>
                    <option value="BILLING_ISSUE" className="bg-zinc-950">Billing Issue</option>
                    <option value="CUSTOMS_HOLD" className="bg-zinc-950">Customs Hold</option>
                    <option value="WRONG_DELIVERY" className="bg-zinc-950">Wrong Delivery</option>
                    <option value="OTHER" className="bg-zinc-950">Other</option>
                  </select>
                </div>

                {/* 5. Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <AlertOctagon className="h-3.5 w-3.5 text-zinc-400" /> Priority
                  </label>
                  <select
                    value={escalationFormData.priority}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, priority: e.target.value as EscalationPriority }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                  >
                    <option value="LOW" className="bg-zinc-950">Low</option>
                    <option value="MEDIUM" className="bg-zinc-950">Medium</option>
                    <option value="HIGH" className="bg-zinc-950">High</option>
                    <option value="URGENT" className="bg-zinc-950">Urgent</option>
                  </select>
                </div>

                {/* 6. Complaint Summary */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-400" /> Complaint Summary <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details of the customer complaint or shipment issue..."
                    value={escalationFormData.complaint_summary}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, complaint_summary: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                </div>

                {/* 7. Status */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" /> Status
                  </label>
                  <select
                    value={escalationFormData.status}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, status: e.target.value as EscalationStatus }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                  >
                    <option value="OPEN" className="bg-zinc-950">Open</option>
                    <option value="IN_PROGRESS" className="bg-zinc-950">In Progress</option>
                    <option value="RESOLVED" className="bg-zinc-950">Resolved</option>
                    <option value="CLOSED" className="bg-zinc-950">Closed</option>
                  </select>
                </div>

                {/* 8. Escalation To (Admins/Staff) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-zinc-400" /> Escalation To (Admin / Staff)
                  </label>
                  <select
                    value={escalationFormData.escalation_to_id}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, escalation_to_id: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-950">Select Admin/Staff Member</option>
                    {usersData?.map(u => (
                      <option key={u.id} value={u.id} className="bg-zinc-950">
                        {u.first_name} {u.last_name} ({u.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 9. Internal Notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-300 font-semibold">Internal Team Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Internal team discussions or notes (not shared with customer)..."
                    value={escalationFormData.internal}
                    onChange={(e) => setEscalationFormData(prev => ({ ...prev, internal: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                </div>

                {/* 10 & 11. Resolution & Resolution Date */}
                <div className="space-y-1.5 sm:col-span-2 border-t border-zinc-900 pt-3">
                  <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Resolution Details & Resolution Date
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <textarea
                      rows={2}
                      placeholder="Resolution details or steps taken..."
                      value={escalationFormData.resolution}
                      onChange={(e) => setEscalationFormData(prev => ({ ...prev, resolution: e.target.value }))}
                      className="sm:col-span-2 bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200 placeholder-zinc-600"
                    />
                    <input
                      type="date"
                      value={escalationFormData.resolution_date}
                      onChange={(e) => setEscalationFormData(prev => ({ ...prev, resolution_date: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-2.5 text-sm text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEscalationModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEscalationMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {createEscalationMutation.isPending && (
                    <span className="h-3.5 w-3.5 rounded-full border border-white border-t-transparent animate-spin"></span>
                  )}
                  Save Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER FOR VIEWING / UPDATING ESCALATION */}
      {isEscalationDrawerOpen && selectedEscalation && (
        <div className="fixed inset-0 z-50 flex justify-end backdrop-blur-sm bg-black/60">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-lg h-full p-6 overflow-y-auto space-y-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h3 className="font-bold text-lg text-white">Escalation Details</h3>
              </div>
              <button
                onClick={() => {
                  setIsEscalationDrawerOpen(false)
                  setSelectedEscalation(null)
                }}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 flex-1 text-sm text-zinc-300">
              {/* Badges Overview */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Incident Date</span>
                  <span className="text-xs text-zinc-300 font-medium">{selectedEscalation.date || 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Priority & Type</span>
                  <div className="flex items-center gap-2">
                    {getEscalationPriorityBadge(selectedEscalation.priority)}
                    <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                      {getEscalationTypeLabel(selectedEscalation.escalation_type)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Current Status</span>
                  {getEscalationStatusBadge(selectedEscalation.status)}
                </div>
              </div>

              {/* Linked Shipment & Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 space-y-1 text-xs">
                  <span className="text-zinc-500 font-semibold block">Escalating For</span>
                  {selectedEscalation.shipment ? (
                    <div>
                      <p className="font-bold text-emerald-400">{selectedEscalation.shipment.tracking_id}</p>
                      <p className="text-zinc-400">{selectedEscalation.shipment.receiver_name || 'Receiver N/A'}</p>
                    </div>
                  ) : (
                    <p className="text-zinc-500 italic">No shipment linked</p>
                  )}
                </div>

                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 space-y-1 text-xs">
                  <span className="text-zinc-500 font-semibold block">Customer Contact</span>
                  <p className="font-bold text-white">{selectedEscalation.customer_name || 'N/A'}</p>
                </div>
              </div>

              {/* Complaint Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Complaint Summary</h4>
                <div className="bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {selectedEscalation.complaint_summary}
                </div>
              </div>

              {/* Update Status & Assigned Admin */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Manage Escalation</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-semibold">Change Status</label>
                    <select
                      value={selectedEscalation.status}
                      onChange={(e) => {
                        const newStatus = e.target.value
                        updateEscalationMutation.mutate({
                          id: selectedEscalation.id,
                          data: { status: newStatus }
                        })
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 cursor-pointer"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-semibold">Assign Admin</label>
                    <select
                      value={selectedEscalation.escalation_to?.id || ''}
                      onChange={(e) => {
                        updateEscalationMutation.mutate({
                          id: selectedEscalation.id,
                          data: { escalation_to_id: e.target.value || null }
                        })
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {usersData?.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Resolution & Resolution Date */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Resolution Details
                </h4>
                <textarea
                  rows={3}
                  placeholder="Record resolution notes..."
                  defaultValue={selectedEscalation.resolution || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedEscalation.resolution || '')) {
                      updateEscalationMutation.mutate({
                        id: selectedEscalation.id,
                        data: { resolution: e.target.value }
                      })
                    }
                  }}
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600"
                />
                {selectedEscalation.resolution_date && (
                  <p className="text-[11px] text-zinc-500 text-right">
                    Resolved on: <span className="text-zinc-300 font-medium">{selectedEscalation.resolution_date}</span>
                  </p>
                )}
              </div>

              {/* Internal Notes */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Internal Notes</h4>
                <textarea
                  rows={2}
                  placeholder="Add internal notes..."
                  defaultValue={selectedEscalation.internal || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedEscalation.internal || '')) {
                      updateEscalationMutation.mutate({
                        id: selectedEscalation.id,
                        data: { internal: e.target.value }
                      })
                    }
                  }}
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600"
                />
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-zinc-900 flex justify-between items-center">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this escalation record?')) {
                      deleteEscalationMutation.mutate(selectedEscalation.id)
                    }
                  }}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Record
                </button>

                <button
                  onClick={() => {
                    setIsEscalationDrawerOpen(false)
                    setSelectedEscalation(null)
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

