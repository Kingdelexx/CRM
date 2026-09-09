import React, { useState, useEffect } from 'react';
import type { Invoice, Receipt, Contact } from '../types/crm';
import { apiClient as api } from '../api/client';
import { MintanaInvoiceReceiptModal } from '../components/MintanaInvoiceReceiptModal';
import { 
  FileText, Plus, Search, Filter, CheckCircle, Share2, Printer, Download,
  Trash2, DollarSign, Package, AlertCircle, ArrowUpRight, Check, Edit3, X
} from 'lucide-react';

export const InvoicesWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Preview Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Invoice Form Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    contact_id: '',
    receiver_name: '',
    receiver_tel: '',
    receiver_email: '',
    receiver_address: '',
    total_value_items: '' as any,
    expected_parcel_no: '',
    parcel_handler: 'Mintana Express',
    total_ngn: '' as any,
    total_gbp: '' as any,
    sla_terms_url: 'https://www.mintana.co.uk/terms-and-conditions',
    notes: '',
  });

  const [itemRows, setItemRows] = useState([
    { dos: '', nature_of_item: 'CLOTHES AND BEADS', weight_kg: '' as any, price_ngn: '' as any, price_gbp: '' as any, total_ngn: '' as any, total_gbp: '' as any }
  ]);

  const [serviceRows, setServiceRows] = useState([
    { sn: 1, service_name: 'Packaging', price_ngn: '' as any, price_gbp: '' as any },
    { sn: 2, service_name: 'Doorstep Delivery', price_ngn: '' as any, price_gbp: '' as any }
  ]);

  const [exchangeRate, setExchangeRate] = useState<number>(2000);

  // New Receipt Form Modal State
  const [isCreateReceiptModalOpen, setIsCreateReceiptModalOpen] = useState(false);
  const [receiptFormData, setReceiptFormData] = useState({
    contact_id: '',
    invoice_id: '',
    receipt_number: '',
    amount_paid_ngn: '' as any,
    amount_paid_gbp: '' as any,
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    notes: '',
  });

  const handleReceiptAmountNgnChange = (val: string) => {
    const valNum = parseFloat(val);
    const rate = exchangeRate > 0 ? exchangeRate : 2000;
    const convGbp = !isNaN(valNum) && val !== '' ? (valNum / rate).toFixed(2) : '';
    setReceiptFormData(prev => ({
      ...prev,
      amount_paid_ngn: val,
      amount_paid_gbp: convGbp,
    }));
  };

  const handleReceiptAmountGbpChange = (val: string) => {
    const valNum = parseFloat(val);
    const rate = exchangeRate > 0 ? exchangeRate : 2000;
    const convNgn = !isNaN(valNum) && val !== '' ? (valNum * rate).toFixed(2) : '';
    setReceiptFormData(prev => ({
      ...prev,
      amount_paid_gbp: val,
      amount_paid_ngn: convNgn,
    }));
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, rcptRes, contRes, meRes] = await Promise.all([
        api.get('/invoices/'),
        api.get('/receipts/'),
        api.get('/contacts/'),
        api.get('/accounts/me'),
      ]);

      setInvoices(invRes.data?.items || invRes.data || []);
      setReceipts(rcptRes.data?.items || rcptRes.data || []);
      setContacts(contRes.data?.items || contRes.data || []);
      if (meRes.data?.organization?.gbp_to_ngn_rate) {
        setExchangeRate(Number(meRes.data.organization.gbp_to_ngn_rate) || 2000);
      }
    } catch (err) {
      console.error('Failed to load invoices workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle contact selection for auto-fill
  const handleContactSelect = (contactId: string) => {
    const found = contacts.find(c => c.id === contactId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        contact_id: contactId,
        receiver_name: `${found.first_name} ${found.last_name || ''}`.trim(),
        receiver_tel: found.phone || prev.receiver_tel,
        receiver_email: found.email || prev.receiver_email,
      }));
    } else {
      setFormData(prev => ({ ...prev, contact_id: contactId }));
    }
  };

  // Add Item Row
  const handleAddItemRow = () => {
    setItemRows(prev => [
      ...prev,
      { dos: '', nature_of_item: '', weight_kg: '', price_ngn: '', price_gbp: '', total_ngn: '', total_gbp: '' }
    ]);
  };

  // Update Item Row with Auto Exchange Rate Conversion
  const handleUpdateItemRow = (index: number, field: string, value: any) => {
    setItemRows(prev => {
      const updated = [...prev];
      const valNum = parseFloat(value);
      const rate = exchangeRate > 0 ? exchangeRate : 2000;

      if (field === 'price_ngn') {
        const convGbp = !isNaN(valNum) && value !== '' ? (valNum / rate).toFixed(2) : '';
        updated[index] = {
          ...updated[index],
          price_ngn: value,
          price_gbp: convGbp,
          total_ngn: value,
          total_gbp: convGbp
        };
      } else if (field === 'price_gbp') {
        const convNgn = !isNaN(valNum) && value !== '' ? (valNum * rate).toFixed(2) : '';
        updated[index] = {
          ...updated[index],
          price_gbp: value,
          price_ngn: convNgn,
          total_gbp: value,
          total_ngn: convNgn
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Update Service Row with Auto Exchange Rate Conversion
  const handleUpdateServiceRow = (index: number, field: string, value: any) => {
    setServiceRows(prev => {
      const updated = [...prev];
      const valNum = parseFloat(value);
      const rate = exchangeRate > 0 ? exchangeRate : 2000;

      if (field === 'price_ngn') {
        const convGbp = !isNaN(valNum) && value !== '' ? (valNum / rate).toFixed(2) : '';
        updated[index] = { ...updated[index], price_ngn: value, price_gbp: convGbp };
      } else if (field === 'price_gbp') {
        const convNgn = !isNaN(valNum) && value !== '' ? (valNum * rate).toFixed(2) : '';
        updated[index] = { ...updated[index], price_gbp: value, price_ngn: convNgn };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleRemoveItemRow = (index: number) => {
    setItemRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddServiceRow = () => {
    setServiceRows(prev => [
      ...prev,
      { sn: prev.length + 1, service_name: '', price_ngn: '', price_gbp: '' }
    ]);
  };

  const handleRemoveServiceRow = (index: number) => {
    setServiceRows(prev => prev.filter((_, idx) => idx !== index));
  };

  // Create Invoice Submission
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Calculate totals
      const calcNgn = itemRows.reduce((acc, row) => acc + (Number(row.total_ngn) || Number(row.price_ngn) || 0), 0) +
        serviceRows.reduce((acc, row) => acc + (Number(row.price_ngn) || 0), 0);

      const calcGbp = itemRows.reduce((acc, row) => acc + (Number(row.total_gbp) || Number(row.price_gbp) || 0), 0) +
        serviceRows.reduce((acc, row) => acc + (Number(row.price_gbp) || 0), 0);

      const cleanedItems = itemRows.map(r => ({
        ...r,
        weight_kg: Number(r.weight_kg) || 0,
        price_ngn: Number(r.price_ngn) || 0,
        price_gbp: Number(r.price_gbp) || 0,
        total_ngn: Number(r.total_ngn || r.price_ngn) || 0,
        total_gbp: Number(r.total_gbp || r.price_gbp) || 0,
      }));

      const cleanedServices = serviceRows.map(s => ({
        ...s,
        price_ngn: Number(s.price_ngn) || 0,
        price_gbp: Number(s.price_gbp) || 0,
      }));

      const payload = {
        ...formData,
        contact_id: formData.contact_id || undefined,
        total_value_items: Number(formData.total_value_items) || 0,
        total_ngn: Number(formData.total_ngn) > 0 ? Number(formData.total_ngn) : calcNgn,
        total_gbp: Number(formData.total_gbp) > 0 ? Number(formData.total_gbp) : calcGbp,
        issue_date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        items: cleanedItems,
        services: cleanedServices,
      };

      await api.post('/invoices/', payload);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert('Error creating invoice. Please try again.');
    }
  };

  // Open Edit Invoice Modal
  const handleOpenEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormData({
      invoice_number: inv.invoice_number || '',
      contact_id: inv.contact?.id || '',
      receiver_name: inv.receiver_name || '',
      receiver_tel: inv.receiver_tel || '',
      receiver_email: inv.receiver_email || '',
      receiver_address: inv.receiver_address || '',
      expected_parcel_no: inv.expected_parcel_no || '',
      parcel_handler: inv.parcel_handler || 'Mintana Express',
      total_value_items: inv.total_value_items ? String(inv.total_value_items) : '',
      total_ngn: inv.total_ngn ? String(inv.total_ngn) : '',
      total_gbp: inv.total_gbp ? String(inv.total_gbp) : '',
      sla_terms_url: inv.sla_terms_url || 'https://www.mintana.co.uk/terms-and-conditions',
      notes: inv.notes || '',
    });
    setItemRows(
      inv.items && inv.items.length > 0
        ? inv.items.map(i => ({
            dos: i.dos || '',
            nature_of_item: i.nature_of_item || '',
            weight_kg: i.weight_kg ? String(i.weight_kg) : '',
            price_ngn: i.price_ngn ? String(i.price_ngn) : '',
            price_gbp: i.price_gbp ? String(i.price_gbp) : '',
            total_ngn: i.total_ngn ? String(i.total_ngn) : (i.price_ngn ? String(i.price_ngn) : ''),
            total_gbp: i.total_gbp ? String(i.total_gbp) : (i.price_gbp ? String(i.price_gbp) : ''),
          }))
        : [{ dos: '', nature_of_item: '', weight_kg: '', price_ngn: '', price_gbp: '', total_ngn: '', total_gbp: '' }]
    );
    setServiceRows(
      inv.services && inv.services.length > 0
        ? inv.services.map((s, idx) => ({
            sn: idx + 1,
            service_name: s.service_name || '',
            price_ngn: s.price_ngn ? String(s.price_ngn) : '',
            price_gbp: s.price_gbp ? String(s.price_gbp) : '',
          }))
        : [{ sn: 1, service_name: '', price_ngn: '', price_gbp: '' }]
    );
    setIsEditModalOpen(true);
  };

  // Edit Invoice Submission
  const handleEditInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      const calcNgn = itemRows.reduce((acc, row) => acc + (Number(row.total_ngn) || Number(row.price_ngn) || 0), 0) +
        serviceRows.reduce((acc, row) => acc + (Number(row.price_ngn) || 0), 0);

      const calcGbp = itemRows.reduce((acc, row) => acc + (Number(row.total_gbp) || Number(row.price_gbp) || 0), 0) +
        serviceRows.reduce((acc, row) => acc + (Number(row.price_gbp) || 0), 0);

      const cleanedItems = itemRows.map(r => ({
        ...r,
        weight_kg: Number(r.weight_kg) || 0,
        price_ngn: Number(r.price_ngn) || 0,
        price_gbp: Number(r.price_gbp) || 0,
        total_ngn: Number(r.total_ngn || r.price_ngn) || 0,
        total_gbp: Number(r.total_gbp || r.price_gbp) || 0,
      }));

      const cleanedServices = serviceRows.map(s => ({
        ...s,
        price_ngn: Number(s.price_ngn) || 0,
        price_gbp: Number(s.price_gbp) || 0,
      }));

      const payload = {
        ...formData,
        contact_id: formData.contact_id || undefined,
        total_value_items: Number(formData.total_value_items) || 0,
        total_ngn: Number(formData.total_ngn) > 0 ? Number(formData.total_ngn) : calcNgn,
        total_gbp: Number(formData.total_gbp) > 0 ? Number(formData.total_gbp) : calcGbp,
        items: cleanedItems,
        services: cleanedServices,
      };

      await api.put(`/invoices/${editingInvoice.id}`, payload);
      setIsEditModalOpen(false);
      setEditingInvoice(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update invoice:', err);
      alert('Error updating invoice. Please try again.');
    }
  };

  // Create Manual Receipt Submission
  const handleCreateReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...receiptFormData,
        contact_id: receiptFormData.contact_id || undefined,
        invoice_id: receiptFormData.invoice_id || undefined,
        receipt_number: receiptFormData.receipt_number || undefined,
        amount_paid_ngn: Number(receiptFormData.amount_paid_ngn) || 0,
        amount_paid_gbp: Number(receiptFormData.amount_paid_gbp) || 0,
        reference_number: receiptFormData.reference_number || undefined,
        notes: receiptFormData.notes || undefined,
      };

      const res = await api.post('/receipts/', payload);
      setIsCreateReceiptModalOpen(false);
      fetchData();
      setSelectedInvoice(null);
      setSelectedReceipt(res.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to create receipt:', err);
      alert('Error creating receipt. Please try again.');
    }
  };

  // Mark Paid & Auto Generate Receipt
  const handleMarkPaid = async (inv: Invoice) => {
    try {
      const res = await api.post(`/invoices/${inv.id}/mark-paid`);
      alert(`Invoice #${inv.invoice_number} marked as PAID. Receipt generated successfully!`);
      fetchData();
      // Show receipt modal directly
      setSelectedInvoice(null);
      setSelectedReceipt(res.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to mark invoice paid:', err);
      alert('Error marking invoice paid.');
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  // Download PDF Direct Triggers
  const handleDownloadInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setSelectedReceipt(null);
    setIsModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadReceipt = (rcpt: Receipt) => {
    setSelectedReceipt(rcpt);
    setSelectedInvoice(null);
    setIsModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Delete Receipt
  const handleDeleteReceipt = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;
    try {
      await api.delete(`/receipts/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete receipt:', err);
    }
  };

  // Filters
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.receiver_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.expected_parcel_no || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReceipts = receipts.filter(rcpt => {
    return (
      rcpt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rcpt.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rcpt.invoice?.receiver_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate Metrics - parse with Number to prevent string concatenation from backend Decimals
  const totalInvoicedNgn = invoices.reduce((acc, i) => acc + (Number(i.total_ngn) || 0), 0);
  const totalInvoicedGbp = invoices.reduce((acc, i) => acc + (Number(i.total_gbp) || 0), 0);
  const totalPaidCount = invoices.filter(i => i.status === 'PAID').length;
  const totalUnpaidCount = invoices.filter(i => i.status !== 'PAID').length;

  const liveCalcNgn = itemRows.reduce((acc, row) => acc + (Number(row.total_ngn) || Number(row.price_ngn) || 0), 0) +
    serviceRows.reduce((acc, row) => acc + (Number(row.price_ngn) || 0), 0);
  const liveCalcGbp = itemRows.reduce((acc, row) => acc + (Number(row.total_gbp) || Number(row.price_gbp) || 0), 0) +
    serviceRows.reduce((acc, row) => acc + (Number(row.price_gbp) || 0), 0);

  return (
    <>
      <div className="p-6 space-y-6 max-w-7xl mx-auto print:hidden">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7 text-sky-600" />
              <span>Invoices & Receipts Management</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Mintana Global Logistics — Generate, track, print PDF invoices, and share receipts via WhatsApp.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCreateReceiptModalOpen(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Create Receipt</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-sky-600/20 transition duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Invoice</span>
            </button>
          </div>
        </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced (NGN)</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              ₦{totalInvoicedNgn.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced (GBP)</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              £{totalInvoicedGbp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipts / Paid</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {totalPaidCount} <span className="text-xs font-normal text-slate-500">Parcels</span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payment</p>
            <h3 className="text-xl font-bold text-amber-600 mt-0.5">
              {totalUnpaidCount} <span className="text-xs font-normal text-slate-500">Invoices</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'invoices'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices ({filteredInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'receipts'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Official Receipts ({filteredReceipts.length})
            </button>
          </div>

          {/* Search Input & Status Filter */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search parcel #, client..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {activeTab === 'invoices' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            )}
          </div>
        </div>

        {/* INVOICES TABLE */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Receiver & Contact</th>
                  <th className="py-3 px-4">Parcel No</th>
                  <th className="py-3 px-4 text-right">Total (NGN)</th>
                  <th className="py-3 px-4 text-right">Total (GBP)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Loading invoices...</td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No invoices found.</td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">#{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{inv.receiver_name || 'Valued Client'}</p>
                        <p className="text-xs text-slate-500">{inv.receiver_tel || inv.receiver_email || 'No phone'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {inv.expected_parcel_no || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        ₦{(Number(inv.total_ngn) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        £{(Number(inv.total_gbp) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setSelectedReceipt(null);
                              setIsModalOpen(true);
                            }}
                            title="View Invoice"
                            className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition flex items-center space-x-1"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            title="Download PDF"
                            className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition text-xs font-semibold flex items-center space-x-1 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(inv)}
                            title="Edit Invoice"
                            className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              title="Mark Paid & Generate Receipt"
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setSelectedReceipt(null);
                              setIsModalOpen(true);
                            }}
                            title="Share Invoice"
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            title="Delete Invoice"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* RECEIPTS TABLE */}
        {activeTab === 'receipts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Receiver / Client</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Paid (NGN)</th>
                  <th className="py-3 px-4 text-right">Paid (GBP)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading receipts...</td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No payment receipts issued yet.</td>
                  </tr>
                ) : (
                  filteredReceipts.map(rcpt => (
                    <tr key={rcpt.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">#{rcpt.receipt_number}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {rcpt.payment_date ? new Date(rcpt.payment_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {rcpt.invoice?.receiver_name || 'Client'}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        {rcpt.payment_method}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₦{(rcpt.amount_paid_ngn || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        £{(rcpt.amount_paid_gbp || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedReceipt(rcpt);
                              setSelectedInvoice(null);
                              setIsModalOpen(true);
                            }}
                            title="View Receipt"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition flex items-center space-x-1"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDownloadReceipt(rcpt)}
                            title="Download PDF"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-xs font-semibold flex items-center space-x-1 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedReceipt(rcpt);
                              setSelectedInvoice(null);
                              setIsModalOpen(true);
                            }}
                            title="Share via WhatsApp"
                            className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteReceipt(rcpt.id)}
                            title="Delete Receipt"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Printable Mintana Invoice / Receipt Modal */}
      <MintanaInvoiceReceiptModal
        invoice={selectedInvoice}
        receipt={selectedReceipt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Create Invoice Modal Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <span>Create Mintana Logistics Invoice</span>
                </h3>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Rate: £1 = ₦{exchangeRate.toLocaleString()}
                </span>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-sm">
              
              {/* Client Selector & Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select CRM Contact (Optional)</label>
                  <select
                    value={formData.contact_id}
                    onChange={e => handleContactSelect(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Choose Existing Contact --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email || c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver's Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.receiver_name}
                    onChange={e => setFormData({ ...formData, receiver_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver's Phone / Tel</label>
                  <input
                    type="text"
                    placeholder="e.g. +234 806 756 7457"
                    value={formData.receiver_tel}
                    onChange={e => setFormData({ ...formData, receiver_tel: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver's Email</label>
                  <input
                    type="email"
                    placeholder="receiver@example.com"
                    value={formData.receiver_email}
                    onChange={e => setFormData({ ...formData, receiver_email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Delivery & Parcel Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sky-50/60 p-4 rounded-xl border border-sky-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Parcel No</label>
                  <input
                    type="text"
                    placeholder="e.g. MNT-998273"
                    value={formData.expected_parcel_no}
                    onChange={e => setFormData({ ...formData, expected_parcel_no: e.target.value })}
                    className="w-full p-2 bg-white border border-sky-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parcel Handler</label>
                  <input
                    type="text"
                    value={formData.parcel_handler}
                    onChange={e => setFormData({ ...formData, parcel_handler: e.target.value })}
                    className="w-full p-2 bg-white border border-sky-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Value of Items (NGN)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.total_value_items}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormData({ ...formData, total_value_items: e.target.value })}
                    className="w-full p-2 bg-white border border-sky-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receiver's Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="Full street address..."
                  value={formData.receiver_address}
                  onChange={e => setFormData({ ...formData, receiver_address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Item Breakdown Rows */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-900">Parcel Items Breakdown</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold px-3 py-1 rounded-lg transition"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-2">
                  {itemRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5 sm:hidden">Nature of Item</label>
                        <input
                          type="text"
                          placeholder="Nature of Item (e.g. Clothes)"
                          value={row.nature_of_item}
                          onChange={e => handleUpdateItemRow(idx, 'nature_of_item', e.target.value)}
                          className="w-full p-1.5 bg-white border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5 sm:hidden">Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={row.weight_kg}
                          onFocus={e => e.target.select()}
                          onChange={e => handleUpdateItemRow(idx, 'weight_kg', e.target.value)}
                          className="w-full p-1.5 bg-white border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5 sm:hidden">Price (NGN)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={row.price_ngn}
                          onFocus={e => e.target.select()}
                          onChange={e => handleUpdateItemRow(idx, 'price_ngn', e.target.value)}
                          className="w-full p-1.5 bg-white border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5 sm:hidden">Price (GBP)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={row.price_gbp}
                          onFocus={e => e.target.select()}
                          onChange={e => handleUpdateItemRow(idx, 'price_gbp', e.target.value)}
                          className="w-full p-1.5 bg-white border rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Breakdown (Packaging, Doorstep Delivery) */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Additional Services Fees (Auto-Converts)</h4>
                <div className="space-y-2">
                  {serviceRows.map((srv, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs items-center">
                      <span className="font-semibold text-slate-800">{srv.service_name}</span>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5 sm:hidden">Price (NGN)</label>
                        <input
                          type="number"
                          placeholder="Price (NGN ₦)"
                          value={srv.price_ngn}
                          onFocus={e => e.target.select()}
                          onChange={e => handleUpdateServiceRow(idx, 'price_ngn', e.target.value)}
                          className="w-full p-1.5 bg-white border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5 sm:hidden">Price (GBP)</label>
                        <input
                          type="number"
                          placeholder="Price (GBP £)"
                          value={srv.price_gbp}
                          onFocus={e => e.target.select()}
                          onChange={e => handleUpdateServiceRow(idx, 'price_gbp', e.target.value)}
                          className="w-full p-1.5 bg-white border rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA URL */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shipping Terms & SLA Link</label>
                <input
                  type="url"
                  value={formData.sla_terms_url}
                  onChange={e => setFormData({ ...formData, sla_terms_url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Live Invoice Total Summary Bar */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Calculated Invoice Total</span>
                <div className="flex items-center space-x-3 text-sm font-extrabold">
                  <span className="text-sky-700">₦{liveCalcNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-blue-900">£{liveCalcGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-600/20"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal Form */}
      {isEditModalOpen && editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8 border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-amber-700 text-white sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-300" />
                  <span>Edit Invoice #{editingInvoice.invoice_number}</span>
                </h3>
                <span className="text-xs bg-amber-600 text-amber-100 border border-amber-500 px-2.5 py-0.5 rounded-full font-bold">
                  Exchange Rate: £1 = ₦{exchangeRate.toLocaleString()}
                </span>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingInvoice(null); }} className="text-slate-200 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditInvoiceSubmit} className="p-6 space-y-6 text-sm">
              {/* Receiver Info & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Client / Contact</label>
                  <select
                    value={formData.contact_id}
                    onChange={e => handleContactSelect(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Direct Input (No Link) --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email || c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.receiver_name}
                    onChange={e => setFormData({ ...formData, receiver_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>



                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver Phone Number</label>
                  <input
                    type="text"
                    value={formData.receiver_tel}
                    onChange={e => setFormData({ ...formData, receiver_tel: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver Email</label>
                  <input
                    type="email"
                    value={formData.receiver_email}
                    onChange={e => setFormData({ ...formData, receiver_email: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Parcel No</label>
                  <input
                    type="text"
                    value={formData.expected_parcel_no}
                    onChange={e => setFormData({ ...formData, expected_parcel_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-sky-600" />
                    <span>Item Details & Charges</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold px-3 py-1.5 rounded-lg border border-sky-200 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date of Service</th>
                        <th className="p-2.5">Nature of Item</th>
                        <th className="p-2.5 w-24">Weight (kg)</th>
                        <th className="p-2.5 w-32">Price (NGN ₦)</th>
                        <th className="p-2.5 w-32">Price (GBP £)</th>
                        <th className="p-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="date"
                              value={row.dos}
                              onChange={e => handleUpdateItemRow(idx, 'dos', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="e.g. Personal Clothing"
                              value={row.nature_of_item}
                              onChange={e => handleUpdateItemRow(idx, 'nature_of_item', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={row.weight_kg}
                              onChange={e => handleUpdateItemRow(idx, 'weight_kg', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={row.price_ngn}
                              onFocus={e => e.target.select()}
                              onChange={e => handleUpdateItemRow(idx, 'price_ngn', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={row.price_gbp}
                              onFocus={e => e.target.select()}
                              onChange={e => handleUpdateItemRow(idx, 'price_gbp', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {itemRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Service Charges Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Additional Services & Fees</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddServiceRow}
                    className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Service Fee</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Service Description</th>
                        <th className="p-2.5 w-36">Price (NGN ₦)</th>
                        <th className="p-2.5 w-36">Price (GBP £)</th>
                        <th className="p-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {serviceRows.map((sRow, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="e.g. Doorstep Delivery Fee"
                              value={sRow.service_name}
                              onChange={e => handleUpdateServiceRow(idx, 'service_name', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={sRow.price_ngn}
                              onFocus={e => e.target.select()}
                              onChange={e => handleUpdateServiceRow(idx, 'price_ngn', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={sRow.price_gbp}
                              onFocus={e => e.target.select()}
                              onChange={e => handleUpdateServiceRow(idx, 'price_gbp', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {serviceRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceRow(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculated Totals Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Calculated Total</p>
                  <p className="text-xs text-slate-300">Sum of items + services</p>
                </div>
                <div className="text-right font-bold text-lg">
                  <span className="text-emerald-400 mr-4">₦{liveCalcNgn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-blue-400">£{liveCalcGbp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingInvoice(null); }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/20"
                >
                  Update Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Receipt Modal Form */}
      {isCreateReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8 border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 bg-emerald-900 text-white">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>Create Official Payment Receipt</span>
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Rate: £1 = ₦{exchangeRate.toLocaleString()}
                </span>
              </div>
              <button onClick={() => setIsCreateReceiptModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReceiptSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Client / Contact (Optional)</label>
                <select
                  value={receiptFormData.contact_id}
                  onChange={e => setReceiptFormData({ ...receiptFormData, contact_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Existing Contact --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email || c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Link to Invoice (Optional)</label>
                <select
                  value={receiptFormData.invoice_id}
                  onChange={e => setReceiptFormData({ ...receiptFormData, invoice_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Direct Receipt (No Invoice Link) --</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.invoice_number} - {inv.receiver_name} (₦{inv.total_ngn} / £{inv.total_gbp})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dual-Currency Payment Input Fields with Auto-Conversion */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Amount Paid (Auto-Converts)</span>
                  <span className="text-[11px] text-emerald-700 font-medium">Exchange Rate applied automatically</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (NGN ₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={receiptFormData.amount_paid_ngn}
                      onFocus={e => e.target.select()}
                      onChange={e => handleReceiptAmountNgnChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (GBP £)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={receiptFormData.amount_paid_gbp}
                      onFocus={e => e.target.select()}
                      onChange={e => handleReceiptAmountGbpChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={receiptFormData.payment_method}
                    onChange={e => setReceiptFormData({ ...receiptFormData, payment_method: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash Payment</option>
                    <option value="CARD">Card / POS</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / Transaction No.</label>
                  <input
                    type="text"
                    placeholder="e.g. REF-987654"
                    value={receiptFormData.reference_number}
                    onChange={e => setReceiptFormData({ ...receiptFormData, reference_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Payment notes..."
                  value={receiptFormData.notes}
                  onChange={e => setReceiptFormData({ ...receiptFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateReceiptModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20"
                >
                  Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
};
