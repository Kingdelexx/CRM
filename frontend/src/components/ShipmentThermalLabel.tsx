import React from 'react'
import type { Shipment } from '@/types/crm'
import { Document, Page, View, Text, Image as PdfImage, StyleSheet, pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'

// Physical Dimensions: 144 mm (width) x 100 mm (height)
// 144mm = 408.19 pt, 100mm = 283.46 pt (72 pt / inch)
export const THERMAL_WIDTH_MM = 144
export const THERMAL_HEIGHT_MM = 100
export const THERMAL_WIDTH_PT = 408.19
export const THERMAL_HEIGHT_PT = 283.46

export function formatShipmentDate(rawDate?: string): string {
  if (!rawDate) {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }
  try {
    const d = new Date(rawDate)
    if (isNaN(d.getTime())) return rawDate
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return rawDate
  }
}

export function getShipmentTrackingNumber(shipment: Shipment): string {
  return (
    shipment.tracking_number ||
    shipment.tracking_id ||
    shipment.dpd_tracking_number ||
    shipment.invoice_number ||
    (shipment.id ? `TRK-${shipment.id.slice(0, 8).toUpperCase()}` : 'TRK-MINTANA')
  )
}

export function getShipmentTotalParcels(shipment: Shipment): number {
  return Math.max(1, shipment.total_parcels || shipment.number_of_carton || 1)
}

export function getShipmentBrandName(shipment: Shipment): { isPartner: boolean; brandName: string } {
  const pName = shipment.partner_name || (shipment.partner ? `${shipment.partner.first_name || ''} ${shipment.partner.last_name || ''}`.trim() : '')
  if (pName && pName.trim() !== '') {
    return { isPartner: true, brandName: pName.trim() }
  }
  return { isPartner: false, brandName: 'mintana' }
}

export function splitAddressIntoLines(address?: string): string[] {
  if (!address || address.trim() === '') return ['Address Not Provided']
  // Split on newlines, slashes, or commas if very long
  const rawLines = address
    .split(/\r?\n|\s*\/\s*/)
    .map(l => l.trim())
    .filter(Boolean)

  if (rawLines.length > 0) return rawLines
  return [address.trim()]
}

// ----------------------------------------------------------------------
// React-PDF Stylesheet for 144mm x 100mm Thermal Format
// ----------------------------------------------------------------------
const pdfStyles = StyleSheet.create({
  page: {
    width: THERMAL_WIDTH_PT,
    height: THERMAL_HEIGHT_PT,
    padding: 10,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  card: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
    minHeight: 38,
  },
  brandTextPartner: {
    fontSize: 24, // Increased by 50% from 16
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#000000',
    letterSpacing: 0.5,
  },
  brandTextMintana: {
    fontSize: 33, // Increased by 50% from 22
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    letterSpacing: -0.5,
  },
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#000000',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  subBarOriginDest: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: '#000000',
  },
  subBarDate: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  receiverName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#000000',
    marginBottom: 6,
  },
  addressLine: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 1.3,
  },
  footer: {
    borderTopWidth: 1.5,
    borderColor: '#000000',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 58,
  },
  parcelBadge: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  parcelBadgeText: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  qrCode: {
    width: 50,
    height: 50,
  },
})

// ----------------------------------------------------------------------
// React-PDF Document Component for Batch / Multi-Parcel Printing
// ----------------------------------------------------------------------
export interface ThermalLabelItem {
  shipment: Shipment
  parcelIndex: number
  totalParcels: number
  qrDataUrl: string
}

