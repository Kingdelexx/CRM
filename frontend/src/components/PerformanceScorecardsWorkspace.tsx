import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/api/client';
import type { User, PerformanceScorecard, PerformanceScorecardType, PerformanceRating, ScorecardKPI, ScorecardActivityMetric, ScorecardPerformanceMetric, CSRReport } from '@/types/crm';
import {
  Award, Plus, Search, Calendar, UserCheck, ShieldCheck, Printer, Trash2, Edit3, CheckCircle2, ChevronRight, FileText, BarChart2, Star, Sparkles, Filter, X, Save, Eye
} from 'lucide-react';

interface Props {
  currentUser: User | null;
}

const SCORECARD_TEMPLATES: Record<PerformanceScorecardType, { 
  title: string;
  subtitle: string;
  roleTag: string;
  periodDefaultLabel: string;
  kpis: { kpi: string; target: string }[];
  activities: { activity: string; label: string }[];
  performances: { metric: string; label: string }[];
}> = {
  CS_AGENT_WEEKLY: {
    title: 'Customer Support Agent Weekly Performance Scorecard',
    subtitle: 'Weekly performance appraisal & key metrics evaluation for Customer Support Representatives',
    roleTag: 'Customer Support Agent',
    periodDefaultLabel: `Week ${getWeekNumber(new Date())}, ${new Date().getFullYear()}`,
    kpis: [
      { kpi: 'First Response Time', target: '3-5 minutes' },
      { kpi: 'CRM Compliance', target: '100%' },
      { kpi: 'Follow-up Completion', target: '100%' },
      { kpi: 'Customer Ownership', target: '100%' },
      { kpi: 'Quotation Turnaround', target: 'Within 30 minutes' },
      { kpi: 'Shipment Status Updates', target: '100%' },
      { kpi: 'Task Completion', target: '100%' },
      { kpi: 'Daily Report Submission', target: '100%' },
      { kpi: 'Attendance & Punctuality', target: '100%' },
      { kpi: 'Professional Communication', target: '100%' },
    ],
    activities: [
      { activity: 'New Customers Converted', label: 'New Customers Converted' },
      { activity: 'Returning Customers Assisted', label: 'Returning Customers Assisted' },
      { activity: 'Follow-ups Completed', label: 'Follow-ups Completed' },
      { activity: 'Google Reviews Obtained', label: 'Google Reviews Obtained' },
      { activity: 'Video Testimonials Received', label: 'Video Testimonials Received' },
      { activity: 'Customer Referrals', label: 'Customer Referrals' },
      { activity: 'Social Media Follows Encouraged', label: 'Social Media Follows Encouraged' },
    ],
    performances: []
  },
  CS_AGENT_MONTHLY: {
    title: 'Customer Support Agent Monthly Performance Scorecard',
    subtitle: 'Monthly aggregated KPI evaluation, customer activity, and growth audit for CS personnel',
    roleTag: 'Customer Support Agent',
    periodDefaultLabel: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    kpis: [
      { kpi: 'First Response Time', target: '95% within 5 minutes' },
      { kpi: 'CRM Compliance', target: '100%' },
      { kpi: 'Follow-up Completion', target: '100%' },
      { kpi: 'Customer Ownership', target: '100%' },
      { kpi: 'Quotation Turnaround', target: 'Within 30 minutes' },
      { kpi: 'Shipment Status Updates', target: '100%' },
      { kpi: 'Task Completion', target: '100%' },
      { kpi: 'Daily Report Submission', target: '100%' },
      { kpi: 'Attendance & Punctuality', target: '100%' },
      { kpi: 'Professional Communication', target: '100%' },
    ],
    activities: [
      { activity: 'New Enquiries Handled', label: 'New Enquiries Handled' },
      { activity: 'Existing Customers Assisted', label: 'Existing Customers Assisted' },
      { activity: 'Returning Customers Assisted', label: 'Returning Customers Assisted' },
      { activity: 'Quotations Sent', label: 'Quotations Sent' },
      { activity: 'Customers Converted', label: 'Customers Converted' },
      { activity: 'Payments Confirmed', label: 'Payments Confirmed' },
      { activity: 'Shipments Booked', label: 'Shipments Booked' },
      { activity: 'Follow-ups Completed', label: 'Follow-ups Completed' },
      { activity: 'Outstanding Follow-ups', label: 'Outstanding Follow-ups' },
      { activity: 'Customers Handed Over', label: 'Customers Handed Over' },
    ],
    performances: [
      { metric: 'Google Reviews Obtained', label: 'Google Reviews Obtained' },
      { metric: 'Video Testimonials Received', label: 'Video Testimonials Received' },
      { metric: 'Customer Referrals', label: 'Customer Referrals' },
      { metric: 'Returning Customers Retained', label: 'Returning Customers Retained' },
      { metric: 'Social Media Follows Encouraged', label: 'Social Media Follows Encouraged' },
    ]
  },
  SM_MANAGER_WEEKLY: {
    title: 'Social Media Manager Weekly Performance Scorecard',
    subtitle: 'Weekly content output, campaign execution, and community response scorecard',
    roleTag: 'Social Media Manager',
    periodDefaultLabel: `Week ${getWeekNumber(new Date())}, ${new Date().getFullYear()}`,
    kpis: [
      { kpi: 'Content Publishing', target: '5 approved posts' },
      { kpi: 'Story Publishing', target: 'Stories every day' },
      { kpi: 'Content Planning', target: "Next week's content prepared" },
      { kpi: 'Content Buffer', target: '1 week of approved content ahead' },
      { kpi: 'Weekly Report', target: 'Submitted every Friday' },
      { kpi: 'Content Quality', target: 'Meets brand standards' },
      { kpi: 'Assigned Tasks', target: '100% completed on time' },
      { kpi: 'Strategy Participation', target: 'Attend & contribute to reviews/meetings' },
      { kpi: 'Content Organization', target: 'All creatives/captions properly organized' },
    ],
    activities: [
      { activity: 'Posts Published', label: 'Posts Published' },
      { activity: 'Stories Published', label: 'Stories Published' },
      { activity: 'Reels Published', label: 'Reels Published' },
      { activity: 'Content Created', label: 'Content Created' },
      { activity: 'Content Submitted for Review', label: 'Content Submitted for Review' },
      { activity: 'Content Approved', label: 'Content Approved' },
      { activity: 'Content Scheduled for Next Week', label: 'Content Scheduled for Next Week' },
      { activity: 'Outstanding Content', label: 'Outstanding Content' },
      { activity: 'Pending Revisions', label: 'Pending Revisions' },
    ],
    performances: [
      { metric: 'Total Reach', label: 'Total Reach' },
      { metric: 'Total Impressions', label: 'Total Impressions' },
      { metric: 'Total Engagement', label: 'Total Engagement' },
      { metric: 'Profile Visits', label: 'Profile Visits' },
      { metric: 'Followers Gained', label: 'Followers Gained' },
      { metric: 'Best Performing Content', label: 'Best Performing Content' },
      { metric: 'Lowest Performing Content', label: 'Lowest Performing Content' },
    ]
  },
  SM_MANAGER_MONTHLY: {
    title: 'Social Media Manager Monthly Performance Scorecard',
    subtitle: 'Monthly social strategy audit, channel reach growth, content volume & lead ROI assessment',
    roleTag: 'Social Media Manager',
    periodDefaultLabel: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    kpis: [
      { kpi: 'Content Publishing', target: '100% of approved scheduled content' },
      { kpi: 'Story Publishing', target: 'Stories every day' },
      { kpi: 'Content Planning', target: 'Monthly content calendar submitted on time' },
      { kpi: 'Content Buffer', target: 'Maintain 1 week of approved content ahead' },
      { kpi: 'Monthly Report', target: 'Submitted by 1st–3rd of following month' },
      { kpi: 'Content Quality', target: 'Meets brand standards consistently' },
      { kpi: 'Assigned Tasks & Projects', target: '100% completed on time' },
      { kpi: 'Strategy Participation', target: 'Participate in reviews and contribute ideas' },
      { kpi: 'Content Organization', target: 'Creatives, captions & assets properly organized' },
      { kpi: 'Brand Consistency', target: 'Consistent brand voice and visual standards' },
    ],
    activities: [
      { activity: 'Posts Published', label: 'Posts Published' },
      { activity: 'Stories Published', label: 'Stories Published' },
      { activity: 'Reels Published', label: 'Reels Published' },
      { activity: 'Content Created', label: 'Content Created' },
      { activity: 'Content Submitted for Review', label: 'Content Submitted for Review' },
      { activity: 'Content Approved', label: 'Content Approved' },
      { activity: 'Content Scheduled', label: 'Content Scheduled' },
      { activity: 'Content Requiring Revision', label: 'Content Requiring Revision' },
      { activity: 'Outstanding Content', label: 'Outstanding Content' },
      { activity: 'Campaigns Executed', label: 'Campaigns Executed' },
    ],
    performances: [
      { metric: 'Total Reach', label: 'Total Reach' },
      { metric: 'Total Impressions', label: 'Total Impressions' },
      { metric: 'Total Engagement', label: 'Total Engagement' },
      { metric: 'Profile Visits', label: 'Profile Visits' },
      { metric: 'Followers at Start of Month', label: 'Followers at Start of Month' },
      { metric: 'Followers at End of Month', label: 'Followers at End of Month' },
      { metric: 'Followers Gained', label: 'Followers Gained' },
      { metric: 'Best Performing Content', label: 'Best Performing Content' },
      { metric: 'Lowest Performing Content', label: 'Lowest Performing Content' },
    ]
  }
};

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function PerformanceScorecardsWorkspace({ currentUser }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  // Scorecards State
  const [scorecards, setScorecards] = useState<PerformanceScorecard[]>([]);
  const [csrReports, setCsrReports] = useState<CSRReport[]>([]);
  const [selectedCsrForView, setSelectedCsrForView] = useState<CSRReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Scorecard Form / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedScorecard, setSelectedScorecard] = useState<PerformanceScorecard | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<PerformanceScorecardType>('CS_AGENT_WEEKLY');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [evaluatorId, setEvaluatorId] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('');
  const [evaluationDate, setEvaluationDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form Items
  const [kpiRows, setKpiRows] = useState<ScorecardKPI[]>([]);
  const [activityRows, setActivityRows] = useState<ScorecardActivityMetric[]>([]);
  const [performanceRows, setPerformanceRows] = useState<ScorecardPerformanceMetric[]>([]);

  // Summary Fields
  const [totalScore, setTotalScore] = useState<number>(0);
  const [performanceRating, setPerformanceRating] = useState<PerformanceRating>('GOOD');
  const [keyStrengths, setKeyStrengths] = useState<string>('');
  const [areasForImprovement, setAreasForImprovement] = useState<string>('');
  const [challengesIssues, setChallengesIssues] = useState<string>('');
  const [keyAchievement, setKeyAchievement] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [teamLeadComment, setTeamLeadComment] = useState<string>('');
  const [evaluatorSignature, setEvaluatorSignature] = useState<string>('');
  const [evaluatorSignatureDate, setEvaluatorSignatureDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchScorecards();
    fetchUsers();
  }, []);

  const fetchScorecards = async () => {
    setLoading(true);
    try {
      const [scorecardRes, csrRes] = await Promise.allSettled([
        apiClient.get<PerformanceScorecard[]>('/performance-scorecards'),
        apiClient.get<CSRReport[]>('/csr-reports')
      ]);

      if (scorecardRes.status === 'fulfilled') {
        const d = scorecardRes.value.data as any;
        if (Array.isArray(d)) {
          setScorecards(d);
        } else if (d && Array.isArray(d.items)) {
          setScorecards(d.items);
        } else {
          setScorecards([]);
        }
      } else {
        setScorecards([]);
      }

      if (csrRes.status === 'fulfilled') {
        const d = csrRes.value.data as any;
        if (Array.isArray(d)) {
          setCsrReports(d);
        } else if (d && Array.isArray(d.items)) {
          setCsrReports(d.items);
        } else {
          setCsrReports([]);
        }
      } else {
        setCsrReports([]);
      }
    } catch (err) {
      console.error('Failed to load performance scorecards or CSR reports', err);
      setScorecards([]);
      setCsrReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<User[]>('/accounts');
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load users list', err);
      setStaffList([]);
    }
  };



  const initTemplateForm = (type: PerformanceScorecardType) => {
    const tmpl = SCORECARD_TEMPLATES[type];
    setFormType(type);
    setPeriodLabel(tmpl.periodDefaultLabel);
    setKpiRows(tmpl.kpis.map(k => ({ kpi: k.kpi, target: k.target, actual: '', score: 100, remarks: '' })));
    setActivityRows(tmpl.activities.map(a => ({ activity: a.activity, total: '', remarks: '' })));
    setPerformanceRows(tmpl.performances.map(p => ({ metric: p.metric, result: '', remarks: '' })));
    setTotalScore(100);
    setPerformanceRating('OUTSTANDING');
    setKeyStrengths('');
    setAreasForImprovement('');
    setChallengesIssues('');
    setKeyAchievement('');
    setRecommendations('');
    setTeamLeadComment('');
    setEvaluatorSignature(currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '');
    setEvaluatorSignatureDate(new Date().toISOString().split('T')[0]);
  };

  const openCreateModal = (type: PerformanceScorecardType = 'CS_AGENT_WEEKLY') => {
    initTemplateForm(type);
    setEmployeeId(staffList.length > 0 ? staffList[0].id : '');
    setEvaluatorId(currentUser ? currentUser.id : '');
    setSelectedScorecard(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (scorecard: PerformanceScorecard) => {
    setSelectedScorecard(scorecard);
    setFormType(scorecard.scorecard_type);
    setEmployeeId(scorecard.employee?.id || '');
    setEvaluatorId(scorecard.evaluator?.id || '');
    setPeriodLabel(scorecard.period_label || '');
    setEvaluationDate(scorecard.date || new Date().toISOString().split('T')[0]);

    setKpiRows(scorecard.kpi_evaluations || []);
    setActivityRows(scorecard.activity_metrics || []);
    setPerformanceRows(scorecard.performance_metrics || []);

    setTotalScore(scorecard.total_score || 0);
    setPerformanceRating(scorecard.performance_rating || 'GOOD');
    setKeyStrengths(scorecard.key_strengths || '');
    setAreasForImprovement(scorecard.areas_for_improvement || '');
    setChallengesIssues(scorecard.challenges_issues || '');
    setKeyAchievement(scorecard.key_achievement || '');
    setRecommendations(scorecard.recommendations || '');
    setTeamLeadComment(scorecard.team_lead_comment || '');
    setEvaluatorSignature(scorecard.evaluator_signature || '');
    setEvaluatorSignatureDate(scorecard.evaluator_signature_date || new Date().toISOString().split('T')[0]);

    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (scorecard: PerformanceScorecard) => {
    setSelectedScorecard(scorecard);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Recalculate Score Automatically when KPI scores change
  const handleKpiScoreChange = (index: number, scoreVal: number) => {
    const updated = [...kpiRows];
    updated[index].score = Math.max(0, Math.min(100, scoreVal));
    setKpiRows(updated);

    // Compute average score across all KPI items
    if (updated.length > 0) {
      const sum = updated.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const avg = Math.round(sum / updated.length);
      setTotalScore(avg);
      setPerformanceRating(calculateRating(avg));
    }
  };

  const calculateRating = (score: number): PerformanceRating => {
    if (score >= 90) return 'OUTSTANDING';
    if (score >= 80) return 'VERY_GOOD';
    if (score >= 70) return 'GOOD';
    if (score >= 60) return 'NEEDS_IMPROVEMENT';
    return 'UNSATISFACTORY';
  };

  const handleSaveScorecard = async () => {
    if (!employeeId) {
      alert('Please select an employee being evaluated.');
      return;
    }

    const payload = {
      scorecard_type: formType,
      employee_id: employeeId,
      evaluator_id: evaluatorId || (currentUser ? currentUser.id : null),
      period_label: periodLabel,
      date: evaluationDate,
      kpi_evaluations: kpiRows,
      activity_metrics: activityRows,
      performance_metrics: performanceRows,
      total_score: totalScore,
      performance_rating: performanceRating,
      key_strengths: keyStrengths,
      areas_for_improvement: areasForImprovement,
      challenges_issues: challengesIssues,
      key_achievement: keyAchievement,
      recommendations: recommendations,
      team_lead_comment: teamLeadComment,
      evaluator_signature: evaluatorSignature,
      evaluator_signature_date: evaluatorSignatureDate,
    };

    try {
      if (modalMode === 'create') {
        await apiClient.post('/performance-scorecards', payload);
      } else if (modalMode === 'edit' && selectedScorecard) {
        await apiClient.put(`/performance-scorecards/${selectedScorecard.id}`, payload);
      }
      setIsModalOpen(false);
      fetchScorecards();
    } catch (err: any) {
      console.error('Save failed', err);
      alert('Failed to save performance scorecard: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteScorecard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this performance scorecard report?')) return;
    try {
      await apiClient.delete(`/performance-scorecards/${id}`);
      fetchScorecards();
      if (isModalOpen && selectedScorecard?.id === id) {
        setIsModalOpen(false);
      }
    } catch (err: any) {
      alert('Failed to delete scorecard.');
    }
  };

  const handleDeleteCsrReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CSR performance report?')) return;
    try {
      await apiClient.delete(`/csr-reports/${id}`);
      fetchScorecards();
    } catch (err: any) {
      alert('Failed to delete report.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const safeScorecards = Array.isArray(scorecards) ? scorecards : [];
  const safeCsrReports = Array.isArray(csrReports) ? csrReports : [];

  const unifiedReports = [
    ...safeScorecards.map(sc => ({
      id: sc.id,
      kind: 'SCORECARD' as const,
      scorecard_type: sc.scorecard_type,
      title: SCORECARD_TEMPLATES[sc.scorecard_type]?.title || sc.scorecard_type,
      roleTag: SCORECARD_TEMPLATES[sc.scorecard_type]?.roleTag || 'Manager Scorecard',
      employeeName: sc.employee ? `${sc.employee.first_name} ${sc.employee.last_name}` : 'Unassigned',
      evaluatorName: sc.evaluator ? `${sc.evaluator.first_name} ${sc.evaluator.last_name}` : 'System',
      periodLabel: sc.period_label || 'N/A',
      date: sc.date || '',
      scoreOrSummary: `${sc.total_score}%`,
      rating: sc.performance_rating,
      originalScorecard: sc,
      originalCsr: undefined,
      createdAt: sc.created_at || sc.date
    })),
    ...safeCsrReports.map(csr => ({
      id: csr.id,
      kind: 'CSR' as const,
      scorecard_type: `CSR_${csr.report_type}`,
      title: csr.report_type === 'DAILY'
        ? 'Customer Support Representative Daily Report'
        : csr.report_type === 'WEEKLY'
        ? 'Customer Support Representative Weekly Report'
        : 'Customer Support Representative Monthly Report',
      roleTag: 'CSR Performance Report',
      employeeName: csr.staff ? `${csr.staff.first_name} ${csr.staff.last_name}` : 'CSR Staff',
      evaluatorName: csr.reported_to ? `${csr.reported_to.first_name} ${csr.reported_to.last_name}` : (csr.staff ? `${csr.staff.first_name} ${csr.staff.last_name}` : 'Self-Reported'),
      periodLabel: `${csr.report_type} REPORT`,
      date: csr.date || (csr.created_at ? new Date(csr.created_at).toISOString().split('T')[0] : ''),
      scoreOrSummary: `${csr.shipment_booked || 0} Shipments | ${csr.customer_converted_paid || 0} Paid`,
      rating: undefined,
      originalScorecard: undefined,
      originalCsr: csr,
      createdAt: csr.created_at || csr.date
    }))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const filteredReports = unifiedReports.filter(rep => {
    if (filterType !== 'ALL' && rep.scorecard_type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const empName = rep.employeeName.toLowerCase();
      const evalName = rep.evaluatorName.toLowerCase();
      const pLabel = rep.periodLabel.toLowerCase();
      const title = rep.title.toLowerCase();
      return empName.includes(q) || evalName.includes(q) || pLabel.includes(q) || title.includes(q);
    }
    return true;
  });


  const getRatingBadge = (rating?: PerformanceRating) => {
    if (!rating) return null;
    switch (rating) {
      case 'OUTSTANDING':
        return <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">Outstanding (90-100%)</span>;
      case 'VERY_GOOD':
        return <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-300">Very Good (80-89%)</span>;
      case 'GOOD':
        return <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-300">Good (70-79%)</span>;
      case 'NEEDS_IMPROVEMENT':
        return <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">Needs Improvement (60-69%)</span>;
      case 'UNSATISFACTORY':
        return <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-300">Unsatisfactory (&lt;60%)</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{rating}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Scorecard Section Wrapper */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-scorecard-modal, #printable-scorecard-modal * {
            visibility: visible;
          }
          #printable-scorecard-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
              <Award className="h-4 w-4" />
              <span>Manager Performance Audit Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Manager Performance Scorecards
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Conduct, evaluate, and track Weekly and Monthly Performance Scorecards for Customer Support Agents and Social Media Managers with automated scoring and printable reports.
            </p>
          </div>

          {isManagerOrAdmin && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => openCreateModal('CS_AGENT_WEEKLY')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>CS Agent Weekly</span>
              </button>
              <button
                onClick={() => openCreateModal('CS_AGENT_MONTHLY')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>CS Agent Monthly</span>
              </button>
              <button
                onClick={() => openCreateModal('SM_MANAGER_WEEKLY')}
                className="px-3.5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>SM Manager Weekly</span>
              </button>
              <button
                onClick={() => openCreateModal('SM_MANAGER_MONTHLY')}
                className="px-3.5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>SM Manager Monthly</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Template Quick Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(SCORECARD_TEMPLATES).map(([typeKey, template]) => {
          const count = scorecards.filter(s => s.scorecard_type === typeKey).length;
          const isCS = typeKey.startsWith('CS_');
          return (
            <div
              key={typeKey}
              onClick={() => isManagerOrAdmin && openCreateModal(typeKey as PerformanceScorecardType)}
              className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
                isCS ? 'hover:border-indigo-400' : 'hover:border-purple-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isCS ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}>
                    {template.roleTag}
                  </span>
                  <span className="text-xs font-extrabold text-slate-400">{count} Records</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {template.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {template.subtitle}
                </p>
              </div>

              {isManagerOrAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Create Scorecard</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Reports ({unifiedReports.length})</option>
            <option value="CS_AGENT_WEEKLY">CS Agent Weekly Scorecards</option>
            <option value="CS_AGENT_MONTHLY">CS Agent Monthly Scorecards</option>
            <option value="SM_MANAGER_WEEKLY">Social Media Manager Weekly</option>
            <option value="SM_MANAGER_MONTHLY">Social Media Manager Monthly</option>
            <option value="CSR_DAILY">CSR Daily Performance Reports</option>
            <option value="CSR_WEEKLY">CSR Weekly Performance Reports</option>
            <option value="CSR_MONTHLY">CSR Monthly Performance Reports</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, period, evaluator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Reports List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm font-semibold">
            Loading performance scorecards and reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Award className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No performance scorecards found</p>
            <p className="text-xs text-slate-500">
              {isManagerOrAdmin
                ? "Click on any template button above to evaluate a team member's performance."
                : "No performance evaluation scorecards have been published for you yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Report Type</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Period / Date</th>
                  <th className="py-3.5 px-4">Evaluator / Reported To</th>
                  <th className="py-3.5 px-4">Score / Summary</th>
                  <th className="py-3.5 px-4">Rating / Category</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReports.map((rep) => {
                  return (
                    <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span>{rep.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{rep.roleTag}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {rep.employeeName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div>{rep.periodLabel}</div>
                        <div className="text-[10px] text-slate-400">{rep.date}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rep.evaluatorName}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-indigo-700 text-sm">
                        {rep.scoreOrSummary}
                      </td>
                      <td className="py-3.5 px-4">
                        {rep.kind === 'SCORECARD' ? (
                          getRatingBadge(rep.rating)
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            CSR {rep.originalCsr?.report_type}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rep.kind === 'SCORECARD' && rep.originalScorecard && (
                            <button
                              onClick={() => openViewModal(rep.originalScorecard!)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="View Scorecard Report"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          {rep.kind === 'CSR' && rep.originalCsr && (
                            <button
                              onClick={() => setSelectedCsrForView(rep.originalCsr!)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View CSR Report"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {isManagerOrAdmin && (
                            <>
                              {rep.kind === 'SCORECARD' && rep.originalScorecard && (
                                <button
                                  onClick={() => openEditModal(rep.originalScorecard!)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Scorecard"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (rep.kind === 'SCORECARD') handleDeleteScorecard(rep.id);
                                  else handleDeleteCsrReport(rep.id);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Report"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSR Report View Modal */}
      {selectedCsrForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  CSR {selectedCsrForView.report_type} REPORT
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-1">CSR Performance Report Detail</h2>
                <p className="text-xs text-slate-500">Submitted on {selectedCsrForView.date || new Date(selectedCsrForView.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedCsrForView(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Enquiries</span>
                <span className="text-lg font-bold text-slate-800">{selectedCsrForView.new_enquiries || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Shipments</span>
                <span className="text-lg font-bold text-slate-800">{selectedCsrForView.shipment_booked || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Paid Customers</span>
                <span className="text-lg font-bold text-emerald-600">{selectedCsrForView.customer_converted_paid || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Complaints</span>
                <span className="text-lg font-bold text-amber-600">{selectedCsrForView.customer_complaint_received || 0}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              {selectedCsrForView.biggest_achievement && (
                <div>
                  <h4 className="font-bold text-slate-800">Key Achievement:</h4>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 mt-1">{selectedCsrForView.biggest_achievement}</p>
                </div>
              )}
              {selectedCsrForView.biggest_challenge && (
                <div>
                  <h4 className="font-bold text-slate-800">Key Challenge:</h4>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 mt-1">{selectedCsrForView.biggest_challenge}</p>
                </div>
              )}
              {selectedCsrForView.notes && (
                <div>
                  <h4 className="font-bold text-slate-800">Additional Notes:</h4>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 mt-1">{selectedCsrForView.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setSelectedCsrForView(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard View / Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            id="printable-scorecard-modal"
            ref={printRef}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
          >
            {/* Modal Header Bar */}
            <div className="no-print p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {modalMode === 'view' ? SCORECARD_TEMPLATES[selectedScorecard!.scorecard_type].title : SCORECARD_TEMPLATES[formType].title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mintana CRM Official Performance Scorecard Evaluation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Scorecard</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-8 bg-white">
              
              {/* Document Header Logo */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <img src="/mintana-logo.jpg" alt="Mintana Logo" className="h-10 w-auto object-contain" />
                  <div>
                    <h2 className="text-xl font-black tracking-wider uppercase text-slate-900">MINTANA LOGISTICS</h2>
                    <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Performance Management System</p>
                  </div>
                </div>

                <div className="text-right">
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    {modalMode === 'view' ? SCORECARD_TEMPLATES[selectedScorecard!.scorecard_type].title : SCORECARD_TEMPLATES[formType].title}
                  </h3>
                  <span className="text-xs font-extrabold text-indigo-700">Official Report Document</span>
                </div>
              </div>

              {/* Scorecard Metadata Header */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {modalMode === 'view' ? (
                  <>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Employee Name</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {selectedScorecard?.employee ? `${selectedScorecard.employee.first_name} ${selectedScorecard.employee.last_name}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Period</span>
                      <span className="font-extrabold text-slate-900 text-sm">{selectedScorecard?.period_label || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Evaluator</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {selectedScorecard?.evaluator ? `${selectedScorecard.evaluator.first_name} ${selectedScorecard.evaluator.last_name}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Evaluation Date</span>
                      <span className="font-extrabold text-slate-900 text-sm">{selectedScorecard?.date || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Employee Name *</label>
                      <select
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                      >
                        <option value="">-- Select Staff --</option>
                        {staffList.map(u => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Period (Week/Month)</label>
                      <input
                        type="text"
                        value={periodLabel}
                        onChange={(e) => setPeriodLabel(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Evaluator</label>
                      <select
                        value={evaluatorId}
                        onChange={(e) => setEvaluatorId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                      >
                        {staffList.map(u => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Evaluation Date</label>
                      <input
                        type="date"
                        value={evaluationDate}
                        onChange={(e) => setEvaluationDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Section 1: KPI Evaluation Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                    1. KPI Evaluation
                  </h3>
                  <span className="text-xs font-bold text-slate-500">Benchmark: 100% Target Standard</span>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">KPI</th>
                        <th className="py-2.5 px-3">Target Standard</th>
                        <th className="py-2.5 px-3">Actual Result</th>
                        <th className="py-2.5 px-3 w-24">Score (%)</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {(modalMode === 'view' ? selectedScorecard?.kpi_evaluations : kpiRows)?.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{row.kpi}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.target}</td>
                          <td className="py-2.5 px-3">
                            {modalMode === 'view' ? (
                              <span>{row.actual || '-'}</span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Actual result..."
                                value={row.actual || ''}
                                onChange={(e) => {
                                  const updated = [...kpiRows];
                                  updated[idx].actual = e.target.value;
                                  setKpiRows(updated);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-extrabold">
                            {modalMode === 'view' ? (
                              <span className="text-indigo-700">{row.score}%</span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.score ?? 100}
                                onChange={(e) => handleKpiScoreChange(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 bg-slate-50 border border-slate-300 rounded p-1 font-extrabold text-indigo-700 text-xs"
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {modalMode === 'view' ? (
                              <span>{row.remarks || '-'}</span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Remarks..."
                                value={row.remarks || ''}
                                onChange={(e) => {
                                  const updated = [...kpiRows];
                                  updated[idx].remarks = e.target.value;
                                  setKpiRows(updated);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Activity Metrics */}
              {((modalMode === 'view' ? selectedScorecard?.activity_metrics : activityRows)?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                    2. Content & Operational Activity
                  </h3>
                  <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Activity</th>
                          <th className="py-2.5 px-3 w-36">Total Output</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {(modalMode === 'view' ? selectedScorecard?.activity_metrics : activityRows)?.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{row.activity}</td>
                            <td className="py-2.5 px-3">
                              {modalMode === 'view' ? (
                                <span className="font-extrabold text-slate-900">{row.total || '-'}</span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Total..."
                                  value={row.total || ''}
                                  onChange={(e) => {
                                    const updated = [...activityRows];
                                    updated[idx].total = e.target.value;
                                    setActivityRows(updated);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold"
                                />
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {modalMode === 'view' ? (
                                <span>{row.remarks || '-'}</span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Remarks..."
                                  value={row.remarks || ''}
                                  onChange={(e) => {
                                    const updated = [...activityRows];
                                    updated[idx].remarks = e.target.value;
                                    setActivityRows(updated);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 3: Performance & Growth Metrics */}
              {((modalMode === 'view' ? selectedScorecard?.performance_metrics : performanceRows)?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                    3. Performance & Audience Growth
                  </h3>
                  <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Performance Metric</th>
                          <th className="py-2.5 px-3 w-44">Result</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {(modalMode === 'view' ? selectedScorecard?.performance_metrics : performanceRows)?.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{row.metric}</td>
                            <td className="py-2.5 px-3">
                              {modalMode === 'view' ? (
                                <span className="font-extrabold text-indigo-700">{row.result || '-'}</span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Result..."
                                  value={row.result || ''}
                                  onChange={(e) => {
                                    const updated = [...performanceRows];
                                    updated[idx].result = e.target.value;
                                    setPerformanceRows(updated);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold text-indigo-700"
                                />
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {modalMode === 'view' ? (
                                <span>{row.remarks || '-'}</span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Remarks..."
                                  value={row.remarks || ''}
                                  onChange={(e) => {
                                    const updated = [...performanceRows];
                                    updated[idx].remarks = e.target.value;
                                    setPerformanceRows(updated);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 4: Performance Summary */}
              <div className="space-y-4 pt-2 border-t-2 border-slate-900">
                <h3 className="font-extrabold text-base uppercase tracking-wider text-slate-900">
                  Performance Summary & Audit Rating
                </h3>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-widest block">Overall Scorecard Grade</span>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-3xl font-black text-indigo-950">
                        {modalMode === 'view' ? selectedScorecard?.total_score : totalScore}%
                      </span>
                      {getRatingBadge(modalMode === 'view' ? selectedScorecard!.performance_rating : performanceRating)}
                    </div>
                  </div>

                  {modalMode !== 'view' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Manual Override Rating:</span>
                      <select
                        value={performanceRating}
                        onChange={(e) => setPerformanceRating(e.target.value as PerformanceRating)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                      >
                        <option value="OUTSTANDING">Outstanding (90-100%)</option>
                        <option value="VERY_GOOD">Very Good (80-89%)</option>
                        <option value="GOOD">Good (70-79%)</option>
                        <option value="NEEDS_IMPROVEMENT">Needs Improvement (60-69%)</option>
                        <option value="UNSATISFACTORY">Unsatisfactory (&lt;60%)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Key Strengths / Achievements</label>
                    {modalMode === 'view' ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px] whitespace-pre-wrap">
                        {selectedScorecard?.key_strengths || selectedScorecard?.key_achievement || 'None recorded'}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={keyStrengths}
                        onChange={(e) => setKeyStrengths(e.target.value)}
                        placeholder="List major strengths and highlights..."
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    )}
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Areas for Improvement</label>
                    {modalMode === 'view' ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px] whitespace-pre-wrap">
                        {selectedScorecard?.areas_for_improvement || 'None recorded'}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={areasForImprovement}
                        onChange={(e) => setAreasForImprovement(e.target.value)}
                        placeholder="Detail growth opportunities & feedback..."
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    )}
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Biggest Challenge / Support Required</label>
                    {modalMode === 'view' ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px] whitespace-pre-wrap">
                        {selectedScorecard?.challenges_issues || 'None recorded'}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={challengesIssues}
                        onChange={(e) => setChallengesIssues(e.target.value)}
                        placeholder="State bottlenecks or support needed..."
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    )}
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Team Lead / Manager Comment</label>
                    {modalMode === 'view' ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px] whitespace-pre-wrap">
                        {selectedScorecard?.team_lead_comment || 'None recorded'}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={teamLeadComment}
                        onChange={(e) => setTeamLeadComment(e.target.value)}
                        placeholder="Manager final signoff feedback..."
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Signature Block */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-1">Evaluator Signature</span>
                  {modalMode === 'view' ? (
                    <div className="border-b-2 border-slate-900 pb-1 font-serif text-lg font-bold text-slate-900">
                      {selectedScorecard?.evaluator_signature || selectedScorecard?.evaluator?.first_name || 'Signed'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={evaluatorSignature}
                      onChange={(e) => setEvaluatorSignature(e.target.value)}
                      placeholder="Evaluator Full Name / Signature..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                    />
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-1">Signature Date</span>
                  {modalMode === 'view' ? (
                    <div className="border-b-2 border-slate-900 pb-1 font-extrabold text-slate-900 text-sm">
                      {selectedScorecard?.evaluator_signature_date || selectedScorecard?.date || 'N/A'}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={evaluatorSignatureDate}
                      onChange={(e) => setEvaluatorSignatureDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                    />
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            {modalMode !== 'view' && (
              <div className="no-print p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScorecard}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{modalMode === 'create' ? 'Save & Issue Scorecard' : 'Update Scorecard'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
