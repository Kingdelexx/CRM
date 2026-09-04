import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Deal, Stage, DashboardMetrics, User } from '@/types/crm'
import {
  Award,
  Layers,
  Calendar,
  DollarSign,
  Loader2,
  Inbox,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  Activity as ActivityIcon,
  CheckSquare,
  Users,
  ShieldAlert
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
      <div className="py-24 flex flex-col justify-center items-center gap-3 text-zinc-400">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-semibold">Loading your personalized dashboard...</span>
      </div>
    )
  }

  const deals = dealsData?.items || []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

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
      <div className="bg-gradient-to-r from-indigo-950/40 via-zinc-950 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isBoss
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : isManager
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isBoss ? 'Executive Workspace' : isManager ? 'Manager Workspace' : 'Staff Workspace'}
              </span>
              {me?.department && (
                <span className="text-[10px] text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  Dept: {me.department.name}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Welcome back, {me?.first_name || 'Staff Member'} 👋
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              {isEmployee && "Here is your personal pipeline overview, assigned leads, and daily task checklist."}
              {isManager && "Here is your team's real-time deal performance, pipeline status, and member activity."}
              {isBoss && "Real-time executive performance indicators, organization revenues, and unit metrics."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-zinc-300">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Live System Sync</div>
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
            
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">My Assigned Leads</span>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-white tracking-tight">{metrics.leads.total_leads}</span>
                  <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">Active Leads</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400">{metrics.leads.total_customers}</span>
                  <span className="text-[10px] text-zinc-500 block">Converted Customers</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">My Open Pipeline</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white tracking-tight">${metrics.leads.pipeline_value.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> Active Opportunities
                </span>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">My Win Rate</span>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white tracking-tight">{metrics.leads.win_rate}%</span>
                <span className="text-[10px] text-zinc-500 font-semibold block mt-1">Closed Deals Conversion</span>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">My Tasks Status</span>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                  <Clock className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-white tracking-tight">{metrics.tasks.due_today}</span>
                  <span className="text-[10px] text-amber-400 font-bold block mt-0.5">Due Today</span>
                </div>
                {metrics.tasks.overdue > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg text-right">
                    <span className="text-xs font-bold text-red-400 block">{metrics.tasks.overdue}</span>
                    <span className="text-[9px] text-red-400 font-semibold block uppercase">Overdue</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Staff Task Checklist & Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Task Progress</h3>
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {metrics.tasks.completed} of {metrics.tasks.total} completed
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${metrics.tasks.total > 0 ? (metrics.tasks.completed / metrics.tasks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Task Cards breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-850 text-center">
                  <span className="text-xs text-zinc-400 font-bold block uppercase">To Do</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{metrics.tasks.todo}</span>
                </div>
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-850 text-center">
                  <span className="text-xs text-blue-400 font-bold block uppercase">In Progress</span>
                  <span className="text-xl font-extrabold text-blue-400 mt-1 block">{metrics.tasks.in_progress}</span>
                </div>
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-850 text-center">
                  <span className="text-xs text-emerald-400 font-bold block uppercase">Completed</span>
                  <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{metrics.tasks.completed}</span>
                </div>
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-850 text-center">
                  <span className="text-xs text-red-400 font-bold block uppercase">Overdue</span>
                  <span className="text-xl font-extrabold text-red-400 mt-1 block">{metrics.tasks.overdue}</span>
                </div>
              </div>
            </div>

            {/* My Activity Stream */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <ActivityIcon className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Recent Activity</h3>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {metrics.activities.length === 0 ? (
                  <div className="text-center text-xs text-zinc-500 py-6 italic">No recent logged activity.</div>
                ) : (
                  metrics.activities.map(act => (
                    <div key={act.id} className="text-xs border-b border-zinc-900/60 pb-2 space-y-1">
                      <div className="text-zinc-200 font-medium">{act.content}</div>
                      <div className="text-[10px] text-zinc-500 flex justify-between">
                        <span className="text-indigo-400 font-semibold">{act.type}</span>
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
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Team Revenue</span>
              <span className="text-2xl font-black text-white mt-3">${metrics.stats.total_revenue.toLocaleString()}</span>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Team Pipeline Value</span>
              <span className="text-2xl font-black text-indigo-400 mt-3">${metrics.stats.pipeline_value.toLocaleString()}</span>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Active Team Deals</span>
              <span className="text-2xl font-black text-white mt-3">{metrics.stats.active_deals}</span>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Team Win Rate</span>
              <span className="text-2xl font-black text-emerald-400 mt-3">{metrics.stats.win_rate}%</span>
            </div>
          </div>

          {/* Team Members Achievements Table */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-indigo-400" /> Team Performance & Achievements
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-400 font-bold uppercase text-[9px]">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Tasks Completed</th>
                    <th className="py-2.5 px-3 text-center">Pending Tasks</th>
                    <th className="py-2.5 px-3 text-center">Deals Won</th>
                    <th className="py-2.5 px-3 text-right">Pipeline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {metrics.members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-500 italic">No team members assigned yet.</td>
                    </tr>
                  ) : (
                    metrics.members.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-900/20">
                        <td className="py-3 px-3 font-bold text-white">{m.name}</td>
                        <td className="py-3 px-3 text-zinc-400 font-medium text-[10px] uppercase">{m.role}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-400">{m.tasks_completed}</td>
                        <td className="py-3 px-3 text-center text-zinc-300">{m.tasks_pending}</td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-400">{m.deals_won}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">${m.pipeline_value.toLocaleString()}</td>
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
            
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">Total Revenue</span>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white tracking-tight">${metrics.stats.total_revenue.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> Closed Won Deals
                </span>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">Total Open Pipeline</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white tracking-tight">${metrics.stats.pipeline_value.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-400 font-semibold block mt-1">{metrics.stats.active_deals} Active Opportunities</span>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">Win Ratio %</span>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white tracking-tight">{metrics.stats.win_rate}%</span>
                <span className="text-[10px] text-zinc-400 font-semibold block mt-1">Global Conversion</span>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">Active Projects</span>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white tracking-tight">{metrics.projects.total}</span>
                <span className="text-[10px] text-amber-400 font-semibold block mt-1">{metrics.projects.in_progress} In Execution</span>
              </div>
            </div>

          </div>

          {/* Department Performance Section */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-indigo-400" /> Department Units Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.departments.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-zinc-500 italic">No departments registered. Configure in Settings.</div>
              ) : (
                metrics.departments.map(d => (
                  <div key={d.id} className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{d.name}</span>
                      <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-semibold text-zinc-400">
                        {d.members_count} Members
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase">Revenue</span>
                        <span className="font-extrabold text-emerald-400">${d.revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase">Pipeline</span>
                        <span className="font-extrabold text-indigo-400">${d.pipeline.toLocaleString()}</span>
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
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-white">Stage Breakdown</h3>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              <button
                onClick={() => setStageChartMetric('value')}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  stageChartMetric === 'value' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Value
              </button>
              <button
                onClick={() => setStageChartMetric('count')}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  stageChartMetric === 'count' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Count
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mb-6 uppercase tracking-wider">
            Total active deal {stageChartMetric === 'value' ? 'monetary values' : 'counts'} per pipeline stage
          </p>

          <div className="flex-1 min-h-[260px] flex flex-col justify-between">
            {stageData.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-zinc-600 text-xs italic">
                <Inbox className="h-6 w-6 text-zinc-700 mb-1" />
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
                            <span className="font-bold text-zinc-300">{stage.name}</span>
                            <span className="text-[9px] bg-zinc-900 text-zinc-500 font-bold px-1.5 py-0.5 rounded border border-zinc-900 uppercase">
                              Win: {stage.winProbability}%
                            </span>
                          </div>
                          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                            {stageChartMetric === 'value' ? `$${stage.value.toLocaleString()}` : `${stage.count} deals`}
                          </span>
                        </div>
                        <div className="h-5 bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-900 flex items-center">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-lg transition-all duration-700 cursor-pointer"
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
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-white">Close Date Forecast</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setTrendChartMetric('value')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartMetric === 'value' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Value
                </button>
                <button
                  onClick={() => setTrendChartMetric('count')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartMetric === 'count' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Count
                </button>
              </div>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setTrendChartType('line')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartType === 'line' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setTrendChartType('bar')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartType === 'bar' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mb-6 uppercase tracking-wider">
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
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-zinc-800">
                  <defs>
                    <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.5, 1].map((ratio, idx) => {
                    const y = paddingY + ratio * (height - 2 * paddingY)
                    const labelVal = maxVal * (1 - ratio)
                    const yLabel = trendChartMetric === 'value' ? (labelVal >= 1000 ? `$${(labelVal / 1000).toFixed(0)}k` : `$${Math.round(labelVal)}`) : `${Math.round(labelVal)}`
                    return (
                      <g key={idx}>
                        <text x={paddingX - 8} y={y + 4} className="text-[9px] fill-zinc-600 font-semibold" textAnchor="end">{yLabel}</text>
                        <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(39, 39, 42, 0.4)" strokeDasharray="3,3" />
                      </g>
                    )
                  })}

                  <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgb(39, 39, 42)" strokeWidth={1} />

                  {trendChartType === 'bar' ? (
                    points.map((p, idx) => {
                      const barWidth = 14
                      const barHeight = Math.max((height - paddingY) - p.y, 2)
                      return (
                        <g key={idx} className="group/dot cursor-pointer">
                          <rect x={p.x - barWidth / 2} y={p.y} width={barWidth} height={barHeight} rx={3} className="fill-indigo-600 hover:fill-indigo-500 transition-all" />
                          <text x={p.x} y={height - paddingY + 14} className="text-[9px] fill-zinc-500 font-bold" textAnchor="middle">{p.month}</text>
                        </g>
                      )
                    })
                  ) : (
                    <>
                      {areaPath && <path d={areaPath} fill="url(#area-gradient)" />}
                      {linePath && <path d={linePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth={2.5} />}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/dot cursor-pointer">
                          <text x={p.x} y={height - paddingY + 14} className="text-[9px] fill-zinc-500 font-bold" textAnchor="middle">{p.month}</text>
                          <circle cx={p.x} cy={p.y} r={3} className="fill-zinc-950 stroke-indigo-400 stroke-[2]" />
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