export const ShipmentThermalPdfDocument: React.FC<{ items: ThermalLabelItem[] }> = ({ items }) => {
  return (
    <Document>
      {items.map((item, index) => {
        const { shipment, parcelIndex, totalParcels, qrDataUrl } = item
        const { isPartner, brandName } = getShipmentBrandName(shipment)
        const dateStr = formatShipmentDate(shipment.shipment_date || shipment.date)
        const receiverName = shipment.receiver_name || 'Valued Client'
        const addressLines = splitAddressIntoLines(shipment.receiver_address)

        return (
          <Page key={`${shipment.id || 'shipment'}-${parcelIndex}-${index}`} size={[THERMAL_WIDTH_PT, THERMAL_HEIGHT_PT]} style={pdfStyles.page}>
            <View style={pdfStyles.card}>
              {/* Header */}
              <View style={pdfStyles.header}>
                <View style={pdfStyles.brandRow}>
                  {isPartner ? (
                    <Text style={pdfStyles.brandTextPartner}>{brandName}</Text>
                  ) : (
                    <Text style={pdfStyles.brandTextMintana}>mintana</Text>
                  )}
                </View>

                {/* Sub-bar */}
                <View style={pdfStyles.subBar}>
                  <Text style={pdfStyles.subBarOriginDest}>NGR       &gt;&gt;       UK</Text>
                  <Text style={pdfStyles.subBarDate}>Date of Shipment: {dateStr}</Text>
                </View>
              </View>

              {/* Middle Section */}
              <View style={pdfStyles.middleSection}>
                <Text style={pdfStyles.receiverName}>{receiverName}</Text>
                {addressLines.map((line, lIdx) => (
                  <Text key={lIdx} style={pdfStyles.addressLine}>{line}</Text>
                ))}
              </View>

              {/* Footer */}
              <View style={pdfStyles.footer}>
                <View style={pdfStyles.parcelBadge}>
                  <Text style={pdfStyles.parcelBadgeText}>{`${parcelIndex}/${totalParcels}`}</Text>
                </View>
                {qrDataUrl ? (
                  <PdfImage src={qrDataUrl} style={pdfStyles.qrCode} />
                ) : (
                  <View style={pdfStyles.qrCode} />
                )}
              </View>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

// ----------------------------------------------------------------------
// Helper to generate a PDF Blob from items
// ----------------------------------------------------------------------
export async function generateThermalPdfBlob(items: ThermalLabelItem[]): Promise<Blob> {
  const doc = <ShipmentThermalPdfDocument items={items} />
  const asPdf = pdf(doc)
  return await asPdf.toBlob()
}

// ----------------------------------------------------------------------
// DOM / HTML Component for On-Screen Preview & Native Browser Print
// ----------------------------------------------------------------------
export interface SingleThermalLabelProps {
  shipment: Shipment
  parcelIndex: number
  totalParcels: number
  qrDataUrl: string
  className?: string
  scale?: number
}

export const SingleThermalLabelView: React.FC<SingleThermalLabelProps> = ({
  shipment,
  parcelIndex,
  totalParcels,
  qrDataUrl,
  className = '',
  scale = 1,
}) => {
  const { isPartner, brandName } = getShipmentBrandName(shipment)
  const dateStr = formatShipmentDate(shipment.shipment_date || shipment.date)
  const receiverName = shipment.receiver_name || 'Valued Client'
  const addressLines = splitAddressIntoLines(shipment.receiver_address)

  return (
    <div
      className={`thermal-label-page bg-white text-black font-sans box-border select-none ${className}`}
      style={{
        width: `${144 * scale}mm`,
        height: `${100 * scale}mm`,
        minWidth: `${144 * scale}mm`,
        minHeight: `${100 * scale}mm`,
        maxWidth: `${144 * scale}mm`,
        maxHeight: `${100 * scale}mm`,
        padding: `${8 * scale}mm`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Outer Rounded Card */}
      <div
        className="w-full h-full border-2 border-black rounded-xl p-3 sm:p-3.5 flex flex-col justify-between box-border bg-white"
        style={{
          borderRadius: `${8 * scale}px`,
          borderWidth: `${2 * scale}px`,
        }}
      >
        {/* Top Header */}
        <div className="w-full flex-shrink-0">
          <div
            className="flex items-center mb-1"
            style={{ minHeight: `${38 * scale}px` }}
          >
            {isPartner ? (
              <span
                className="font-black text-black uppercase tracking-wider truncate"
                style={{ fontSize: `${27 * scale}px` }}
              >
                {brandName}
              </span>
            ) : (
              <span
                className="font-black text-black tracking-tight lowercase"
                style={{ fontSize: `${36 * scale}px`, letterSpacing: '-0.5px' }}
              >
                mintana
              </span>
            )}
          </div>

          {/* Sub-bar with top and bottom dividers */}
          <div
            className="w-full flex items-center justify-between border-t border-b border-black py-1 px-0.5"
            style={{
              borderTopWidth: `${1.5 * scale}px`,
              borderBottomWidth: `${1.5 * scale}px`,
              fontSize: `${11 * scale}px`,
            }}
          >
            <div className="font-extrabold tracking-widest text-black flex items-center gap-2">
              <span>NGR</span>
              <span className="text-zinc-600 font-bold">&gt;&gt;</span>
              <span>UK</span>
            </div>
            <div className="font-bold text-black" style={{ fontSize: `${10.5 * scale}px` }}>
              Date of Shipment: <span className="font-extrabold">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Middle Section (Receiver & Address) */}
        <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-1 my-auto overflow-hidden">
          <h1
            className="font-black text-black tracking-tight leading-tight mb-2 truncate max-w-full"
            style={{ fontSize: `${24 * scale}px` }}
          >
            {receiverName}
          </h1>

          <div
            className="font-bold text-black leading-snug space-y-0.5 max-w-[95%] overflow-hidden"
            style={{ fontSize: `${14 * scale}px` }}
          >
            {addressLines.map((line, idx) => (
              <p key={idx} className="truncate">{line}</p>
            ))}
          </div>
        </div>

        {/* Footer (Split Row: Badge left, QR right) */}
        <div
          className="w-full flex-shrink-0 border-t border-black pt-2 flex items-center justify-between"
          style={{
            borderTopWidth: `${1.5 * scale}px`,
          }}
        >
          {/* Black solid badge with white i/N text */}
          <div
            className="bg-black text-white font-black flex items-center justify-center px-4 py-1.5"
            style={{
              minWidth: `${75 * scale}px`,
              height: `${48 * scale}px`,
              fontSize: `${28 * scale}px`,
            }}
          >
            <span>{`${parcelIndex}/${totalParcels}`}</span>
          </div>

          {/* High-contrast QR Code */}
          <div className="flex items-center justify-end">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Tracking QR ${getShipmentTrackingNumber(shipment)}`}
                className="object-contain"
                style={{
                  width: `${56 * scale}px`,
                  height: `${56 * scale}px`,
                }}
              />
            ) : (
              <div
                className="bg-zinc-100 border border-zinc-300"
                style={{ width: `${56 * scale}px`, height: `${56 * scale}px` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
