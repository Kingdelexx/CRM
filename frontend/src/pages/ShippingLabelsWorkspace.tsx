import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Shipment } from '@/types/crm'
import {
  Printer,
  Search,
  Filter,
  Layers,
  Truck,
  Calendar,
  User,
  MapPin,
  ExternalLink,
  CheckSquare,
  Square,
  RefreshCw,
  Tag,
  Building,
  Plane,
  Anchor,
  FileText,
  Sliders,
  ChevronDown
} from 'lucide-react'
import {
  ShipmentThermalLabelModal
} from '@/components/ShipmentThermalLabelModal'
import {
  getShipmentTrackingNumber,
  getShipmentTotalParcels,
  getShipmentBrandName,
  formatShipmentDate
} from '@/components/ShipmentThermalLabel'

export default function ShippingLabelsWorkspace() {
  const [searchTerm, setSearchTerm] = useState('')
  const [shippingTypeFilter, setShippingTypeFilter] = useState<'ALL' | 'AIR' | 'SEA'>('ALL')
  const [partnerFilter, setPartnerFilter] = useState<'ALL' | 'DIRECT' | 'PARTNER'>('ALL')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set())

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalShipments, setModalShipments] = useState<Shipment[]>([])
  const [modalAutoPrint, setModalAutoPrint] = useState(false)

  // Fetch Shipments
  const { data: shipmentsData = [], isLoading, isFetching, refetch } = useQuery<Shipment[]>({
    queryKey: ['shipments', 'labels-workspace'],
    queryFn: async () => {
      const res = await apiClient.get<Shipment[]>('/shipments/')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipmentsData.filter(s => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const trk = getShipmentTrackingNumber(s).toLowerCase()
        const rec = (s.receiver_name || '').toLowerCase()
        const addr = (s.receiver_address || '').toLowerCase()
        const inv = (s.invoice_number || '').toLowerCase()
        const pName = (s.partner_name || '').toLowerCase()
        const sender = (s.sender_name || '').toLowerCase()
        const match =
          trk.includes(term) ||
          rec.includes(term) ||
          addr.includes(term) ||
          inv.includes(term) ||
          pName.includes(term) ||
          sender.includes(term)
        if (!match) return false
      }

      // Shipping Type
      if (shippingTypeFilter !== 'ALL' && s.shipping_type !== shippingTypeFilter) {
        return false
      }

      // Partner / Direct
      if (partnerFilter === 'DIRECT') {
        const { isPartner } = getShipmentBrandName(s)
        if (isPartner) return false
      } else if (partnerFilter === 'PARTNER') {
        const { isPartner } = getShipmentBrandName(s)
        if (!isPartner) return false
      }

      // Date
      if (dateFilter) {
        const sDate = s.shipment_date || s.date || ''
        if (!sDate.startsWith(dateFilter)) return false
      }

      return true
    })
  }, [shipmentsData, searchTerm, shippingTypeFilter, partnerFilter, dateFilter])

  // Aggregate stats
  const totalParcelsCount = useMemo(() => {
    return filteredShipments.reduce((acc, s) => acc + getShipmentTotalParcels(s), 0)
  }, [filteredShipments])

  const selectedParcelsCount = useMemo(() => {
    return shipmentsData
      .filter(s => selectedShipmentIds.has(s.id))
      .reduce((acc, s) => acc + getShipmentTotalParcels(s), 0)
  }, [shipmentsData, selectedShipmentIds])

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedShipmentIds.size === filteredShipments.length) {
      setSelectedShipmentIds(new Set())
    } else {
      setSelectedShipmentIds(new Set(filteredShipments.map(s => s.id)))
    }
  }

  const handleToggleSelectOne = (id: string) => {
    setSelectedShipmentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Open single shipment label modal
  const handleOpenSingleLabel = (shipment: Shipment, autoPrint = false) => {
    setModalShipments([shipment])
    setModalAutoPrint(autoPrint)
    setIsModalOpen(true)
  }

  // Open batch modal for selected shipments
  const handleOpenBatchLabels = (autoPrint = false) => {
    const selected = shipmentsData.filter(s => selectedShipmentIds.has(s.id))
    if (selected.length === 0) return
    setModalShipments(selected)
    setModalAutoPrint(autoPrint)
    setIsModalOpen(true)
  }

  // Open batch modal for all currently filtered shipments
  const handleOpenAllFilteredLabels = (autoPrint = false) => {
    if (filteredShipments.length === 0) return
    setModalShipments(filteredShipments)
    setModalAutoPrint(autoPrint)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Shipping Labels & Thermal Printing
              </h1>
              <p className="text-xs text-slate-500">
                144mm × 100mm landscape thermal format with automatic multi-parcel pagination (1/N ... N/N) and tracking QR codes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh shipment list"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {selectedShipmentIds.size > 0 && (
            <button
              type="button"
              onClick={() => handleOpenBatchLabels(false)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Selected ({selectedShipmentIds.size} shipments, {selectedParcelsCount} parcels)</span>
            </button>
          )}

          {filteredShipments.length > 0 && selectedShipmentIds.size === 0 && (
            <button
              type="button"
              onClick={() => handleOpenAllFilteredLabels(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-amber-400" />
              <span>Print All Filtered ({filteredShipments.length} shipments, {totalParcelsCount} labels)</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Shipments</p>
            <h4 className="text-xl font-black text-slate-900">{filteredShipments.length}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Parcels</p>
            <h4 className="text-xl font-black text-slate-900">{totalParcelsCount}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Direct Mintana</p>
            <h4 className="text-xl font-black text-slate-900">
              {filteredShipments.filter(s => !getShipmentBrandName(s).isPartner).length}
            </h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Partner Brand</p>
            <h4 className="text-xl font-black text-slate-900">
              {filteredShipments.filter(s => getShipmentBrandName(s).isPartner).length}
            </h4>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by receiver name, tracking ID, invoice #, partner name, address..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white focus:outline-none rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Shipping Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setShippingTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                shippingTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setShippingTypeFilter('AIR')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                shippingTypeFilter === 'AIR'
                  ? 'bg-white text-purple-700 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plane className="h-3.5 w-3.5 text-purple-600" /> Air
            </button>
            <button
              type="button"
              onClick={() => setShippingTypeFilter('SEA')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                shippingTypeFilter === 'SEA'
                  ? 'bg-white text-cyan-700 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Anchor className="h-3.5 w-3.5 text-cyan-600" /> Sea
            </button>
          </div>

          {/* Partner vs Direct Filter */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Brands (Mintana & Partners)</option>
            <option value="DIRECT">Direct Mintana Only</option>
            <option value="PARTNER">Partner Consignments Only</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
            title="Filter by shipment date"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-1"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Shipments List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Controls */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              {selectedShipmentIds.size > 0 && selectedShipmentIds.size === filteredShipments.length ? (
                <CheckSquare className="h-4 w-4 text-amber-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>Select All ({filteredShipments.length})</span>
            </button>
          </div>

          {selectedShipmentIds.size > 0 && (
            <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {selectedShipmentIds.size} selected ({selectedParcelsCount} labels ready)
            </span>
          )}
        </div>

        {/* Content Rows */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
            <p className="text-xs font-semibold">Loading shipments for label generation...</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Layers className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No shipments found</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or create a new shipment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredShipments.map((s) => {
              const isSelected = selectedShipmentIds.has(s.id)
              const trk = getShipmentTrackingNumber(s)
              const parcels = getShipmentTotalParcels(s)
              const { isPartner, brandName } = getShipmentBrandName(s)
              const formattedDate = formatShipmentDate(s.shipment_date || s.date)

              return (
                <div
                  key={s.id}
                  className={`p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Left: Checkbox & Receiver/Tracking details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectOne(s.id)}
                      className="mt-1 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-300" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {s.receiver_name || 'Valued Client'}
                        </span>

                        {/* Partner vs Mintana badge */}
                        {isPartner ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            Partner: {brandName}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Mintana Direct
                          </span>
                        )}

                        {/* Shipping Type */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          {s.shipping_type === 'SEA' ? (
                            <>
                              <Anchor className="h-3 w-3 text-cyan-600" /> Sea Freight
                            </>
                          ) : (
                            <>
                              <Plane className="h-3 w-3 text-purple-600" /> Air Freight
                            </>
                          )}
                        </span>
                      </div>

                      {/* Destination Address */}
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate max-w-xl">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{s.receiver_address || 'No address specified'}</span>
                      </p>

                      {/* Meta: Tracking, Invoice, Date */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                        <span className="text-slate-600 font-bold">
                          Tracking: <span className="text-indigo-600">{trk}</span>
                        </span>
                        {s.invoice_number && (
                          <span>Inv: {s.invoice_number}</span>
                        )}
                        <span>Date: {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Parcel Count Badge & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Multi-parcel badge */}
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs shadow-sm">
                        <Layers className="h-3.5 w-3.5 text-amber-400" />
                        <span>{parcels} {parcels === 1 ? 'Parcel' : 'Parcels'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {parcels === 1 ? 'Page 1/1' : `Pages 1/${parcels} .. ${parcels}/${parcels}`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSingleLabel(s, false)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-slate-700 hover:text-amber-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Preview & print shipping labels"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                        <span>Preview Labels</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSingleLabel(s, true)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-all cursor-pointer shadow-sm"
                        title={`Quick print all ${parcels} label(s)`}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Shipping Thermal Labels Modal */}
      <ShipmentThermalLabelModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setModalShipments([])
        }}
        shipments={modalShipments}
        autoPrint={modalAutoPrint}
      />
    </div>
  )
}
