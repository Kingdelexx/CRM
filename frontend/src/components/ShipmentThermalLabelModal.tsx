import React, { useState, useEffect, useMemo } from 'react'
import type { Shipment } from '@/types/crm'
import QRCode from 'qrcode'
import {
  X,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react'
import {
  SingleThermalLabelView,
  generateThermalPdfBlob,
  getShipmentTrackingNumber,
  getShipmentTotalParcels,
  type ThermalLabelItem,
  THERMAL_WIDTH_MM,
  THERMAL_HEIGHT_MM
} from './ShipmentThermalLabel'

interface ShipmentThermalLabelModalProps {
  isOpen: boolean
  onClose: () => void
  shipments?: Shipment[] // Accepts multiple shipments for batch printing
  shipment?: Shipment // Convenience single shipment prop
  initialShipmentIndex?: number
  autoPrint?: boolean
}

export const ShipmentThermalLabelModal: React.FC<ShipmentThermalLabelModalProps> = ({
  isOpen,
  onClose,
  shipments,
  shipment,
  initialShipmentIndex = 0,
  autoPrint = false,
}) => {
  const activeShipments = useMemo(() => {
    if (shipments && shipments.length > 0) return shipments
    if (shipment) return [shipment]
    return []
  }, [shipments, shipment])

  const [items, setItems] = useState<ThermalLabelItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState<'single' | 'all'>('single')

  // Prepare label items by looping multi-parcel consignments
  useEffect(() => {
    if (!isOpen || activeShipments.length === 0) return

    let isMounted = true
    setIsLoading(true)

    async function buildLabelItems() {
      const allItems: ThermalLabelItem[] = []

      for (const ship of activeShipments) {
        const trk = getShipmentTrackingNumber(ship)
        const total = getShipmentTotalParcels(ship)
        const trackUrl = `https://mintana.co.uk/track/${encodeURIComponent(trk)}`

        let qrDataUrl = ''
        try {
          qrDataUrl = await QRCode.toDataURL(trackUrl, {
            margin: 1,
            width: 256,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          })
        } catch (err) {
          console.error('Failed to generate tracking QR code:', err)
        }

        // Multi-parcel loop: 1 to total
        for (let i = 1; i <= total; i++) {
          allItems.push({
            shipment: ship,
            parcelIndex: i,
            totalParcels: total,
            qrDataUrl,
          })
        }
      }

      if (isMounted) {
        setItems(allItems)
        setActivePageIndex(0)
        setIsLoading(false)

        if (autoPrint) {
          setTimeout(() => {
            handlePrint()
          }, 350)
        }
      }
    }

    buildLabelItems()

    return () => {
      isMounted = false
    }
  }, [isOpen, activeShipments, autoPrint])

  if (!isOpen) return null

  const totalPages = items.length
  const currentItem = items[activePageIndex] || items[0]

  // Native Thermal Print trigger
  const handlePrint = () => {
    document.body.classList.add('printing-thermal-labels')
    const originalTitle = document.title
    const primaryTrk = activeShipments[0] ? getShipmentTrackingNumber(activeShipments[0]) : 'Consignment'
    document.title = `Thermal-Labels-${primaryTrk}-${totalPages}-pages`

    window.print()

    setTimeout(() => {
      document.body.classList.remove('printing-thermal-labels')
      document.title = originalTitle
    }, 600)
  }

  // React-PDF Blob Download
  const handleDownloadPdf = async () => {
    if (items.length === 0) return
    setIsGeneratingPdf(true)
    try {
      const blob = await generateThermalPdfBlob(items)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const primaryTrk = activeShipments[0] ? getShipmentTrackingNumber(activeShipments[0]) : 'Labels'
      a.href = url
      a.download = `Shipping-Labels-${primaryTrk}-${totalPages}-parcels.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate thermal PDF:', err)
      alert('Error generating PDF. You can also use the "Print Labels" button to print or save as PDF.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/80 p-3 sm:p-5 overflow-hidden">
      {/* Hidden print container with strict 144mm x 100mm dimensions for window.print() */}
      <div id="thermal-print-container" className="hidden print:block">
        <style>{`
          @page {
            size: ${THERMAL_WIDTH_MM}mm ${THERMAL_HEIGHT_MM}mm;
            margin: 0;
          }
          @media print {
            body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .thermal-label-page {
              page-break-after: always !important;
              page-break-inside: avoid !important;
              break-after: page !important;
              width: 144mm !important;
              height: 100mm !important;
              min-width: 144mm !important;
              min-height: 100mm !important;
              max-width: 144mm !important;
              max-height: 100mm !important;
              box-sizing: border-box !important;
            }
          }
        `}</style>
        {items.map((item, idx) => (
          <SingleThermalLabelView
            key={`print-${item.shipment.id || 'ship'}-${item.parcelIndex}-${idx}`}
            shipment={item.shipment}
            parcelIndex={item.parcelIndex}
            totalParcels={item.totalParcels}
            qrDataUrl={item.qrDataUrl}
            scale={1}
            className="thermal-label-page"
          />
        ))}
      </div>

      {/* Modal Dialog Card (Hidden during print) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:hidden text-zinc-100">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Thermal Shipping Labels (144mm × 100mm)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {totalPages} {totalPages === 1 ? 'Page' : 'Pages (Continuous)'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {shipments.length === 1
                  ? `Shipment: ${shipments[0]?.receiver_name || 'Consignment'} (${getShipmentTrackingNumber(shipments[0])})`
                  : `Batch Consignment: ${shipments.length} Shipments selected (${totalPages} total labels)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* View Mode & Page Navigation Controls */}
        <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPreviewMode('single')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                previewMode === 'single'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              Single Page View
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                previewMode === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> View All ({totalPages})
            </button>
          </div>

          {previewMode === 'single' && totalPages > 1 && (
            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous parcel label"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-zinc-300 font-bold px-2">
                Page {activePageIndex + 1} of {totalPages} ({currentItem?.parcelIndex}/{currentItem?.totalParcels})
              </span>
              <button
                type="button"
                onClick={() => setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={activePageIndex === totalPages - 1}
                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next parcel label"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content Body / Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900/40 flex flex-col items-center justify-start min-h-[380px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-xs font-medium">Generating multi-parcel labels and tracking QR codes...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-2">
              <AlertCircle className="h-8 w-8 text-amber-500/60" />
              <p className="text-sm font-semibold">No shipment parcel data found to print.</p>
            </div>
          ) : previewMode === 'single' ? (
            <div className="flex flex-col items-center space-y-3">
              {/* Scaled Preview Frame */}
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 shadow-2xl overflow-auto max-w-full">
                <SingleThermalLabelView
                  shipment={currentItem.shipment}
                  parcelIndex={currentItem.parcelIndex}
                  totalParcels={currentItem.totalParcels}
                  qrDataUrl={currentItem.qrDataUrl}
                  scale={0.92}
                />
              </div>
              <div className="text-center text-[11px] text-zinc-400 font-mono">
                Physical label dimensions: 144 mm (width) × 100 mm (height) • Badge: [{currentItem.parcelIndex}/{currentItem.totalParcels}]
              </div>
            </div>
          ) : (
            /* All pages continuous scroll */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full justify-items-center">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-1.5">
                  <div className="p-2 bg-zinc-950/80 rounded-xl border border-zinc-800 shadow-lg">
                    <SingleThermalLabelView
                      shipment={item.shipment}
                      parcelIndex={item.parcelIndex}
                      totalParcels={item.totalParcels}
                      qrDataUrl={item.qrDataUrl}
                      scale={0.7}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono font-bold">
                    Page {idx + 1} — Parcel [{item.parcelIndex}/{item.totalParcels}]
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              All <strong className="text-zinc-200">{totalPages}</strong> {totalPages === 1 ? 'label' : 'labels'} ready for continuous thermal print stream.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isLoading || isGeneratingPdf || items.length === 0}
              className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span>Building PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-sky-400" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || items.length === 0}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>Print {totalPages} {totalPages === 1 ? 'Label' : 'Labels'} (Thermal)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
