import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Deal, Stage, DashboardMetrics, User } from '@/types/crm'
import {
  Award,
  Layers,
  DollarSign,
  Loader2,
  Inbox,
  ArrowUpRight,
  UserCheck,
  Clock,
  Briefcase,
  TrendingUp,
  Activity as ActivityIcon,
  CheckSquare,
  Users
} from 'lucide-react'

export default function SummaryDashboard() {
  // Toggle states for visual charts
  const [stageChartMetric, setStageChartMetric] = useState<'value' | 'count'>('value')
  const [trendChartMetric, setTrendChartMetric] = useState<'value' | 'count'>('value')
  const [trendChartType, setTrendChartType] = useState<'line' | 'bar'>('line')

  // 1. Fetch current user
  const { data: me } = useQuery<User>({
    queryKey: ['dashboard-me'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/accounts/me')
      return response.data
    }
  })

  // 2. Fetch role-tailored dashboard metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardMetrics>('/accounts/dashboard-metrics')
      return response.data
    }
  })

  // 3. Fetch Deals for chart visualization
  const { data: dealsData, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Deal[]; count: number }>('/deals/', {
        params: { limit: 1000 }
      })
      return response.data
    }
  })

  // 4. Fetch Stages
  const { data: stages = [], isLoading: isLoadingStages } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const response = await apiClient.get<Stage[]>('/stages/')
      return response.data
    }
  })

  if (isLoadingMetrics || isLoadingDeals || isLoadingStages) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-semibold">Loading your personalized dashboard...</span>
      </div>
    )
  }

  const deals = dealsData?.items || []
  const now = new Date()
  const currentYear = now.getFullYear()

  // Chart data calculations
  const stageData = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stage?.id === stage.id && d.status === 'OPEN')
    const value = stageDeals.reduce((sum, d) => sum + Number(d.value), 0)
    return {
      name: stage.name,
      count: stageDeals.length,
      value,
      winProbability: stage.win_probability
    }
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyData = monthNames.map((name, idx) => {
    const matchingDeals = deals.filter(d => {
      if (!d.expected_close_date) return false
      const date = new Date(d.expected_close_date)
      return date.getFullYear() === currentYear && date.getMonth() === idx
    })
    const value = matchingDeals.reduce((sum, d) => sum + Number(d.value), 0)
    return { name, value, count: matchingDeals.length }
  })

  // Determine user role badge info
  const userRole = me?.role || 'SALES_REP'
  const isEmployee = metrics?.mode === 'EMPLOYEE' || userRole === 'SALES_REP'
  const isManager = metrics?.mode === 'MANAGER' || userRole === 'MANAGER'
  const isBoss = metrics?.mode === 'BOSS' || userRole === 'ADMIN'

  return (
    <div className="space-y-8 select-none">
      
      {/* HERO / WELCOME HEADER */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isBoss
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : isManager
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {isBoss ? 'Executive Workspace' : isManager ? 'Manager Workspace' : 'Staff Workspace'}
              </span>
              {me?.department && (
                <span className="text-[10px] text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  Dept: {me.department.name}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A202C] flex items-center gap-2">
              Welcome back, {me?.first_name || 'Staff Member'} 👋
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {isEmployee && "Here is your personal pipeline overview, assigned leads, and daily task checklist."}
              {isManager && "Here is your team's real-time deal performance, pipeline status, and member activity."}
              {isBoss && "Real-time executive performance indicators, organization revenues, and unit metrics."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-700">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Live System Sync</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. STAFF / EMPLOYEE VIEW */}
      {/* ========================================================================= */}
      {isEmployee && metrics?.mode === 'EMPLOYEE' && (
        <div className="space-y-8">
          
          {/* Key Metric Cards for Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">My Assigned Leads</span>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-200">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-[#1A202C] tracking-tight">{metrics.leads.total_leads}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Active Leads</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">{metrics.leads.total_customers}</span>
                  <span className="text-[10px] text-slate-500 block">Converted Customers</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">My Open Pipeline</span>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-200">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[#1A202C] tracking-tight">${metrics.leads.pipeline_value.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> Active Opportunities
                </span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">My Win Rate</span>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-200">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[#1A202C] tracking-tight">{metrics.leads.win_rate}%</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">Closed Deals Conversion</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">My Tasks Status</span>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-200">
                  <Clock className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-[#1A202C] tracking-tight">{metrics.tasks.due_today}</span>
                  <span className="text-[10px] text-amber-600 font-bold block mt-0.5">Due Today</span>
                </div>
                {metrics.tasks.overdue > 0 && (
                  <div className="bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-right">
                    <span className="text-xs font-bold text-red-600 block">{metrics.tasks.overdue}</span>
                    <span className="text-[9px] text-red-600 font-semibold block uppercase">Overdue</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Staff Task Checklist & Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">My Task Progress</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {metrics.tasks.completed} of {metrics.tasks.total} completed
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${metrics.tasks.total > 0 ? (metrics.tasks.completed / metrics.tasks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Task Cards breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase">To Do</span>
                  <span className="text-xl font-extrabold text-[#1A202C] mt-1 block">{metrics.tasks.todo}</span>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/60 text-center">
                  <span className="text-xs text-blue-700 font-bold block uppercase">In Progress</span>
                  <span className="text-xl font-extrabold text-blue-700 mt-1 block">{metrics.tasks.in_progress}</span>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/60 text-center">
                  <span className="text-xs text-emerald-700 font-bold block uppercase">Completed</span>
                  <span className="text-xl font-extrabold text-emerald-700 mt-1 block">{metrics.tasks.completed}</span>
                </div>
                <div className="bg-red-50/50 p-3 rounded-lg border border-red-200/60 text-center">
                  <span className="text-xs text-red-700 font-bold block uppercase">Overdue</span>
                  <span className="text-xl font-extrabold text-red-700 mt-1 block">{metrics.tasks.overdue}</span>
                </div>
              </div>
            </div>

            {/* My Activity Stream */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                <ActivityIcon className="h-4.5 w-4.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">My Recent Activity</h3>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {metrics.activities.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-6 italic">No recent logged activity.</div>
                ) : (
                  metrics.activities.map(act => (
                    <div key={act.id} className="text-xs border-b border-slate-100 pb-2 space-y-1">
                      <div className="text-slate-700 font-medium">{act.content}</div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span className="text-indigo-600 font-semibold">{act.type}</span>
                        <span>{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MANAGER VIEW */}
      {/* ========================================================================= */}
      {isManager && metrics?.mode === 'MANAGER' && (
        <div className="space-y-8">
          
          {/* Manager Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Team Revenue</span>
              <span className="text-2xl font-black text-[#1A202C] mt-3">${metrics.stats.total_revenue.toLocaleString()}</span>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Team Pipeline Value</span>
              <span className="text-2xl font-black text-indigo-600 mt-3">${metrics.stats.pipeline_value.toLocaleString()}</span>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Team Deals</span>
              <span className="text-2xl font-black text-[#1A202C] mt-3">{metrics.stats.active_deals}</span>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Team Win Rate</span>
              <span className="text-2xl font-black text-emerald-600 mt-3">{metrics.stats.win_rate}%</span>
            </div>
          </div>

          {/* Team Members Achievements Table */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-indigo-600" /> Team Performance & Achievements
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[9px]">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Tasks Completed</th>
                    <th className="py-2.5 px-3 text-center">Pending Tasks</th>
                    <th className="py-2.5 px-3 text-center">Deals Won</th>
                    <th className="py-2.5 px-3 text-right">Pipeline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">No team members assigned yet.</td>
                    </tr>
                  ) : (
                    metrics.members.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-bold text-[#1A202C]">{m.name}</td>
                        <td className="py-3 px-3 text-slate-500 font-medium text-[10px] uppercase">{m.role}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">{m.tasks_completed}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{m.tasks_pending}</td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-600">{m.deals_won}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#1A202C]">${m.pipeline_value.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BOSS / ADMIN EXECUTIVE VIEW */}
      {/* ========================================================================= */}
      {isBoss && metrics?.mode === 'BOSS' && (
        <div className="space-y-8">
          
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Revenue</span>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-200">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[#1A202C] tracking-tight">${metrics.stats.total_revenue.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> Closed Won Deals
                </span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Open Pipeline</span>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-200">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[#1A202C] tracking-tight">${metrics.stats.pipeline_value.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">{metrics.stats.active_deals} Active Opportunities</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Win Ratio %</span>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-200">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[#1A202C] tracking-tight">{metrics.stats.win_rate}%</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">Global Conversion</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Active Projects</span>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-200">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-[#1A202C] tracking-tight">{metrics.projects.total}</span>
                <span className="text-[10px] text-amber-600 font-semibold block mt-1">{metrics.projects.in_progress} In Execution</span>
              </div>
            </div>

          </div>

          {/* Department Performance Section */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-indigo-600" /> Department Units Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.departments.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">No departments registered. Configure in Settings.</div>
              ) : (
                metrics.departments.map(d => (
                  <div key={d.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1A202C] text-xs">{d.name}</span>
                      <span className="text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded font-semibold text-slate-600">
                        {d.members_count} Members
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Revenue</span>
                        <span className="font-extrabold text-emerald-600">${d.revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Pipeline</span>
                        <span className="font-extrabold text-indigo-600">${d.pipeline.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* CHARTS SECTION (Pipeline Stages & Monthly Forecast) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Stage Breakdown Chart */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 flex flex-col relative overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-[#1A202C]">Stage Breakdown</h3>
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
              <button
                onClick={() => setStageChartMetric('value')}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  stageChartMetric === 'value' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Value
              </button>
              <button
                onClick={() => setStageChartMetric('count')}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  stageChartMetric === 'count' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Count
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-wider">
            Total active deal {stageChartMetric === 'value' ? 'monetary values' : 'counts'} per pipeline stage
          </p>

          <div className="flex-1 min-h-[260px] flex flex-col justify-between">
            {stageData.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-slate-400 text-xs italic">
                <Inbox className="h-6 w-6 text-slate-300 mb-1" />
                No stages registered.
              </div>
            ) : (() => {
              const maxVal = Math.max(...stageData.map(d => stageChartMetric === 'value' ? d.value : d.count), 1)
              return (
                <div className="space-y-4 flex flex-col justify-center py-2 h-full">
                  {stageData.map((stage, idx) => {
                    const currentVal = stageChartMetric === 'value' ? stage.value : stage.count
                    const pct = Math.max((currentVal / maxVal) * 100, 2)
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1A202C]">{stage.name}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                              Win: {stage.winProbability}%
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {stageChartMetric === 'value' ? `$${stage.value.toLocaleString()}` : `${stage.count} deals`}
                          </span>
                        </div>
                        <div className="h-5 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-700 cursor-pointer"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 flex flex-col relative overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-[#1A202C]">Close Date Forecast</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
                <button
                  onClick={() => setTrendChartMetric('value')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartMetric === 'value' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Value
                </button>
                <button
                  onClick={() => setTrendChartMetric('count')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartMetric === 'count' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Count
                </button>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
                <button
                  onClick={() => setTrendChartType('line')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartType === 'line' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setTrendChartType('bar')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartType === 'bar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-wider">
            Expected monthly close schedule for calendar year {currentYear}
          </p>

          <div className="flex-1 min-h-[260px] flex items-center justify-center relative">
            {(() => {
              const height = 220
              const width = 500
              const paddingX = 40
              const paddingY = 25
              const values = monthlyData.map(d => trendChartMetric === 'value' ? d.value : d.count)
              const maxVal = Math.max(...values, 1)

              const points = monthlyData.map((d, idx) => {
                const currentVal = trendChartMetric === 'value' ? d.value : d.count
                const x = paddingX + (idx * (width - 2 * paddingX)) / (monthlyData.length - 1)
                const y = height - paddingY - (currentVal / maxVal) * (height - 2 * paddingY)
                return { x, y, value: currentVal, month: d.name }
              })

              const linePath = points.reduce((acc, p, idx) => {
                if (idx === 0) return `M ${p.x} ${p.y}`
                const prev = points[idx - 1]
                const cpX1 = prev.x + (p.x - prev.x) / 2
                const cpY1 = prev.y
                const cpX2 = prev.x + (p.x - prev.x) / 2
                const cpY2 = p.y
                return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`
              }, '')

              const areaPath = linePath
                ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
                : ''

              return (
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-slate-700">
                  <defs>
                    <linearGradient id="area-gradient-light" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.5, 1].map((ratio, idx) => {
                    const y = paddingY + ratio * (height - 2 * paddingY)
                    const labelVal = maxVal * (1 - ratio)
                    const yLabel = trendChartMetric === 'value' ? (labelVal >= 1000 ? `$${(labelVal / 1000).toFixed(0)}k` : `$${Math.round(labelVal)}`) : `${Math.round(labelVal)}`
                    return (
                      <g key={idx}>
                        <text x={paddingX - 8} y={y + 4} className="text-[9px] fill-slate-400 font-semibold" textAnchor="end">{yLabel}</text>
                        <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#E2E8F0" strokeDasharray="3,3" />
                      </g>
                    )
                  })}

                  <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#CBD5E1" strokeWidth={1} />

                  {trendChartType === 'bar' ? (
                    points.map((p, idx) => {
                      const barWidth = 14
                      const barHeight = Math.max((height - paddingY) - p.y, 2)
                      return (
                        <g key={idx} className="group/dot cursor-pointer">
                          <rect x={p.x - barWidth / 2} y={p.y} width={barWidth} height={barHeight} rx={3} className="fill-indigo-600 hover:fill-indigo-500 transition-all" />
                          <text x={p.x} y={height - paddingY + 14} className="text-[9px] fill-slate-500 font-bold" textAnchor="middle">{p.month}</text>
                        </g>
                      )
                    })
                  ) : (
                    <>
                      {areaPath && <path d={areaPath} fill="url(#area-gradient-light)" />}
                      {linePath && <path d={linePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth={2.5} />}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/dot cursor-pointer">
                          <text x={p.x} y={height - paddingY + 14} className="text-[9px] fill-slate-500 font-bold" textAnchor="middle">{p.month}</text>
                          <circle cx={p.x} cy={p.y} r={3.5} className="fill-white stroke-indigo-600 stroke-[2]" />
                        </g>
                      ))}
                    </>
                  )}
                </svg>
              )
            })()}
          </div>
        </div>

      </div>

    </div>
  )
}
