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

  const receiverName = activeInvoice?.receiver_name || activeInvoice?.contact?.first_name 
    ? `${activeInvoice?.contact?.first_name} ${activeInvoice?.contact?.last_name || ''}`.trim() 
    : 'Valued Client';

  const receiverTel = activeInvoice?.receiver_tel || activeInvoice?.contact?.phone || 'N/A';
  const receiverEmail = activeInvoice?.receiver_email || activeInvoice?.contact?.email || 'N/A';
  const receiverAddress = activeInvoice?.receiver_address || 'N/A';
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

  const servicesTotalNgn = services.reduce((acc, s) => acc + (Number(s.price_ngn) || 0), 0);
  let servicesTotalGbp = services.reduce((acc, s) => acc + (Number(s.price_gbp) || 0), 0);
  if ((servicesTotalGbp === servicesTotalNgn || servicesTotalGbp <= 0) && servicesTotalNgn > 0) {
    servicesTotalGbp = servicesTotalNgn / fallbackRate;
  }

  const calculatedTotalNgn = itemsTotalNgn + servicesTotalNgn;
  const calculatedTotalGbp = itemsTotalGbp + servicesTotalGbp;

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
                            ₦{(Number(item.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            ₦{(Number(item.total_ngn || item.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 border-r border-slate-200 text-right">
                            £{(Number(item.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            £{(Number(item.total_gbp || item.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    {displayCurrency === 'NGN'
                      ? `₦${itemsTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `£${itemsTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Services Table */}
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
                    <td className="py-2 px-3 text-right">
                      {displayCurrency === 'NGN'
                        ? `₦${(Number(srv.price_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `£${(Number(srv.price_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))}
                {/* Services Total */}
                <tr className="bg-sky-100 font-bold text-sky-950">
                  <td colSpan={2} className="py-2 px-3 text-center uppercase tracking-wider">
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right">
                    {displayCurrency === 'NGN'
                      ? `₦${servicesTotalNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `£${servicesTotalGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grand Totals Display */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-80">
              {displayCurrency === 'NGN' ? (
                <div className="flex justify-between items-center bg-sky-600 text-white font-extrabold px-4 py-3 rounded-xl text-base shadow-md">
                  <span>Total (NGN)</span>
                  <span>₦{totalNgn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-blue-900 text-white font-extrabold px-4 py-3 rounded-xl text-base shadow-md">
                  <span>Total (GBP)</span>
                  <span>£{totalGbp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
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
