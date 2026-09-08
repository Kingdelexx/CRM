import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, TrendingUp, UserCheck, Package, 
  MessageSquare, AlertCircle, Trash2, Edit3, Eye, Zap, CheckCircle2, X, Users, DollarSign
} from 'lucide-react';
import type { CSRReport, CSRReportType, User } from '../types/crm';
import { apiClient as api } from '../api/client';

interface CSRReportsWorkspaceProps {
  currentUser?: User;
}

export const CSRReportsWorkspace: React.FC<CSRReportsWorkspaceProps> = ({ currentUser: propsCurrentUser }) => {
  const currentUser = useMemo(() => {
    if (propsCurrentUser) return propsCurrentUser;
    const raw = localStorage.getItem('current_user');
    return raw ? JSON.parse(raw) : null;
  }, [propsCurrentUser]);

  const [reports, setReports] = useState<CSRReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReportForView, setSelectedReportForView] = useState<CSRReport | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    report_type: 'DAILY' as CSRReportType,
    reported_to_id: '',
    staff_id: currentUser?.id || '',

    // 12 Daily Metrics
    new_enquiries: 0,
    packages_expected: 0,
    quotation_sent: 0,
    shipment_booked: 0,
    outstanding_follow_up: 0,
    customer_complaint_resolved: 0,
    returning_customers: 0,
    packages_received: 0,
    customer_converted_paid: 0,
    follow_up_completed: 0,
    customer_complaint_received: 0,
    customer_escalated_to_manager: 0,

    // Weekly Qualitative Details
    shipment_delays_and_reason: '',
    biggest_challenge_week: '',
    support_needed: '',
    biggest_achievement_week: '',
    suggestion_for_improvement: '',

    // Monthly Details
    social_media_follows_encouraged: 0,
    video_testimonial_received: 0,
    biggest_challenge_month: '',
    biggest_achievement_month: ''
  });

  const [isAggregating, setIsAggregating] = useState(false);
  const [aggDateRange, setAggDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = '/csr-reports/?';
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (selectedTypeFilter !== 'ALL') url += `report_type=${selectedTypeFilter}&`;
      if (startDateFilter) url += `start_date=${startDateFilter}&`;
      if (endDateFilter) url += `end_date=${endDateFilter}&`;

      const res = await api.get(url);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch CSR reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/accounts');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchUsers();
  }, [selectedTypeFilter, startDateFilter, endDateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handleOpenCreateModal = () => {
    setEditingReportId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      report_type: 'DAILY',
      reported_to_id: '',
      staff_id: currentUser?.id || '',
      new_enquiries: 0,
      packages_expected: 0,
      quotation_sent: 0,
      shipment_booked: 0,
      outstanding_follow_up: 0,
      customer_complaint_resolved: 0,
      returning_customers: 0,
      packages_received: 0,
      customer_converted_paid: 0,
      follow_up_completed: 0,
      customer_complaint_received: 0,
      customer_escalated_to_manager: 0,
      shipment_delays_and_reason: '',
      biggest_challenge_week: '',
      support_needed: '',
      biggest_achievement_week: '',
      suggestion_for_improvement: '',
      social_media_follows_encouraged: 0,
      video_testimonial_received: 0,
      biggest_challenge_month: '',
      biggest_achievement_month: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (report: CSRReport) => {
    setEditingReportId(report.id);
    setFormData({
      date: report.date || new Date().toISOString().split('T')[0],
      report_type: report.report_type,
      reported_to_id: report.reported_to?.id || '',
      staff_id: report.staff?.id || currentUser?.id || '',
      new_enquiries: report.new_enquiries || 0,
      packages_expected: report.packages_expected || 0,
      quotation_sent: report.quotation_sent || 0,
      shipment_booked: report.shipment_booked || 0,
      outstanding_follow_up: report.outstanding_follow_up || 0,
      customer_complaint_resolved: report.customer_complaint_resolved || 0,
      returning_customers: report.returning_customers || 0,
      packages_received: report.packages_received || 0,
      customer_converted_paid: report.customer_converted_paid || 0,
      follow_up_completed: report.follow_up_completed || 0,
      customer_complaint_received: report.customer_complaint_received || 0,
      customer_escalated_to_manager: report.customer_escalated_to_manager || 0,
      shipment_delays_and_reason: report.shipment_delays_and_reason || '',
      biggest_challenge_week: report.biggest_challenge_week || '',
      support_needed: report.support_needed || '',
      biggest_achievement_week: report.biggest_achievement_week || '',
      suggestion_for_improvement: report.suggestion_for_improvement || '',
      social_media_follows_encouraged: report.social_media_follows_encouraged || 0,
      video_testimonial_received: report.video_testimonial_received || 0,
      biggest_challenge_month: report.biggest_challenge_month || '',
      biggest_achievement_month: report.biggest_achievement_month || ''
    });
    setIsCreateModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleAutoAggregate = async () => {
    try {
      setIsAggregating(true);
      let url = `/csr-reports/aggregate?start_date=${aggDateRange.start_date}&end_date=${aggDateRange.end_date}`;
      if (formData.staff_id) {
        url += `&staff_id=${formData.staff_id}`;
      }

      const res = await api.get(url);
      const data = res.data;

      setFormData(prev => ({
        ...prev,
        new_enquiries: data.new_enquiries || 0,
        packages_expected: data.packages_expected || 0,
        quotation_sent: data.quotation_sent || 0,
        shipment_booked: data.shipment_booked || 0,
        outstanding_follow_up: data.outstanding_follow_up || 0,
        customer_complaint_resolved: data.customer_complaint_resolved || 0,
        returning_customers: data.returning_customers || 0,
        packages_received: data.packages_received || 0,
        customer_converted_paid: data.customer_converted_paid || 0,
        follow_up_completed: data.follow_up_completed || 0,
        customer_complaint_received: data.customer_complaint_received || 0,
        customer_escalated_to_manager: data.customer_escalated_to_manager || 0
      }));

      alert(`Successfully aggregated metrics from ${data.count_daily_reports} daily reports!`);
    } catch (err) {
      console.error('Failed to aggregate daily reports:', err);
      alert('Error fetching aggregated metrics for the date range.');
    } finally {
      setIsAggregating(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        staff_id: formData.staff_id || currentUser?.id || null,
        reported_to_id: formData.reported_to_id || null,
      };

      if (!payload.staff_id) delete payload.staff_id;
      if (!payload.reported_to_id) delete payload.reported_to_id;

      if (editingReportId) {
        await api.put(`/csr-reports/${editingReportId}/`, payload);
      } else {
        await api.post('/csr-reports/', payload);
      }
      setIsCreateModalOpen(false);
      fetchReports();
    } catch (err: any) {
      console.error('Failed to save CSR report:', err);
      const msg = err?.message || err?.response?.data?.detail || 'Failed to save report. Please check your form inputs.';
      alert(`Error saving report: ${msg}`);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this CSR report?')) return;
    try {
      await api.delete(`/csr-reports/${id}/`);
      fetchReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  // Metric aggregates for cards
  const totalEnquiries = reports.reduce((acc, r) => acc + (r.new_enquiries || 0), 0);
  const totalShipmentsBooked = reports.reduce((acc, r) => acc + (r.shipment_booked || 0), 0);
  const totalConvertedPaid = reports.reduce((acc, r) => acc + (r.customer_converted_paid || 0), 0);
  const totalComplaintsResolved = reports.reduce((acc, r) => acc + (r.customer_complaint_resolved || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            CSR Reporting System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily customer service rep metrics, weekly rollups, and monthly evaluations.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Submit CSR Report
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">New Enquiries</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{totalEnquiries}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Shipments Booked</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{totalShipmentsBooked}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Customers Paid (Converted)</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{totalConvertedPaid}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Complaints Resolved</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{totalComplaintsResolved}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff, challenges, or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Type Switcher */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
              {['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    selectedTypeFilter === t
                      ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Date Filters */}
            <input
              type="date"
              value={startDateFilter}
              onChange={e => setStartDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={e => setEndDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {(searchQuery || startDateFilter || endDateFilter || selectedTypeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTypeFilter('ALL');
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="text-xs text-indigo-600 hover:underline px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Reports Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading CSR reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No CSR Reports Found</div>
            <p className="text-sm text-slate-400">Click "Submit CSR Report" to create your first report entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4">Reported To</th>
                  <th className="py-3.5 px-4 text-center">Enquiries</th>
                  <th className="py-3.5 px-4 text-center">Shipments</th>
                  <th className="py-3.5 px-4 text-center">Paid (Converted)</th>
                  <th className="py-3.5 px-4 text-center">Complaints</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {report.date || new Date(report.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        report.report_type === 'DAILY'
                          ? 'bg-blue-100 text-blue-700'
                          : report.report_type === 'WEEKLY'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {report.report_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {report.staff ? `${report.staff.first_name} ${report.staff.last_name}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {report.reported_to ? `${report.reported_to.first_name} ${report.reported_to.last_name}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {report.new_enquiries}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {report.shipment_booked}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">
                      {report.customer_converted_paid}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-slate-600 font-medium">{report.customer_complaint_received}</span>
                      <span className="text-xs text-slate-400 ml-1">({report.customer_complaint_resolved} res)</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedReportForView(report)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                          title="View Full Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(report)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100"
                          title="Edit Report"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Full Details */}
      {selectedReportForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedReportForView.report_type === 'DAILY' ? 'bg-blue-100 text-blue-700' :
                    selectedReportForView.report_type === 'WEEKLY' ? 'bg-purple-100 text-purple-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedReportForView.report_type} REPORT
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">
                    {selectedReportForView.date || 'CSR Report Details'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Submitted by {selectedReportForView.staff?.first_name} {selectedReportForView.staff?.last_name} 
                  {selectedReportForView.reported_to && ` to ${selectedReportForView.reported_to.first_name} ${selectedReportForView.reported_to.last_name}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedReportForView(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Daily Metrics Breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Key Performance Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'New Enquiries', val: selectedReportForView.new_enquiries },
                    { label: 'Packages Expected', val: selectedReportForView.packages_expected },
                    { label: 'Quotation Sent', val: selectedReportForView.quotation_sent },
                    { label: 'Shipment Booked', val: selectedReportForView.shipment_booked },
                    { label: 'Outstanding Follow-up', val: selectedReportForView.outstanding_follow_up },
                    { label: 'Follow-up Completed', val: selectedReportForView.follow_up_completed },
                    { label: 'Packages Received', val: selectedReportForView.packages_received },
                    { label: 'Returning Customers', val: selectedReportForView.returning_customers },
                    { label: 'Customer Converted (Paid)', val: selectedReportForView.customer_converted_paid, highlight: true },
                    { label: 'Complaints Received', val: selectedReportForView.customer_complaint_received },
                    { label: 'Complaints Resolved', val: selectedReportForView.customer_complaint_resolved },
                    { label: 'Escalated to Manager', val: selectedReportForView.customer_escalated_to_manager }
                  ].map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border text-sm ${item.highlight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className={`text-lg font-bold mt-1 ${item.highlight ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {item.val || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Details */}
              {selectedReportForView.report_type === 'WEEKLY' && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="text-sm font-semibold text-purple-700 uppercase tracking-wider">
                    Weekly Highlights & Feedback
                  </h4>

                  {selectedReportForView.shipment_delays_and_reason && (
                    <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-lg text-sm">
                      <div className="font-semibold text-amber-800 text-xs">Shipment Delays & Reason</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.shipment_delays_and_reason}</div>
                    </div>
                  )}

                  {selectedReportForView.biggest_challenge_week && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm">
                      <div className="font-semibold text-slate-700 text-xs">Biggest Challenge This Week</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.biggest_challenge_week}</div>
                    </div>
                  )}

                  {selectedReportForView.support_needed && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm">
                      <div className="font-semibold text-slate-700 text-xs">Support Needed</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.support_needed}</div>
                    </div>
                  )}

                  {selectedReportForView.biggest_achievement_week && (
                    <div className="bg-purple-50/50 p-3.5 rounded-lg border border-purple-200 text-sm">
                      <div className="font-semibold text-purple-800 text-xs">Biggest Achievement This Week</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.biggest_achievement_week}</div>
                    </div>
                  )}

                  {selectedReportForView.suggestion_for_improvement && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm">
                      <div className="font-semibold text-slate-700 text-xs">Suggestions for Improvement</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.suggestion_for_improvement}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Details */}
              {selectedReportForView.report_type === 'MONTHLY' && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">
                    Monthly Performance Review & Engagement
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm">
                      <div className="text-xs text-emerald-800 font-medium">Social Media Follows Encouraged</div>
                      <div className="text-xl font-bold text-emerald-900 mt-1">
                        {selectedReportForView.social_media_follows_encouraged || 0}
                      </div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-sm">
                      <div className="text-xs text-indigo-800 font-medium">Video Testimonials Received</div>
                      <div className="text-xl font-bold text-indigo-900 mt-1">
                        {selectedReportForView.video_testimonial_received || 0}
                      </div>
                    </div>
                  </div>

                  {selectedReportForView.biggest_challenge_month && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm">
                      <div className="font-semibold text-slate-700 text-xs">Biggest Challenge This Month</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.biggest_challenge_month}</div>
                    </div>
                  )}

                  {selectedReportForView.biggest_achievement_month && (
                    <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200 text-sm">
                      <div className="font-semibold text-emerald-800 text-xs">Biggest Achievement This Month</div>
                      <div className="text-slate-700 mt-1">{selectedReportForView.biggest_achievement_month}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Report Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingReportId ? 'Edit CSR Report' : 'Submit New CSR Report'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fill in your daily, weekly, or monthly performance data.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Report Type</label>
                  <select
                    name="report_type"
                    value={formData.report_type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  >
                    <option value="DAILY">Daily Report</option>
                    <option value="WEEKLY">Weekly Report</option>
                    <option value="MONTHLY">Monthly Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reported To (Admin / Manager)</label>
                  <select
                    name="reported_to_id"
                    value={formData.reported_to_id}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select Recipient...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto Aggregation Helper for Weekly & Monthly */}
              {formData.report_type !== 'DAILY' && (
                <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      Auto-Aggregate Daily Numbers
                    </div>
                    <span className="text-xs text-indigo-600">
                      Calculates exact sum from daily entries
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>Start Date:</span>
                      <input
                        type="date"
                        value={aggDateRange.start_date}
                        onChange={e => setAggDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                        className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>End Date:</span>
                      <input
                        type="date"
                        value={aggDateRange.end_date}
                        onChange={e => setAggDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                        className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoAggregate}
                      disabled={isAggregating}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {isAggregating ? 'Calculating Sums...' : `Auto-fill Totals for ${formData.report_type}`}
                    </button>
                  </div>
                </div>
              )}

              {/* 12 Daily Numerical Metrics */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">
                  CSR Details (Quantitative Metrics)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: 'new_enquiries', label: 'New Enquiries' },
                    { key: 'packages_expected', label: 'Packages Expected' },
                    { key: 'quotation_sent', label: 'Quotation Sent' },
                    { key: 'shipment_booked', label: 'Shipment Booked' },
                    { key: 'outstanding_follow_up', label: 'Outstanding Follow-Up' },
                    { key: 'follow_up_completed', label: 'Follow-Up Completed' },
                    { key: 'packages_received', label: 'Packages Received' },
                    { key: 'returning_customers', label: 'Returning Customers' },
                    { key: 'customer_converted_paid', label: 'Customer Converted (Paid)' },
                    { key: 'customer_complaint_received', label: 'Customer Complaint Received' },
                    { key: 'customer_complaint_resolved', label: 'Customer Complaint Resolved' },
                    { key: 'customer_escalated_to_manager', label: 'Customer Escalated to Manager' }
                  ].map(item => (
                    <div key={item.key} className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{item.label}</label>
                      <input
                        type="number"
                        min="0"
                        name={item.key}
                        value={(formData as any)[item.key]}
                        onChange={handleFormChange}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Qualitative Section */}
              {formData.report_type === 'WEEKLY' && (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h4 className="text-sm font-semibold text-purple-700">
                    Weekly Report Details (Qualitative)
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shipment Delays and Reason for Delay
                    </label>
                    <textarea
                      name="shipment_delays_and_reason"
                      rows={2}
                      value={formData.shipment_delays_and_reason}
                      onChange={handleFormChange}
                      placeholder="Detail any shipment delays experienced this week..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Biggest Challenge This Week
                      </label>
                      <textarea
                        name="biggest_challenge_week"
                        rows={2}
                        value={formData.biggest_challenge_week}
                        onChange={handleFormChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Support Needed
                      </label>
                      <textarea
                        name="support_needed"
                        rows={2}
                        value={formData.support_needed}
                        onChange={handleFormChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Biggest Achievement This Week
                      </label>
                      <textarea
                        name="biggest_achievement_week"
                        rows={2}
                        value={formData.biggest_achievement_week}
                        onChange={handleFormChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Suggestion for Improvement
                      </label>
                      <textarea
                        name="suggestion_for_improvement"
                        rows={2}
                        value={formData.suggestion_for_improvement}
                        onChange={handleFormChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Section */}
              {formData.report_type === 'MONTHLY' && (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h4 className="text-sm font-semibold text-emerald-700">
                    Monthly Report Details & Reviews
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Social Media Follows Encouraged
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="social_media_follows_encouraged"
                        value={formData.social_media_follows_encouraged}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Video Testimonial Received
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="video_testimonial_received"
                        value={formData.video_testimonial_received}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Biggest Challenge This Month
                      </label>
                      <textarea
                        name="biggest_challenge_month"
                        rows={2}
                        value={formData.biggest_challenge_month}
                        onChange={handleFormChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Biggest Achievement This Month
                      </label>
                      <textarea
                        name="biggest_achievement_month"
                        rows={2}
                        value={formData.biggest_achievement_month}
                        onChange={handleFormChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                >
                  {editingReportId ? 'Update Report' : 'Save & Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
