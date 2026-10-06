import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  Building2,
  ShieldCheck
} from 'lucide-react'
import { apiClient } from '@/api/client'
import type { PublicTrackingResponse, TrackingTimelineEvent } from '@/types/tracking'

// Defined 5 Milestone Stages
const MILESTONE_STAGES = [
  { id: 'ORDER_CREATED', label: 'Order Confirmed', description: 'Shipment booked & processed' },
  { id: 'RECEIVED_AT_HUB', label: 'Sorting Facility', description: 'Received at origin hub' },
  { id: 'IN_TRANSIT', label: 'In Transit', description: 'Dispatched & in flight/transit' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'Driver assigned for delivery' },
  { id: 'DELIVERED', label: 'Delivered', description: 'Package handed to recipient' },
]

export default function PublicTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [inputInvoice, setInputInvoice] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [trackingData, setTrackingData] = useState<PublicTrackingResponse | null>(null)

  // Sync with URL query parameter on mount or URL change
  useEffect(() => {
    const invFromUrl = searchParams.get('invoice') || searchParams.get('invoiceNumber') || searchParams.get('code') || ''
    if (invFromUrl) {
      const sanitized = invFromUrl.trim().toUpperCase()
      setInputInvoice(sanitized)
      fetchTracking(sanitized)
    }
  }, [searchParams])

  const fetchTracking = async (invCode: string) => {
    const cleanInv = invCode.trim().toUpperCase()
    if (!cleanInv) {
      setError('Please enter a valid Invoice Number or Tracking ID.')
      setTrackingData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<PublicTrackingResponse>('/tracking', {
        params: { invoice: cleanInv }
      })
      setTrackingData(response.data)
      // Update URL query search param
      setSearchParams({ invoice: cleanInv }, { replace: true })
    } catch (err: any) {
      console.error('Failed to fetch tracking data:', err)
      setTrackingData(null)
      if (err.status === 404 || err.response?.status === 404) {
        setError(`No shipment found matching invoice number "${cleanInv}". Please verify the number on your receipt or confirmation email.`)
      } else if (err.status === 429 || err.response?.status === 429) {
        setError('Rate limit exceeded. Please wait a minute before trying again.')
      } else {
        setError(err.message || 'Unable to retrieve tracking details. Please check your internet connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputInvoice.trim()) {
      fetchTracking(inputInvoice)
    }
  }

  // Calculate current stage index for the stepper
  const getStageIndex = (status: string) => {
    const uppercaseStatus = (status || '').toUpperCase()
    if (uppercaseStatus === 'DELIVERED') return 4
    if (uppercaseStatus === 'OUT_FOR_DELIVERY') return 3
    if (uppercaseStatus === 'IN_TRANSIT') return 2
    if (uppercaseStatus === 'RECEIVED_AT_HUB') return 1
    return 0 // ORDER_CREATED or fallback
  }

  const activeStageIndex = trackingData ? getStageIndex(trackingData.status) : 0
  const isExceptionState = trackingData ? ['ON_HOLD', 'CUSTOMS_HOLD', 'CANCELLED'].includes(trackingData.status.toUpperCase()) : false

  // Dynamic status badge styling
  const getStatusBadge = (status: string) => {
    const upper = (status || '').toUpperCase()
    switch (upper) {
      case 'DELIVERED':
        return {
          label: 'Delivered',
          bgColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          dotColor: 'bg-emerald-400'
        }
      case 'IN_TRANSIT':
        return {
          label: 'In Transit',
          bgColor: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
          dotColor: 'bg-sky-400'
        }
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'Out for Delivery',
          bgColor: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
          dotColor: 'bg-indigo-400'
        }
      case 'ON_HOLD':
      case 'CUSTOMS_HOLD':
        return {
          label: 'On Hold (Customs/Verification)',
          bgColor: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          dotColor: 'bg-amber-400'
        }
      case 'CANCELLED':
        return {
          label: 'Shipment Cancelled',
          bgColor: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          dotColor: 'bg-rose-400'
        }
      default:
        return {
          label: 'Order Confirmed',
          bgColor: 'bg-slate-700/40 border-slate-600/40 text-slate-300',
          dotColor: 'bg-slate-400'
        }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Go to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Mintana CRM</h1>
              <p className="text-xs text-slate-400">Public Package Tracking Portal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Staff Login
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* Hero & Search Input Section */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real-Time Logistics Tracking</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Track Your Shipment
            </h2>
            <p className="text-sm text-slate-400">
              Enter your invoice number (e.g. <code className="text-indigo-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">INV-2026-001</code>) to view current status and milestone timeline.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={inputInvoice}
                onChange={(e) => setInputInvoice(e.target.value.toUpperCase())}
                placeholder="Enter Invoice Number (e.g. INV-2026-001)"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputInvoice.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Package</span>
                </>
              )}
            </button>
          </form>

          {/* User-Friendly Error Container */}
          {error && (
            <div className="max-w-xl mx-auto mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-300">Shipment Not Found</p>
                <p className="mt-1 text-xs text-rose-200/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </section>

        {/* Loading Skeleton State */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-pulse">
            <div className="h-6 bg-slate-800 rounded-md w-1/4" />
            <div className="h-24 bg-slate-800/50 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-36 bg-slate-800/40 rounded-xl" />
              <div className="h-36 bg-slate-800/40 rounded-xl" />
            </div>
          </div>
        )}

        {/* Tracking Results View */}
        {!loading && trackingData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Exception Alert Banner (if ON_HOLD or CANCELLED) */}
            {isExceptionState && (
              <div className={`p-5 rounded-2xl border flex items-start gap-4 shadow-lg ${
                trackingData.status.toUpperCase() === 'CANCELLED'
                  ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              }`}>
                <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${
                  trackingData.status.toUpperCase() === 'CANCELLED' ? 'text-rose-400' : 'text-amber-400'
                }`} />
                <div className="flex-1">
                  <h4 className="font-bold text-base">
                    {trackingData.status.toUpperCase() === 'CANCELLED' ? 'Shipment Cancelled' : 'Action Required: Shipment On Hold'}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed text-slate-300">
                    {trackingData.status.toUpperCase() === 'CANCELLED'
                      ? 'This shipment order has been cancelled. Please contact customer support for further information.'
                      : 'This shipment is currently undergoing customs verification or holds. Please monitor updates or reach out to customer service if required.'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Progress Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-400" />
                    <span>Delivery Progress</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Invoice: <strong className="text-indigo-300 font-mono">{trackingData.invoiceNumber}</strong></p>
                </div>

                {/* Status Badge */}
                {(() => {
                  const badge = getStatusBadge(trackingData.status)
                  return (
                    <div className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 ${badge.bgColor}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dotColor} animate-pulse`} />
                      <span>{badge.label}</span>
                    </div>
                  )
                })()}
              </div>

              {/* 5-Stage Stepper Bar */}
              <div className="relative py-4">
                {/* Connecting Line */}
                <div className="hidden md:block absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-800 z-0">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                    style={{
                      width: `${(activeStageIndex / (MILESTONE_STAGES.length - 1)) * 100}%`
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
                  {MILESTONE_STAGES.map((stage, idx) => {
                    const isCompleted = idx < activeStageIndex || trackingData.status === 'DELIVERED'
                    const isCurrent = idx === activeStageIndex && trackingData.status !== 'DELIVERED'
                    
                    return (
                      <div key={stage.id} className="flex md:flex-col items-center gap-3 text-left md:text-center">
                        {/* Icon Node */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition shadow-md shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                              : isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-slate-950" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Label & Description */}
                        <div>
                          <p className={`text-xs font-bold ${
                            isCompleted || isCurrent ? 'text-white' : 'text-slate-500'
                          }`}>
                            {stage.label}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Overview & Route Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Route & Recipient Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shipment Route</span>
                  <MapPin className="w-4 h-4 text-indigo-400" />
                </div>

                <div className="py-6 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Origin</p>
                    <p className="text-base font-bold text-white">{trackingData.originCity}</p>
                  </div>

                  <div className="flex-1 flex items-center justify-center px-2">
                    <div className="w-full flex items-center gap-2">
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-700 to-indigo-500" />
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-indigo-500 to-slate-700" />
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Destination</p>
                    <p className="text-base font-bold text-white">{trackingData.destinationCity}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    Recipient:
                  </span>
                  <span className="font-semibold text-white">{trackingData.receiverName || 'Recipient'}</span>
                </div>
              </div>

              {/* Card 2: Dates & Schedule */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Schedule & Delivery</span>
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>

                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400">Scheduled Departure</p>
                        <p className="text-sm font-bold text-white">{trackingData.scheduledShipmentDate || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400">Estimated Delivery Date</p>
                        <p className="text-sm font-bold text-emerald-400">{trackingData.estimatedDeliveryDate || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 text-center">
                  Dates are estimated based on standard transit clearance schedules.
                </div>
              </div>
            </div>

            {/* Event History Table */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span>Tracking History Log</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Status Activity</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {(trackingData.timelineEvents || []).map((evt, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {new Date(evt.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold font-mono text-[11px]">
                            {evt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {evt.location || 'Distribution Center'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {evt.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>© {new Date().getFullYear()} Mintana CRM. All rights reserved. Logistics Tracking Portal.</p>
      </footer>
    </div>
  )
}
