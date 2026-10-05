import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Search, 
  Package, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  Calendar, 
  Scale, 
  Boxes, 
  Phone, 
  MapPin, 
  FileText,
  Truck,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { apiClient } from '@/api/client'

interface ManifestItem {
  id: string
  sn: number
  receiver_name: string | null
  item_shipped: string | null
  quantity: number
  weight: number
  phone_number: string | null
  delivery_address: string | null
  is_received_by_customer: boolean
  shipment_status: string
}

interface ManifestResponse {
  date: string
  access_code: string
  shipments: ManifestItem[]
}

export default function ManifestLookupPage() {
  const { code: routeCode } = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [inputCode, setInputCode] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [manifestData, setManifestData] = useState<ManifestResponse | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({})

  // Initialize code from URL route or query param
  useEffect(() => {
    const initialCode = routeCode || searchParams.get('code') || ''
    if (initialCode) {
      const sanitized = initialCode.trim().toUpperCase()
      setInputCode(sanitized)
      fetchManifest(sanitized)
    }
  }, [routeCode, searchParams])

  const fetchManifest = async (codeToSearch: string) => {
    const code = codeToSearch.trim().toUpperCase()
    if (!code) {
      setError('Please enter a valid manifest access code.')
      setManifestData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<ManifestResponse>(`/shipments/manifest/${code}`)
      setManifestData(response.data)
      // Update URL route seamlessly without page reload
      navigate(`/manifest/${code}`, { replace: true })
    } catch (err: any) {
      console.error('Failed to fetch manifest:', err)
      setManifestData(null)
      if (err.status === 404 || err.response?.status === 404) {
        setError(`Daily Manifest "${code}" was not found. Please verify the access code and date.`)
      } else {
        setError(err.message || 'Unable to retrieve manifest. Please check your internet connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleReceived = async (shipmentId: string) => {
    if (!shipmentId || !manifestData) return

    setTogglingIds(prev => ({ ...prev, [shipmentId]: true }))

    // Optimistically update local state for fast UX response
    setManifestData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        shipments: prev.shipments.map(s => {
          if (s.id === shipmentId) {
            const nextReceivedState = !s.is_received_by_customer
            return {
              ...s,
              is_received_by_customer: nextReceivedState,
              shipment_status: nextReceivedState ? 'DELIVERED' : 'PENDING'
            }
          }
          return s
        })
      }
    })

    try {
      await apiClient.patch(`/shipments/manifest/shipment/${shipmentId}/toggle-received`)
    } catch (err) {
      console.error('Failed to toggle package received status:', err)
      // Revert optimistic update on error
      setManifestData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          shipments: prev.shipments.map(s => {
            if (s.id === shipmentId) {
              const prevReceivedState = !s.is_received_by_customer
              return {
                ...s,
                is_received_by_customer: prevReceivedState,
                shipment_status: prevReceivedState ? 'DELIVERED' : 'PENDING'
              }
            }
            return s
          })
        }
      })
    } finally {
      setTogglingIds(prev => ({ ...prev, [shipmentId]: false }))
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchManifest(inputCode)
  }

  const handleCopyLink = () => {
    if (!manifestData) return
    const url = `${window.location.origin}/manifest/${manifestData.access_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!manifestData || !manifestData.shipments.length) return
    
    const headers = ['S/N', 'Receiver Name', 'Item Shipped / Description', 'Quantity', 'Weight (kg)', 'Phone Number', 'Delivery Address', 'Customer Received']
    const rows = manifestData.shipments.map(s => [
      s.sn,
      `"${(s.receiver_name || '').replace(/"/g, '""')}"`,
      `"${(s.item_shipped || '').replace(/"/g, '""')}"`,
      s.quantity,
      s.weight,
      `"${(s.phone_number || '').replace(/"/g, '""')}"`,
      `"${(s.delivery_address || '').replace(/"/g, '""')}"`,
      `"${s.is_received_by_customer ? 'Received' : 'Pending'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Daily_Manifest_${manifestData.access_code}_${manifestData.date}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate summaries
  const totalItemsCount = manifestData?.shipments.reduce((acc, s) => acc + (s.quantity || 1), 0) || 0
  const totalWeightKg = manifestData?.shipments.reduce((acc, s) => acc + (Number(s.weight) || 0), 0) || 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Bar Navigation (Hidden on Print) */}
      <header className="print:hidden border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Mintana CRM</h1>
              <p className="text-xs text-slate-400">Daily Shipment Manifest Portal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-8">
        
        {/* Search Card Section (Hidden on Print) */}
        <section className="print:hidden bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto text-center space-y-3 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              <span>Manifest Verification Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Look Up Daily Shipment Manifest
            </h2>
            <p className="text-sm text-slate-400">
              Enter your short URL-safe access code (e.g. <code className="text-indigo-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">MANIFEST-20261004-XXXX</code>) to view, verify, and export daily shipping records.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter Manifest Code (e.g. MANIFEST-20261004-ABCD)"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
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
                  <span>Find Manifest</span>
                </>
              )}
            </button>
          </form>

          {/* Error Container */}
          {error && (
            <div className="max-w-xl mx-auto mt-4 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-300">Lookup Notice</p>
                <p className="mt-0.5 text-xs text-red-200/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </section>

        {/* Loading Skeleton State */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-800 rounded-lg w-1/3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="h-16 bg-slate-800/60 rounded-xl" />
              <div className="h-16 bg-slate-800/60 rounded-xl" />
              <div className="h-16 bg-slate-800/60 rounded-xl" />
              <div className="h-16 bg-slate-800/60 rounded-xl" />
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-10 bg-slate-800/80 rounded-lg" />
              <div className="h-12 bg-slate-800/40 rounded-lg" />
              <div className="h-12 bg-slate-800/40 rounded-lg" />
              <div className="h-12 bg-slate-800/40 rounded-lg" />
            </div>
          </div>
        )}

        {/* Manifest Results View */}
        {!loading && manifestData && (
          <section className="bg-slate-900 print:bg-white print:text-black border border-slate-800 print:border-none rounded-2xl shadow-xl overflow-hidden print:shadow-none transition">
            
            {/* Manifest Header Banner & Actions */}
            <div className="p-6 sm:p-8 border-b border-slate-800 print:border-slate-300 bg-slate-900/60 print:bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 print:text-indigo-800 font-mono font-bold text-xs uppercase tracking-wider">
                    Official Daily Manifest
                  </span>
                  <span className="text-xs text-slate-400 print:text-slate-600 font-mono">
                    Code: <strong className="text-white print:text-black font-semibold">{manifestData.access_code}</strong>
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white print:text-black mt-2">
                  Shipment Tracking Sheet
                </h3>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Manifest Date: <strong>{manifestData.date}</strong></span>
                </p>
              </div>

              {/* Action Buttons (Hidden on Print) */}
              <div className="print:hidden flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-800 print:border-slate-300 bg-slate-950/40 print:bg-slate-50 divide-x divide-y sm:divide-y-0 divide-slate-800/80 print:divide-slate-300">
              <div className="p-4 sm:p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 print:text-indigo-700">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 print:text-slate-600 uppercase tracking-wider">Shipments</p>
                  <p className="text-lg font-bold text-white print:text-black">{manifestData.shipments.length}</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 print:text-purple-700">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 print:text-slate-600 uppercase tracking-wider">Total Cartons</p>
                  <p className="text-lg font-bold text-white print:text-black">{totalItemsCount}</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 print:text-emerald-700">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 print:text-slate-600 uppercase tracking-wider">Total Weight</p>
                  <p className="text-lg font-bold text-white print:text-black">{totalWeightKg.toFixed(2)} kg</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 print:text-amber-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 print:text-slate-600 uppercase tracking-wider">Shipment Date</p>
                  <p className="text-base font-bold text-white print:text-black">{manifestData.date}</p>
                </div>
              </div>
            </div>

            {/* Tracking Sheet Table */}
            {manifestData.shipments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Package className="w-12 h-12 mx-auto text-slate-600" />
                <h4 className="text-lg font-bold text-slate-200">No Shipments Found</h4>
                <p className="text-xs text-slate-400">There are currently no shipments registered for this daily manifest date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 print:text-black border-collapse">
                  <thead className="bg-slate-950/80 print:bg-slate-200 text-slate-400 print:text-slate-800 uppercase tracking-wider font-semibold border-b border-slate-800 print:border-slate-400">
                    <tr>
                      <th className="py-3.5 px-4 text-center w-12">S/N</th>
                      <th className="py-3.5 px-4 min-w-[150px]">Receiver Name</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Item Shipped / Description</th>
                      <th className="py-3.5 px-4 text-center w-16">Qty</th>
                      <th className="py-3.5 px-4 text-right w-24">Weight</th>
                      <th className="py-3.5 px-4 min-w-[130px]">Phone Number</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Delivery Address</th>
                      <th className="py-3.5 px-4 text-center min-w-[160px]">Customer Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-300 bg-slate-900/30 print:bg-white">
                    {manifestData.shipments.map((item) => (
                      <tr key={item.id || item.sn} className="hover:bg-slate-800/40 print:hover:bg-transparent transition">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 print:text-slate-800">
                          <span className="inline-block w-6 h-6 rounded-full bg-slate-800 print:bg-slate-100 text-indigo-400 print:text-slate-900 leading-6 text-center text-xs">
                            {item.sn}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-white print:text-black">
                          {item.receiver_name || <span className="text-slate-500 print:text-slate-400 italic">Unspecified</span>}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 print:text-slate-800">
                          {item.item_shipped ? (
                            <span className="line-clamp-2">{item.item_shipped}</span>
                          ) : (
                            <span className="text-slate-500 print:text-slate-400 italic">No description</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-200 print:text-black">
                          <span className="px-2 py-0.5 rounded bg-slate-800 print:bg-slate-100 text-xs font-mono">
                            {item.quantity}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-200 print:text-black font-semibold">
                          {Number(item.weight).toFixed(2)} kg
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300 print:text-black">
                          {item.phone_number ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-500 print:hidden" />
                              <span>{item.phone_number}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 print:text-slate-400 italic">N/A</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 print:text-black">
                          {item.delivery_address ? (
                            <span className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 print:hidden shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{item.delivery_address}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 print:text-slate-400 italic">Pickup / Standard</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {/* Screen Interactive Check Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleReceived(item.id)}
                            disabled={togglingIds[item.id]}
                            className={`print:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                              item.is_received_by_customer
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                            title={item.is_received_by_customer ? "Click to uncheck" : "Click to mark as received"}
                          >
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                              item.is_received_by_customer
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                                : 'border-slate-500 bg-slate-900'
                            }`}>
                              {item.is_received_by_customer && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{item.is_received_by_customer ? 'Received' : 'Mark Received'}</span>
                          </button>

                          {/* Print View Status Indicator */}
                          <span className="hidden print:inline-flex items-center gap-1 font-mono text-xs text-black font-semibold">
                            {item.is_received_by_customer ? '[✓] Received' : '[  ] Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950/90 print:bg-slate-100 border-t-2 border-slate-800 print:border-slate-400 font-bold text-slate-200 print:text-black">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-4 text-right uppercase text-[11px] tracking-wider text-slate-400 print:text-slate-700">
                        Total Summary:
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-indigo-400 print:text-indigo-900 text-sm">
                        {totalItemsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400 print:text-emerald-900 text-sm">
                        {totalWeightKg.toFixed(2)} kg
                      </td>
                      <td colSpan={3} className="py-3.5 px-4 text-xs font-normal text-slate-400 print:text-slate-600">
                        Verified by Mintana CRM Manifest Portal
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            
            {/* Print Footer Notice */}
            <div className="hidden print:block p-6 text-center border-t border-slate-300 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-800">Mintana CRM — Daily Shipment Manifest Document</p>
              <p>Printed on: {new Date().toLocaleString()} | Access Code: {manifestData.access_code}</p>
            </div>
          </section>
        )}

      </main>

      {/* Footer (Hidden on Print) */}
      <footer className="print:hidden border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>© {new Date().getFullYear()} Mintana CRM. All rights reserved. Daily Shipment Manifest Module.</p>
      </footer>
    </div>
  )
}
