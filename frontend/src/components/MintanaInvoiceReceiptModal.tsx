import React, { useEffect, useState } from 'react';
import type { Invoice, Receipt } from '../types/crm';
import { X, Printer, Share2, ExternalLink, CheckCircle, FileText } from 'lucide-react';

interface MintanaInvoiceReceiptModalProps {
  invoice?: Invoice | null;
  receipt?: Receipt | null;
  manifestCode?: string | null;
  isOpen: boolean;
  autoPrint?: boolean;
  onClose: () => void;
}

export const MintanaInvoiceReceiptModal: React.FC<MintanaInvoiceReceiptModalProps> = ({
  invoice,
  receipt,
  manifestCode,
  isOpen,
  autoPrint = false,
  onClose,
}) => {
  if (!isOpen || (!invoice && !receipt)) return null;

  // Determine active dataset
  const activeInvoice = invoice || receipt?.invoice;
  const isPaid = receipt || activeInvoice?.status === 'PAID';

  // Currency display toggle state (NGN vs GBP)
  const initialCurrency = (activeInvoice?.currency === 'GBP' || (activeInvoice as any)?.currency === 'GBP') ? 'GBP' : 'NGN';
  const [displayCurrency, setDisplayCurrency] = useState<'NGN' | 'GBP'>(initialCurrency);

  useEffect(() => {
    if (activeInvoice?.currency) {
      setDisplayCurrency(activeInvoice.currency === 'GBP' ? 'GBP' : 'NGN');
    }
  }, [activeInvoice?.currency, isOpen]);

  const docNumber = receipt
    ? receipt.receipt_number
    : activeInvoice?.invoice_number || '00003193';

  const docDate = receipt
    ? new Date(receipt.payment_date).toLocaleDateString()
    : activeInvoice?.issue_date
    ? new Date(activeInvoice.issue_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  const contactFullName = activeInvoice?.contact
    ? `${activeInvoice.contact.first_name || ''} ${activeInvoice.contact.last_name === '.' ? '' : activeInvoice.contact.last_name || ''}`.trim()
    : '';

  const receiverName = activeInvoice?.receiver_name 
    ? activeInvoice.receiver_name 
    : contactFullName 
    ? contactFullName 
    : 'Valued Client';

  const receiverTel = activeInvoice?.receiver_tel || activeInvoice?.contact?.phone || 'N/A';
  const receiverEmail = activeInvoice?.receiver_email || activeInvoice?.contact?.email || 'N/A';
  const receiverAddress = activeInvoice?.receiver_address || activeInvoice?.contact?.address || 'N/A';

  const senderName = activeInvoice?.sender_name || '';
  const senderTel = activeInvoice?.sender_tel || '';
  const senderEmail = activeInvoice?.sender_email || '';
  const senderAddress = activeInvoice?.sender_address || '';
  const totalValueItems = activeInvoice?.total_value_items || 0;
  const expectedParcelNo = activeInvoice?.expected_parcel_no || 'N/A';
  const rawParcelHandler = activeInvoice?.parcel_handler || '';
  const parcelHandler = rawParcelHandler.replace(/^Mintana Express\s*\(?/i, '').replace(/\)$/, '').trim();

  const items = activeInvoice?.items || [];
  const services = activeInvoice?.services || [
    { sn: 1, service_name: 'Packaging', price_ngn: 0, price_gbp: 0 },
    { sn: 2, service_name: 'Doorstep Delivery', price_ngn: 0, price_gbp: 0 },
  ];

  const fallbackRate = 2000;

  const itemsTotalNgn = items.reduce((acc, i) => acc + (Number(i.total_ngn) || Number(i.price_ngn) || 0), 0);
  let itemsTotalGbp = items.reduce((acc, i) => acc + (Number(i.total_gbp) || Number(i.price_gbp) || 0), 0);
  if ((itemsTotalGbp === itemsTotalNgn || itemsTotalGbp <= 0) && itemsTotalNgn > 0) {
    itemsTotalGbp = itemsTotalNgn / fallbackRate;
  }

  const itemsOriginalTotalNgn = items.reduce((acc, i) => acc + (Number(i.original_price_ngn) || Number(i.total_ngn) || Number(i.price_ngn) || 0), 0);
  let itemsOriginalTotalGbp = items.reduce((acc, i) => acc + (Number(i.original_price_gbp) || Number(i.total_gbp) || Number(i.price_gbp) || 0), 0);
  if ((itemsOriginalTotalGbp === itemsOriginalTotalNgn || itemsOriginalTotalGbp <= 0) && itemsOriginalTotalNgn > 0) {
    itemsOriginalTotalGbp = itemsOriginalTotalNgn / fallbackRate;
  }

  const servicesTotalNgn = services.reduce((acc, s) => acc + (Number(s.price_ngn) || 0), 0);
  let servicesTotalGbp = services.reduce((acc, s) => acc + (Number(s.price_gbp) || 0), 0);
  if ((servicesTotalGbp === servicesTotalNgn || servicesTotalGbp <= 0) && servicesTotalNgn > 0) {
    servicesTotalGbp = servicesTotalNgn / fallbackRate;
  }

  const servicesOriginalTotalNgn = services.reduce((acc, s) => acc + (Number(s.original_price_ngn) || Number(s.price_ngn) || 0), 0);
  let servicesOriginalTotalGbp = services.reduce((acc, s) => acc + (Number(s.original_price_gbp) || Number(s.price_gbp) || 0), 0);
  if ((servicesOriginalTotalGbp === servicesOriginalTotalNgn || servicesOriginalTotalGbp <= 0) && servicesOriginalTotalNgn > 0) {
    servicesOriginalTotalGbp = servicesOriginalTotalNgn / fallbackRate;
  }

  const calculatedTotalNgn = itemsTotalNgn + servicesTotalNgn;
  const calculatedTotalGbp = itemsTotalGbp + servicesTotalGbp;

  const calculatedOriginalTotalNgn = itemsOriginalTotalNgn + servicesOriginalTotalNgn;
  const calculatedOriginalTotalGbp = itemsOriginalTotalGbp + servicesOriginalTotalGbp;

  const baseTotalNgn = receipt ? Number(receipt.amount_paid_ngn) : Number(activeInvoice?.total_ngn || 0);
  let baseTotalGbp = receipt ? Number(receipt.amount_paid_gbp) : Number(activeInvoice?.total_gbp || 0);
  if ((baseTotalGbp === baseTotalNgn || baseTotalGbp <= 0) && baseTotalNgn > 0) {
    baseTotalGbp = baseTotalNgn / fallbackRate;
  }

  const totalNgn = calculatedTotalNgn > 0 ? calculatedTotalNgn : baseTotalNgn;
  let totalGbp = calculatedTotalGbp > 0 ? calculatedTotalGbp : baseTotalGbp;
  if ((totalGbp === totalNgn || totalGbp <= 0) && totalNgn > 0) {
    totalGbp = totalNgn / fallbackRate;
  }

  const originalTotalNgn = Number(activeInvoice?.original_total_ngn) || calculatedOriginalTotalNgn;
  let originalTotalGbp = Number(activeInvoice?.original_total_gbp) || calculatedOriginalTotalGbp;
  if ((originalTotalGbp === originalTotalNgn || originalTotalGbp <= 0) && originalTotalNgn > 0) {
    originalTotalGbp = originalTotalNgn / fallbackRate;
  }

  const slaUrl = activeInvoice?.sla_terms_url || 'https://www.mintana.co.uk/terms-and-conditions';

  // Extract last 4 numbers from invoice or receipt number
  const docDigitsOnly = docNumber.replace(/\D/g, '');
  const last4Numbers = docDigitsOnly.length >= 4 
    ? docDigitsOnly.slice(-4) 
    : (docNumber.slice(-4) || '0000');

  const cleanReceiverName = (receiverName && receiverName !== 'Valued Client') 
    ? receiverName.replace(/[\/\\:*?"<>|]/g, '-').trim() 
    : 'Client';

  const docType = receipt ? 'Receipt' : 'Invoice';
  const downloadFileName = `${docType} - ${cleanReceiverName} - ${last4Numbers}`;

  // Update document.title so PDF download defaults to "[DocType] - [Receiver Name] - [4 Numbers]"
  useEffect(() => {
    if (!isOpen) return;

    const originalTitle = document.title;
    document.title = downloadFileName;

    let timer: any = null;
    if (autoPrint) {
      timer = setTimeout(() => {
        window.print();
      }, 400);
    }

    return () => {
      document.title = originalTitle;
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, downloadFileName, autoPrint]);

  // Handler for native browser Print / PDF Save
  const handlePrint = () => {
    document.title = downloadFileName;
    window.print();
  };

  // Handler for WhatsApp receipt sharing
  const handleWhatsAppShare = () => {
    const rawPhone = receiverTel.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('0') ? '234' + rawPhone.slice(1) : rawPhone;
    
    const formattedAmount = displayCurrency === 'GBP'
      ? `*Total Payable (GBP):* £${totalGbp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : `*Total Payable (NGN):* ₦${totalNgn.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const message = `*MINTANA GLOBAL LOGISTICS - ${receipt ? 'OFFICIAL RECEIPT' : 'INVOICE'}*\n` +
      `----------------------------------------\n` +
      `*${receipt ? 'Receipt No' : 'Invoice No'}:* #${docNumber}\n` +
      `*Date:* ${docDate}\n` +
      `*Client:* ${receiverName}\n` +
      `*Parcel No:* ${expectedParcelNo}\n` +
      `----------------------------------------\n` +
      `${formattedAmount}\n` +
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

          .page-break {
            page-break-before: always !important;
            break-before: page !important;
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
                <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                  {receipt ? 'Official Payment Receipt' : 'Logistics Invoice'}: <span className="text-sky-300 font-mono font-bold">{cleanReceiverName} ({last4Numbers})</span>
                </h3>
              </div>

              {/* Currency Selector & Controls */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Currency Switcher Toggle */}
                <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 mr-1">
                  <span className="text-[11px] text-slate-300 font-semibold px-1.5 hidden sm:inline">Currency:</span>
                  <button
                    type="button"
                    onClick={() => setDisplayCurrency('NGN')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      displayCurrency === 'NGN'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ₦ Naira (NGN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayCurrency('GBP')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      displayCurrency === 'GBP'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    £ Pounds (GBP)
                  </button>
                </div>

                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium transition text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share via WhatsApp</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg font-medium transition text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg font-medium transition text-xs sm:text-sm border border-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Daily Manifest Link Banner (Hidden on print) */}
            {manifestCode && (
              <div className="bg-indigo-950 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800 print:hidden">
                <div className="flex items-center space-x-2.5">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                    📋
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Daily Shipment Manifest Access Code</span>
                    <span className="text-xs font-mono font-extrabold text-indigo-100">{manifestCode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(manifestCode)
                      alert(`Manifest access code '${manifestCode}' copied!`)
                    }}
                    className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-md text-xs font-semibold transition border border-indigo-700/60 cursor-pointer"
                  >
                    Copy Code
                  </button>
                  <a
                    href={`/manifest/${manifestCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer"
                  >
                    <span>View Day's Manifest</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

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
                <p className="text-[11px] text-slate-600 font-semibold mt-1">
                  📞 +234 806 756 7457, +234 814 547 4526
                </p>
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

              {/* Bank Payment Account Card matching displayCurrency */}
              <div className="text-left text-[11px] w-full max-w-[220px] sm:ml-auto">
                {displayCurrency === 'GBP' ? (
                  <div className="border-2 border-sky-500 bg-white rounded overflow-hidden shadow-sm">
                    <div className="bg-sky-600 text-white font-bold px-2 py-0.5 text-center text-[10px] tracking-wider">
                      POUNDS PAYMENT ACCOUNT
                    </div>
                    <div className="p-1.5 space-y-0.5 text-slate-700">
                      <p><span className="font-medium">Account:</span> Mintana Limited</p>
                      <p><span className="font-medium">Sort Code:</span> 20-18-17</p>
                      <p><span className="font-medium">Account No:</span> <strong className="text-slate-900 font-mono">53798267</strong></p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-blue-900 bg-white rounded overflow-hidden shadow-sm">
                    <div className="bg-blue-900 text-white font-bold px-2 py-0.5 text-center text-[10px] tracking-wider">
                      NAIRA PAYMENT ACCOUNT
                    </div>
                    <div className="p-1.5 space-y-0.5 text-slate-700">
                      <p><span className="font-medium">Account:</span> Mintana Logistics</p>
                      <p><span className="font-medium">Bank:</span> UBA</p>
                      <p><span className="font-medium">Account No:</span> <strong className="text-slate-900 font-mono">1027269922</strong></p>
                    </div>
                  </div>
                )}
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
            <table className="w-full text-left text-xs border-collapse min-w-[450px]">
              <thead>
                <tr className="bg-sky-500 text-white font-bold text-[11px] uppercase">
                  <th className="py-2 px-3 border-r border-sky-400">D.O.S</th>
                  <th className="py-2 px-3 border-r border-sky-400">Nature of Item</th>
                  <th className="py-2 px-3 border-r border-sky-400 text-center">Weight (Kg)</th>
                  {displayCurrency === 'NGN' ? (
                    <>
                      <th className="py-2 px-3 border-r border-sky-400 text-right">Price (NGN)</th>
                      <th className="py-2 px-3 text-right">Total (NGN)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-3 border-r border-sky-400 text-right">Price (GBP)</th>
                      <th className="py-2 px-3 text-right">Total (GBP)</th>
                    </>
                  )}
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
                      {displayCurrency === 'NGN' ? (
                        <>
                          <td className="py-2 px-3 border-r border-slate-200 text-right">
                            {item.original_price_ngn && item.original_price_ngn > (item.price_ngn || 0) ? (
                              <span className="line-through text-slate-400 font-normal mr-1.5">
                                ₦{item.weight_kg ? (item.original_price_ngn / item.weight_kg).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number(item.original_price_ngn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                            <span>
                              ₦{item.weight_kg ? ((Number(item.price_ngn) || 0) / item.weight_kg).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (Number(item.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {item.original_price_ngn && item.original_price_ngn > (item.price_ngn || 0) ? (
                              <span className="line-through text-slate-400 font-normal mr-1.5">
                                ₦{Number(item.original_price_ngn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                            <span className={item.original_price_ngn && item.original_price_ngn > (item.price_ngn || 0) ? "text-emerald-700 font-bold" : ""}>
                              ₦{(Number(item.total_ngn || item.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 border-r border-slate-200 text-right">
                            {item.original_price_gbp && item.original_price_gbp > (item.price_gbp || 0) ? (
                              <span className="line-through text-slate-400 font-normal mr-1.5">
                                £{item.weight_kg ? (item.original_price_gbp / item.weight_kg).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number(item.original_price_gbp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                            <span>
                              £{item.weight_kg ? ((Number(item.price_gbp) || 0) / item.weight_kg).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (Number(item.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {item.original_price_gbp && item.original_price_gbp > (item.price_gbp || 0) ? (
                              <span className="line-through text-slate-400 font-normal mr-1.5">
                                £{Number(item.original_price_gbp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                            <span className={item.original_price_gbp && item.original_price_gbp > (item.price_gbp || 0) ? "text-emerald-700 font-bold" : ""}>
                              £{(Number(item.total_gbp || item.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td className="py-2 px-3 border-r border-slate-200">{docDate}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold uppercase text-slate-900">
                      CLOTHES AND BEADS
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-center">-</td>
                    {displayCurrency === 'NGN' ? (
                      <>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">₦0.00</td>
                        <td className="py-2 px-3 text-right font-semibold">₦0.00</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">£0.00</td>
                        <td className="py-2 px-3 text-right font-semibold">£0.00</td>
                      </>
                    )}
                  </tr>
                )}
                {/* Total Row */}
                <tr className="bg-sky-100 font-bold text-sky-950">
                  <td colSpan={3} className="py-2 px-3 text-center uppercase tracking-wider">
                    TOTAL
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-right">
                    {displayCurrency === 'NGN' ? (
                      itemsOriginalTotalNgn > itemsTotalNgn ? (
                        <span>
                          <span className="line-through text-slate-400 font-normal mr-2">
                            ₦{itemsOriginalTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            ₦{itemsTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </span>
                      ) : (
                        `₦${itemsTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )
                    ) : (
                      itemsOriginalTotalGbp > itemsTotalGbp ? (
                        <span>
                          <span className="line-through text-slate-400 font-normal mr-2">
                            £{itemsOriginalTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            £{itemsTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </span>
                      ) : (
                        `£${itemsTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Services Table */}
          {services && services.length > 0 && (
            <div className="mb-6 overflow-x-auto rounded-lg border border-sky-200">
              <table className="w-full text-left text-xs border-collapse min-w-[350px]">
                <thead>
                  <tr className="bg-blue-600 text-white font-bold text-[11px] uppercase">
                    <th className="py-2 px-3 border-r border-blue-500 w-12 text-center">S/N</th>
                    <th className="py-2 px-3 border-r border-blue-500">Services</th>
                    <th className="py-2 px-3 text-right">
                      {displayCurrency === 'NGN' ? 'Price (NGN)' : 'Price (GBP)'}
                    </th>
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
                      <td className="py-2 px-3 text-right font-medium">
                        {displayCurrency === 'NGN' ? (
                          srv.original_price_ngn && srv.original_price_ngn > (srv.price_ngn || 0) ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              <span className="line-through text-slate-400 font-normal">
                                ₦{Number(srv.original_price_ngn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="font-bold text-emerald-700">
                                ₦{(Number(srv.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            `₦${(Number(srv.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          )
                        ) : (
                          srv.original_price_gbp && srv.original_price_gbp > (srv.price_gbp || 0) ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              <span className="line-through text-slate-400 font-normal">
                                £{Number(srv.original_price_gbp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="font-bold text-emerald-700">
                                £{(Number(srv.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            `£${(Number(srv.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Services Total */}
                  <tr className="bg-sky-100 font-bold text-sky-950">
                    <td colSpan={2} className="py-2 px-3 text-center uppercase tracking-wider">
                      TOTAL
                    </td>
                    <td className="py-2 px-3 text-right">
                      {displayCurrency === 'NGN' ? (
                        servicesOriginalTotalNgn > servicesTotalNgn ? (
                          <span>
                            <span className="line-through text-slate-400 font-normal mr-2">
                              ₦{servicesOriginalTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              ₦{servicesTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </span>
                        ) : (
                          `₦${servicesTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )
                      ) : (
                        servicesOriginalTotalGbp > servicesTotalGbp ? (
                          <span>
                            <span className="line-through text-slate-400 font-normal mr-2">
                              £{servicesOriginalTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              £{servicesTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </span>
                        ) : (
                          `£${servicesTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Grand Totals Display */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-80">
              {displayCurrency === 'NGN' ? (
                originalTotalNgn > totalNgn ? (
                  <div className="flex flex-col bg-sky-600 text-white font-extrabold px-4 py-3 rounded-xl shadow-md space-y-1">
                    <div className="flex justify-between items-center text-xs opacity-90 border-b border-sky-400/50 pb-1">
                      <span>Standard Rate Total (NGN)</span>
                      <span className="line-through text-sky-200">
                        ₦{originalTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <span>Total Payable (NGN)</span>
                        <span className="bg-amber-400 text-sky-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">PROMO</span>
                      </span>
                      <span className="text-amber-300 font-black text-lg">
                        ₦{totalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-sky-600 text-white font-extrabold px-4 py-3 rounded-xl text-base shadow-md">
                    <span>Total (NGN)</span>
                    <span>₦{totalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )
              ) : (
                originalTotalGbp > totalGbp ? (
                  <div className="flex flex-col bg-blue-900 text-white font-extrabold px-4 py-3 rounded-xl shadow-md space-y-1">
                    <div className="flex justify-between items-center text-xs opacity-90 border-b border-blue-700/50 pb-1">
                      <span>Standard Rate Total (GBP)</span>
                      <span className="line-through text-blue-200">
                        £{originalTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <span>Total Payable (GBP)</span>
                        <span className="bg-amber-400 text-blue-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">PROMO</span>
                      </span>
                      <span className="text-amber-300 font-black text-lg">
                        £{totalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-blue-900 text-white font-extrabold px-4 py-3 rounded-xl text-base shadow-md">
                    <span>Total (GBP)</span>
                    <span>£{totalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Footer Branding, Contacts & Notes */}
          <div className="border-t border-slate-300 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-slate-600">
            {/* Contact Details */}
            <div className="space-y-1.5 max-w-md">
              <h4 className="text-xl font-black text-blue-950 tracking-wider">THANK YOU!</h4>
              <p className="flex items-center space-x-2">
                <span>📞</span>
                <span className="font-semibold">+234 806 756 7457, +234 814 547 4526</span>
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

          {/* Bottom Corner Accent Page 1 */}
          <div className="absolute bottom-0 right-0 w-32 h-12 bg-gradient-to-l from-sky-600 to-transparent rounded-tl-full opacity-20 pointer-events-none print:hidden" />

          {/* PAGE 2: TERMS & CONDITIONS / SERVICE LEVEL AGREEMENT */}
          <div className="page-break pt-8 border-t-2 border-slate-200 mt-8 print:mt-0 print:border-none print:pt-2 text-[6pt] leading-tight text-slate-700 bg-white" id="printable-terms-document">
            {/* Header / Accent Bar for Page 2 */}
            <div className="flex justify-between items-center border-b-2 border-sky-700 pb-2 mb-3">
              <div>
                <h2 className="text-[9pt] font-extrabold text-blue-950 uppercase tracking-wide">
                  Mintana Global Logistics — Terms & Conditions / Service Level Agreement (SLA)
                </h2>
                <p className="text-[6pt] text-slate-500 font-medium">
                  Document Reference: SLA-MINT-{docNumber} | Effective Version: 2026.1
                </p>
              </div>
              <img 
                src="/mintana-logo.jpg" 
                alt="Mintana" 
                className="h-8 object-contain mix-blend-multiply" 
              />
            </div>

            <p className="mb-2 italic text-slate-800 font-medium">
              This Agreement is between Mintana ("Mintana", "we", "us") and the customer named on this invoice ("Customer", "you"), and governs all shipping and courier services provided by Mintana. It takes effect automatically upon payment of this invoice, as set out in the notice above.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-[6pt]">
              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">1. Scope of Service</h3>
                <p>
                  Mintana agrees to collect, transport, and deliver the consignment described on this invoice to the stated destination, using reasonable care and skill. Estimated delivery timeframes are provided in good faith and are not guaranteed unless a specific guaranteed-delivery service is separately purchased.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">2. Insurance & Goods-in-Transit Cover</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li><strong>Standard cover:</strong> every consignment shipped with Mintana is automatically covered, at no extra cost, for loss or damage occurring while in Mintana's custody, up to a maximum of £100 (or the declared value of the goods, whichever is lower).</li>
                  <li><strong>Enhanced cover:</strong> for goods with a declared value above £100, the Customer may request Enhanced Cover for an additional premium at the time of booking. If Enhanced Cover is not purchased, Mintana's maximum liability remains capped at £100 regardless of the item's actual value.</li>
                  <li>It is the Customer's responsibility to accurately declare the value of goods at the point of booking. Under-declared or undeclared items will be compensated based on the declared value only.</li>
                  <li>This cover does not exclude Mintana's liability for loss or damage caused by Mintana's own negligence; it sets a reasonable, clearly-disclosed maximum compensation amount consistent with standard courier industry practice.</li>
                  <li><strong>Packaging standard:</strong> fragile or breakable items (including but not limited to glass, cosmetics, and liquid-filled containers) are packaged by trained Mintana staff using protective materials such as bubble wrap, shrink wrap, and/or padded packaging, in line with Mintana's standard packaging protocol. Where Mintana can show an item was packaged to this standard (for example, via dispatch photographs or a packaging checklist retained on file), this will be treated as evidence that the item left Mintana's custody in good, properly protected condition.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">3. Loss, Damage & Refund Policy</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>If a consignment is confirmed lost or damaged beyond use while in Mintana's custody, Mintana will pay the Customer a single lump-sum refund, capped at £100 per consignment (or the declared value / Enhanced Cover amount, whichever applies).</li>
                  <li>Refunds are issued as a one-off payment — Mintana does not offer instalment-based repayment for lost-item claims under the standard scheme.</li>
                  <li>Refunds will be paid within 10 business days of a claim being approved, by bank transfer to the Customer's nominated account.</li>
                  <li>This refund is the Customer's exclusive remedy for loss or damage under this Agreement, except where a claim also involves proven negligence causing further loss, or where mandatory consumer law provides additional rights that cannot be excluded (see Clause 10).</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">4. Claims Process & Timelines</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>Claims must be reported in writing (email or in-app) within 7 calendar days of the expected delivery date. Claims made after this window may be declined.</li>
                  <li>The Customer must provide the tracking/waybill number, proof of value (receipt, invoice, or equivalent), and a description of the goods.</li>
                  <li>Mintana will investigate and respond to a claim within 14 business days of receiving all required information.</li>
                  <li>Damage claims require the Customer to retain the original packaging and goods for inspection until the claim is resolved.</li>
                  <li>Where a damaged parcel shows signs of having been opened, resealed, or inspected by a third party (for example, a customs inspection slip, tamper-evident seal, or agency sticker), the Customer should note this when reporting the claim, as it is relevant evidence of when and where the damage is likely to have occurred.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">5. Exclusions & Limitations</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>No cover is provided for prohibited, restricted, perishable, fragile-without-adequate-packaging, or illegal items, or for cash, jewellery, or negotiable instruments unless separately agreed in writing.</li>
                  <li>Mintana is not liable for delays or losses caused by events beyond its reasonable control (force majeure), including customs delays, extreme weather, strikes, or incorrect address information provided by the Customer.</li>
                  <li>Compensation will not be paid where loss or damage results from inadequate packaging by the Customer, inherent defect in the goods, or the Customer's own act or omission.</li>
                  <li><strong>Third-party handling, customs & regulatory checks:</strong> where a consignment passes through the custody, handling, or inspection of a party outside Mintana's direct control — including partner or last-mile delivery companies, customs authorities, airport/port security, or other regulatory agencies — and Mintana can show the item left its custody properly packaged in accordance with Clause 2, Mintana will not be treated as negligent or at fault for damage caused by that third party's handling or inspection. This does not remove the Customer's right to the standard compensation set out in Clauses 2 and 3; it only clarifies that fault for the damage itself does not attach to Mintana in these circumstances. Where possible, Mintana will assist the Customer by forwarding claim details to the relevant third party.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">6. Liability Limits & Risk Transfer</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>Mintana's total liability under this Agreement is limited to the compensation set out in Clauses 2 and 3. Mintana is not liable for any indirect or consequential loss arising from delay, loss, or damage to a consignment, including but not limited to loss of income, loss of business or contracts, loss of opportunity, or distress.</li>
                  <li><strong>Self-packed items:</strong> where the Customer or Sender packs an item themselves rather than Mintana's staff, the packaging-standard evidence described in Clause 2 does not apply to that item. Mintana's acceptance of a self-packed item for carriage does not amount to an inspection or approval of its packaging, and the Customer accepts a higher risk of damage where packaging is inadequate.</li>
                  <li><strong>Proof of delivery & risk transfer:</strong> once a consignment has been delivered to the recipient's address and evidenced by a signature, photograph, PIN confirmation, or equivalent proof of delivery, risk in the goods passes to the recipient and Mintana's responsibility under this Agreement ends, save for claims validly reported within the timeframe in Clause 4 concerning the condition of the goods at the point of delivery.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">7. Perishable Goods</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>Mintana does not, as a general rule, accept perishable goods for shipment, including but not limited to plantain, fruit, vegetables, flowers, and other fresh food items. Where Mintana agrees, at its sole discretion, to ship a perishable item, the following applies in addition to the rest of this Agreement:</li>
                  <li>By handing a perishable item to Mintana, the Sender confirms it is fresh, ripe-appropriate for the expected transit time, and fit for shipment at the point of collection.</li>
                  <li>Mintana will not be held liable where a perishable item arrives spoiled, overripe, or otherwise inedible/unusable, as this results from the condition and nature of the goods at the time they were handed to Mintana, and the natural process of decay during transit, rather than from any act or omission of Mintana.</li>
                  <li>Perishable goods are excluded from the standard cover in Clause 2 and are not eligible for a spoilage-related refund under Clause 3. Where Mintana fails to deliver a perishable consignment at all (total non-delivery caused by Mintana), the standard compensation cap in Clauses 2 and 3 applies to that failure only, and not to any assessment of spoilage.</li>
                  <li>Mintana reserves the right to refuse to collect or carry any item that appears, on inspection at collection, to already be spoiled, overripe, or otherwise unfit for transport.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">8. Customs, Duties & Unclaimed Goods</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>The recipient (or Customer) is responsible for any customs duties, import taxes, tariffs, or clearance charges arising in connection with a consignment. Mintana is not liable for delays, additional charges, or seizure of goods resulting from customs or other regulatory processes.</li>
                  <li>If a consignment cannot be delivered because the recipient is uncontactable, refuses delivery, or fails to collect it within 14 calendar days of the first delivery attempt, Mintana may charge reasonable storage fees and, after a further 14 days' written notice to the Customer, dispose of, return at the Customer's cost, or donate the goods, without further liability to the Customer.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">9. Fraud, Misdeclared Goods & Indemnity</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>The Customer/Sender warrants that the contents of a consignment are accurately described, lawfully permitted to be shipped, and not prohibited or restricted goods under Clause 5. The Customer agrees to indemnify Mintana against any loss, fine, cost, or liability Mintana incurs as a result of misdeclared, prohibited, or illegal contents shipped by the Customer.</li>
                  <li>Mintana reserves the right to investigate any claim it reasonably suspects to be false, exaggerated, or fraudulent, and to decline payment on such claims. A knowingly false or fraudulent claim may result in Mintana refusing future service to the Customer and pursuing recovery of any costs incurred.</li>
                  <li>Where the Customer disputes or reverses a card/bank payment after accepting this Agreement under Clause 11, without first raising the issue through the claims process in Clause 4, Mintana may treat this as a breach of this Agreement and pursue recovery of the disputed amount plus any related costs.</li>
                  <li>Mintana reserves the right to refuse, suspend, or terminate service to any Customer for suspected fraud, abuse, non-payment, or repeated invalid claims.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">10. Governing Law & Jurisdiction</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>This Agreement is governed primarily by the laws of the Federal Republic of Nigeria. Where the Customer is based in, or the shipment originates from or is delivered within, the United Kingdom, nothing in this Agreement excludes or limits any statutory right the Customer has under UK consumer protection law (including the Consumer Rights Act 2015) that cannot lawfully be excluded or restricted by contract; where any clause conflicts with such mandatory UK protections, the mandatory protection applies to that extent only.</li>
                  <li>Disputes will first be addressed through good-faith negotiation between the parties. If unresolved within 30 days, either party may refer the dispute to arbitration or the competent courts of Lagos, Nigeria, save that UK-based consumers retain the right to bring proceedings in their local courts where required by applicable law.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">11. Acceptance by Payment</h3>
                <p>
                  As stated on the face of this invoice, payment of any amount against this invoice — whether in full or as a deposit/part-payment — constitutes the Customer's electronic signature and binding acceptance of this Agreement in its entirety, to the same extent as if signed by hand. If the Customer does not agree to these terms, they must not make payment and should contact Mintana before doing so.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5 border-b border-slate-200 pb-0.5">12. General Terms</h3>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li><strong>Amendments:</strong> Mintana may update this Agreement from time to time. The version in effect at the time an invoice is issued and paid governs the shipment(s) on that invoice.</li>
                  <li><strong>Severability:</strong> if any provision of this Agreement is found unenforceable, that provision will be limited or removed to the minimum extent necessary, and the remaining provisions will continue in full force.</li>
                  <li><strong>Entire Agreement:</strong> this Agreement, together with the invoice it accompanies, represents the entire agreement between the parties regarding the consignment(s) described, and supersedes any prior discussions or agreements on the same subject.</li>
                </ul>
              </div>

              <div className="md:col-span-2 mt-1 border-t border-slate-200 pt-1">
                <h3 className="font-bold text-blue-900 uppercase text-[6.5pt] mb-0.5">13. Contact & Complaints</h3>
                <p>
                  For claims, disputes, or questions about this Agreement, contact Mintana at <strong>contact@mintanaltd.com</strong> or <strong>09019081819</strong> / <strong>+234 814 547 4526</strong>. We aim to acknowledge all enquiries within 2 business days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Control Footer (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-t border-slate-200 print:hidden">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2 rounded-xl font-semibold transition text-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close Document</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition text-sm shadow cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl font-semibold transition text-sm shadow cursor-pointer"
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
