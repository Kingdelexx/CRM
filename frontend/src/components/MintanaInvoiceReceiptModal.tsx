import React from 'react';
import type { Invoice, Receipt } from '../types/crm';
import { X, Printer, Share2, ExternalLink, CheckCircle, FileText } from 'lucide-react';

interface MintanaInvoiceReceiptModalProps {
  invoice?: Invoice | null;
  receipt?: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MintanaInvoiceReceiptModal: React.FC<MintanaInvoiceReceiptModalProps> = ({
  invoice,
  receipt,
  isOpen,
  onClose,
}) => {
  if (!isOpen || (!invoice && !receipt)) return null;

  // Determine active dataset
  const activeInvoice = invoice || receipt?.invoice;
  const isPaid = receipt || activeInvoice?.status === 'PAID';

  const docNumber = receipt
    ? receipt.receipt_number
    : activeInvoice?.invoice_number || '00003193';

  const docDate = receipt
    ? new Date(receipt.payment_date).toLocaleDateString()
    : activeInvoice?.issue_date
    ? new Date(activeInvoice.issue_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  const receiverName = activeInvoice?.receiver_name || activeInvoice?.contact?.first_name 
    ? `${activeInvoice?.contact?.first_name} ${activeInvoice?.contact?.last_name || ''}`.trim() 
    : 'Valued Client';

  const receiverTel = activeInvoice?.receiver_tel || activeInvoice?.contact?.phone || 'N/A';
  const receiverEmail = activeInvoice?.receiver_email || activeInvoice?.contact?.email || 'N/A';
  const receiverAddress = activeInvoice?.receiver_address || 'N/A';
  const totalValueItems = activeInvoice?.total_value_items || 0;
  const expectedParcelNo = activeInvoice?.expected_parcel_no || 'N/A';
  const parcelHandler = activeInvoice?.parcel_handler || 'Mintana Express';

  const items = activeInvoice?.items || [];
  const services = activeInvoice?.services || [
    { sn: 1, service_name: 'Packaging', price_ngn: 0, price_gbp: 0 },
    { sn: 2, service_name: 'Doorstep Delivery', price_ngn: 0, price_gbp: 0 },
  ];

  const itemsTotalNgn = items.reduce((acc, i) => acc + (Number(i.total_ngn) || Number(i.price_ngn) || 0), 0);
  const itemsTotalGbp = items.reduce((acc, i) => acc + (Number(i.total_gbp) || Number(i.price_gbp) || 0), 0);

  const servicesTotalNgn = services.reduce((acc, s) => acc + (Number(s.price_ngn) || 0), 0);
  const servicesTotalGbp = services.reduce((acc, s) => acc + (Number(s.price_gbp) || 0), 0);

  const calculatedTotalNgn = itemsTotalNgn + servicesTotalNgn;
  const calculatedTotalGbp = itemsTotalGbp + servicesTotalGbp;

  const baseTotalNgn = receipt ? Number(receipt.amount_paid_ngn) : Number(activeInvoice?.total_ngn || 0);
  const baseTotalGbp = receipt ? Number(receipt.amount_paid_gbp) : Number(activeInvoice?.total_gbp || 0);

  const totalNgn = calculatedTotalNgn > 0 ? calculatedTotalNgn : baseTotalNgn;
  const totalGbp = calculatedTotalGbp > 0 ? calculatedTotalGbp : baseTotalGbp;

  const slaUrl = activeInvoice?.sla_terms_url || 'https://www.mintana.co.uk/terms-and-conditions';

  // Handler for native browser Print / PDF Save
  const handlePrint = () => {
    window.print();
  };

  // Handler for WhatsApp receipt sharing
  const handleWhatsAppShare = () => {
    const rawPhone = receiverTel.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('0') ? '234' + rawPhone.slice(1) : rawPhone;
    
    const message = `*MINTANA GLOBAL LOGISTICS - ${receipt ? 'OFFICIAL RECEIPT' : 'INVOICE'}*\n` +
      `----------------------------------------\n` +
      `*${receipt ? 'Receipt No' : 'Invoice No'}:* #${docNumber}\n` +
      `*Date:* ${docDate}\n` +
      `*Client:* ${receiverName}\n` +
      `*Parcel No:* ${expectedParcelNo}\n` +
      `----------------------------------------\n` +
      `*Total Payable (NGN):* ₦${totalNgn.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
      `*Total Payable (GBP):* £${totalGbp.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
      `*Status:* ${isPaid ? '✅ PAID' : '⏳ PENDING PAYMENT'}\n` +
      `----------------------------------------\n` +
      `Shipping Terms & SLA: ${slaUrl}\n\n` +
      `Thank you for shipping with Mintana Global Logistics!`;

    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Bulletproof Print Media Stylesheet to prevent blank pages on PDF download */}
      <style>{`
        @media print {
          /* Hide non-printable elements */
          aside, header, nav, .print\\:hidden {
            display: none !important;
          }

          /* Reset document & app containers for unclipped printing */
          html, body, #root, #root > *, main, section, article {
            background: white !important;
            color: #0f172a !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Unset modal fixed overlays */
          .fixed.inset-0 {
            position: static !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
          }

          /* Unset modal bounds */
          .min-h-full, .max-w-4xl {
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            display: block !important;
          }

          /* Target printable document content */
          #printable-invoice-document {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px 15px !important;
            background: white !important;
            color: #0f172a !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
          }

          @page {
            margin: 8mm;
            size: A4 portrait;
          }
        }
      `}</style>

      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible"
      >
        {/* Scrollable Center Wrapper */}
        <div className="min-h-full flex items-start justify-center py-4 sm:py-8 print:py-0 print:block">
          
          {/* Container with print styles */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none"
          >
            
            {/* Modal Action Controls Header (Hidden on print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-slate-900 text-white print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 flex-shrink-0" />
                <h3 className="text-sm sm:text-lg font-semibold text-white truncate">
                  {receipt ? 'Official Payment Receipt' : 'Logistics Invoice Preview'}
                </h3>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium transition text-xs sm:text-sm shadow-md"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Share via WhatsApp</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium transition text-xs sm:text-sm shadow-md"
                >
                  <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-medium transition text-xs sm:text-sm border border-slate-700"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 bg-white text-slate-800 text-sm relative pt-8" id="printable-invoice-document">
              
              {/* Top Geometric Branding Bar */}
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-sky-600 via-sky-400 to-blue-900" />

              {/* Header Layout */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2 mb-6">
            
            {/* Title & Document Info */}
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-950 tracking-wider">
                {receipt ? 'RECEIPT' : 'INVOICE'}
              </h1>
              
              {isPaid && (
                <div className="mt-2 inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>PAID & VERIFIED</span>
                </div>
              )}

              <div className="mt-4 space-y-1 text-slate-600 text-xs">
                <p><span className="font-semibold text-slate-800">Date:</span> {docDate}</p>
                <p>
                  <span className="font-semibold text-slate-800">
                    No. {receipt ? 'Receipt' : 'Invoice'}:
                  </span>{' '}
                  <span className="font-mono text-base font-bold text-sky-700 underline decoration-sky-300 decoration-2">
                    {docNumber}
                  </span>
                </p>
                <p className="pt-2 font-semibold text-slate-800">Bill to:</p>
                <p className="font-bold text-slate-900 text-sm">{receiverName}</p>
              </div>
            </div>

            {/* Company Branding Logo & SLA Link & Bank Accounts */}
            <div className="text-left sm:text-right w-full sm:max-w-md">
              <div className="flex flex-col sm:items-end mb-3">
                <img 
                  src="/mintana-logo.jpg" 
                  alt="Mintana Global Logistics Limited ...Connecting Africa..." 
                  className="h-14 sm:h-16 md:h-20 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Shipping Terms & Conditions SLA Link */}
              <div className="mb-4 bg-sky-50 border border-sky-200 rounded-lg p-2 text-left sm:text-right shadow-sm">
                <p className="text-[11px] font-bold text-slate-700">
                  Please{' '}
                  <a
                    href={slaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-800 underline font-extrabold inline-flex items-center space-x-1"
                  >
                    <span>click here</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>{' '}
                  to view our
                </p>
                <p className="text-[11px] font-extrabold text-blue-900">
                  Shipping Terms & Conditions & SLA
                </p>
              </div>

              {/* Bank Payment Account Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-[11px]">
                {/* Pounds Account */}
                <div className="border border-sky-300 bg-white rounded overflow-hidden">
                  <div className="bg-sky-600 text-white font-bold px-2 py-0.5 text-center text-[10px] tracking-wider">
                    POUNDS
                  </div>
                  <div className="p-1.5 space-y-0.5 text-slate-700">
                    <p><span className="font-medium">Account:</span> Mintana Limited</p>
                    <p><span className="font-medium">Sort Code:</span> 20-18-17</p>
                    <p><span className="font-medium">Account No:</span> <strong className="text-slate-900">53798267</strong></p>
                  </div>
                </div>

                {/* Naira Account */}
                <div className="border border-blue-300 bg-white rounded overflow-hidden">
                  <div className="bg-blue-900 text-white font-bold px-2 py-0.5 text-center text-[10px] tracking-wider">
                    NAIRA
                  </div>
                  <div className="p-1.5 space-y-0.5 text-slate-700">
                    <p><span className="font-medium">Account:</span> Mintana Logistics</p>
                    <p><span className="font-medium">Bank:</span> UBA</p>
                    <p><span className="font-medium">Account No:</span> <strong className="text-slate-900">1027269922</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details Table */}
          <div className="mb-6 overflow-hidden rounded-lg border border-sky-200">
            <div className="bg-gradient-to-r from-sky-600 to-blue-800 px-4 py-1.5 text-white font-bold text-xs uppercase tracking-wider flex justify-between">
              <span>Customer Details</span>
              <span>Details</span>
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              <div className="grid grid-cols-3 p-2 bg-slate-50">
                <span className="font-semibold text-slate-700">Receiver's Name</span>
                <span className="col-span-2 font-bold text-slate-900">{receiverName}</span>
              </div>
              <div className="grid grid-cols-3 p-2">
                <span className="font-semibold text-slate-700">Receiver's Tel</span>
                <span className="col-span-2 text-slate-800">{receiverTel}</span>
              </div>
              <div className="grid grid-cols-3 p-2 bg-slate-50">
                <span className="font-semibold text-slate-700">Receiver's Email</span>
                <span className="col-span-2 text-slate-800">{receiverEmail}</span>
              </div>
              <div className="grid grid-cols-3 p-2">
                <span className="font-semibold text-slate-700">Receiver's Address</span>
                <span className="col-span-2 text-slate-800">{receiverAddress}</span>
              </div>
              <div className="grid grid-cols-3 p-2 bg-slate-50">
                <span className="font-semibold text-slate-700">Total Value of Items</span>
                <span className="col-span-2 font-bold text-slate-900">
                  ₦{totalValueItems.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-3 p-2">
                <span className="font-semibold text-slate-700">Expected Parcel No</span>
                <span className="col-span-2 font-mono font-bold text-sky-700">{expectedParcelNo}</span>
              </div>
              <div className="grid grid-cols-3 p-2 bg-slate-50">
                <span className="font-semibold text-slate-700">Parcel Handler</span>
                <span className="col-span-2 text-slate-800">{parcelHandler}</span>
              </div>
            </div>
          </div>

          {/* Item Breakdown Table */}
          <div className="mb-6 overflow-x-auto rounded-lg border border-sky-200">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-sky-500 text-white font-bold text-[11px] uppercase">
                  <th className="py-2 px-3 border-r border-sky-400">D.O.S</th>
                  <th className="py-2 px-3 border-r border-sky-400">Nature of Item</th>
                  <th className="py-2 px-3 border-r border-sky-400 text-center">Weight (Kg)</th>
                  <th className="py-2 px-3 border-r border-sky-400 text-right">Price (NGN)</th>
                  <th className="py-2 px-3 border-r border-sky-400 text-right">Price (GBP)</th>
                  <th className="py-2 px-3 border-r border-sky-400 text-right">Total (NGN)</th>
                  <th className="py-2 px-3 text-right">Total (GBP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 border-r border-slate-200">{item.dos || docDate}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold uppercase text-slate-900">
                        {item.nature_of_item}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-medium">
                        {item.weight_kg ? `${item.weight_kg} kg` : '-'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        ₦{(Number(item.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        £{(Number(item.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-semibold">
                        ₦{(Number(item.total_ngn || item.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        £{(Number(item.total_gbp || item.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td className="py-2 px-3 border-r border-slate-200">{docDate}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold uppercase text-slate-900">
                      CLOTHES AND BEADS
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-center">-</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right">₦0.00</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right">£0.00</td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-semibold">₦0.00</td>
                    <td className="py-2 px-3 text-right font-semibold">£0.00</td>
                  </tr>
                )}
                {/* Total Row */}
                <tr className="bg-sky-100 font-bold text-sky-950">
                  <td colSpan={5} className="py-2 px-3 text-center uppercase tracking-wider">
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right border-r border-sky-200">
                    ₦{itemsTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    £{itemsTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Services Table */}
          <div className="mb-6 overflow-x-auto rounded-lg border border-sky-200">
            <table className="w-full text-left text-xs border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-blue-600 text-white font-bold text-[11px] uppercase">
                  <th className="py-2 px-3 border-r border-blue-500 w-12 text-center">S/N</th>
                  <th className="py-2 px-3 border-r border-blue-500">Services</th>
                  <th className="py-2 px-3 border-r border-blue-500 text-right">Price (NGN)</th>
                  <th className="py-2 px-3 text-right">Price (GBP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {services.map((srv, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-700">
                      {srv.sn || idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-800">
                      {srv.service_name}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right">
                      ₦{(Number(srv.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right">
                      £{(Number(srv.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {/* Services Total */}
                <tr className="bg-sky-100 font-bold text-sky-950">
                  <td colSpan={2} className="py-2 px-3 text-center uppercase tracking-wider">
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right border-r border-sky-200">
                    ₦{servicesTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    £{servicesTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grand Totals Display */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-80 space-y-2">
              <div className="flex justify-between items-center bg-sky-200 text-sky-950 font-extrabold px-4 py-2.5 rounded-lg text-sm border border-sky-300">
                <span>Total (NGN)</span>
                <span>₦{totalNgn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-900 text-white font-extrabold px-4 py-2.5 rounded-lg text-sm shadow-md">
                <span>Total (GBP)</span>
                <span>£{totalGbp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Branding, Contacts & Notes */}
          <div className="border-t border-slate-300 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-slate-600">
            {/* Contact Details */}
            <div className="space-y-1.5 max-w-md">
              <h4 className="text-xl font-black text-blue-950 tracking-wider">THANK YOU!</h4>
              <p className="flex items-center space-x-2">
                <span>📞</span>
                <span className="font-semibold">+234 806 756 7457</span>
              </p>
              <p className="flex items-center space-x-2">
                <span>✉️</span>
                <span className="font-semibold text-sky-700">info@mintana.co.uk</span>
              </p>
              <p className="flex items-center space-x-2">
                <span>🌐</span>
                <span className="font-semibold">www.mintana.co.uk</span>
              </p>
              <p className="flex items-start space-x-2 text-[11px] leading-snug text-slate-500 pt-1">
                <span>📍</span>
                <span>19, Moshesa Street, Off Ogunsolu Street, Cement Bus-stop, Along Iyana Ipaja Road, Ikeja, Lagos</span>
              </p>
            </div>

            {/* Insurance Note & Shipping Disclaimer */}
            <div className="text-right max-w-md space-y-2">
              <div className="border-t border-b border-slate-300 py-2 space-y-1">
                <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">
                  ALL CONSIGNMENTS ARE INSURED TO THEIR DECLARED VALUE UP TO 100 GBP
                </p>
                <p className="font-black text-sky-800 uppercase text-[10px]">
                  NOTE: PAYMENT VALIDATES SHIPPING!
                </p>
              </div>
              <p className="font-extrabold text-blue-950 underline text-[11px]">
                KINDLY ATTACH RECEIPT OF PAYMENT ONCE MADE
              </p>
            </div>
          </div>

          {/* Tagline */}
          <div className="mt-8 text-center border-t border-sky-100 pt-3">
            <span className="text-lg font-black tracking-widest text-sky-800 uppercase">
              LOGISTICS <span className="text-blue-950">|</span> EXPORTATION
            </span>
          </div>

          {/* Bottom Corner Accent */}
          <div className="absolute bottom-0 right-0 w-32 h-12 bg-gradient-to-l from-sky-600 to-transparent rounded-tl-full opacity-20 pointer-events-none" />
        </div>

        {/* Modal Bottom Control Footer (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-t border-slate-200 print:hidden">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2 rounded-xl font-semibold transition text-sm"
          >
            <X className="w-4 h-4" />
            <span>Close Document</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition text-sm shadow"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl font-semibold transition text-sm shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Download PDF / Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );
};
