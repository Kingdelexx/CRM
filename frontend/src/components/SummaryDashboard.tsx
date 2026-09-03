import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { Deal, Stage } from '@/types/crm'
import {
  Award,
  Layers,
  Calendar,
  DollarSign,
  Loader2,
  Inbox,
  ArrowUpRight
} from 'lucide-react'

export default function SummaryDashboard() {
  // Toggle states for visual widgets
  const [stageChartMetric, setStageChartMetric] = useState<'value' | 'count'>('value')
  const [trendChartMetric, setTrendChartMetric] = useState<'value' | 'count'>('value')
  const [trendChartType, setTrendChartType] = useState<'line' | 'bar'>('line')

  // 1. Fetch Deals
  const { data: dealsData, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Deal[]; count: number }>('/deals/', {
        params: { limit: 1000 }
      })
      return response.data
    }
  })

  // 2. Fetch Stages
  const { data: stages = [], isLoading: isLoadingStages } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const response = await apiClient.get<Stage[]>('/stages/')
      return response.data
    }
  })

  if (isLoadingDeals || isLoadingStages) {
    return (
      <div className="py-20 flex flex-col justify-center items-center gap-3 text-zinc-455">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-semibold">Aggregating analytics data...</span>
      </div>
    )
  }

  const deals = dealsData?.items || []

  // --- 1. Metrics Calculations ---
  
  // Total Pipeline Value: Sum of value for all active (OPEN + WON) deals
  const totalPipeline = deals
    .filter(d => d.status === 'OPEN' || d.status === 'WON')
    .reduce((sum, d) => sum + Number(d.value), 0)

  // Win Rate %: WON / (WON + LOST)
  const wonDeals = deals.filter(d => d.status === 'WON').length
  const lostDeals = deals.filter(d => d.status === 'LOST').length
  const closedCount = wonDeals + lostDeals
  const winRate = closedCount > 0 ? Math.round((wonDeals / closedCount) * 100) : 0

  // Active Deals Count: OPEN
  const activeDealsCount = deals.filter(d => d.status === 'OPEN').length

  // Deals Closing This Month
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed
  const closingThisMonthCount = deals.filter(d => {
    if (!d.expected_close_date) return false
    const date = new Date(d.expected_close_date)
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth
  }).length

  // --- 2. Chart 1 Data: Pipeline Stage Breakdown ---
  // Group Deals by stage
  const stageData = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stage.id === stage.id && d.status === 'OPEN')
    const value = stageDeals.reduce((sum, d) => sum + Number(d.value), 0)
    return {
      name: stage.name,
      count: stageDeals.length,
      value,
      winProbability: stage.win_probability
    }
  })

  // --- 3. Chart 2 Data: Monthly Deal Volume (2026 calendar months) ---
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyData = monthNames.map((name, idx) => {
    // Sum deal values expected to close in this month
    const matchingDeals = deals.filter(d => {
      if (!d.expected_close_date) return false
      const date = new Date(d.expected_close_date)
      // Check for year 2026 (or current year)
      return date.getFullYear() === currentYear && date.getMonth() === idx
    })
    const value = matchingDeals.reduce((sum, d) => sum + Number(d.value), 0)
    const count = matchingDeals.length
    return { name, value, count }
  })

  return (
    <div className="space-y-8 select-none">
      
      {/* HEADER STATEMENT */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">Summary Analytics Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Real-time performance indicators and pipeline breakdown for tenant: <span className="text-indigo-400 font-bold">Sales Org</span>
        </p>
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-800 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-550 font-bold uppercase tracking-wider block">Total Pipeline Value</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/15">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-white tracking-tight">
              ${totalPipeline.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-450 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3 w-3" /> Active + Won Deals
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-800 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-550 font-bold uppercase tracking-wider block">Win Ratio %</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-505/15">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-white tracking-tight">
              {winRate}%
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold block mt-1">
              Based on {closedCount} closed opportunities
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-800 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-550 font-bold uppercase tracking-wider block">Open Pipeline Opportunities</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/15">
              <Layers className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-white tracking-tight">
              {activeDealsCount}
            </span>
            <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5 mt-1">
              Awaiting Stage Progression
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-800 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-550 font-bold uppercase tracking-wider block">Deals Closing This Month</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/15">
              <Calendar className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-white tracking-tight">
              {closingThisMonthCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold block mt-1 uppercase tracking-wide">
              Expected Target: {monthNames[currentMonth]} {currentYear}
            </span>
          </div>
        </div>

      </div>

      {/* SVG CUSTOM CHARTS BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart Card 1: Pipeline Breakdown */}
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-white">Stage Breakdown</h3>
            {/* Toggle metric */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              <button
                onClick={() => setStageChartMetric('value')}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  stageChartMetric === 'value'
                    ? 'bg-indigo-650 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Value
              </button>
              <button
                onClick={() => setStageChartMetric('count')}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                  stageChartMetric === 'count'
                    ? 'bg-indigo-650 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Count
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mb-6 uppercase tracking-wider">
            Total active deal {stageChartMetric === 'value' ? 'monetary volumes' : 'numerical counts'} grouped per pipeline stage
          </p>

          <div className="flex-1 min-h-[300px] flex flex-col justify-between">
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
                    const pct = Math.max((currentVal / maxVal) * 100, 2) // minimum 2% bar to show indicator
                    
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-300">{stage.name}</span>
                            <span className="text-[9px] bg-zinc-900 text-zinc-500 font-bold px-1.5 py-0.5 rounded border border-zinc-900/60 uppercase">
                              Prob: {stage.winProbability}%
                            </span>
                          </div>
                          <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                            {stageChartMetric === 'value' ? (
                              <>
                                <span className="text-zinc-500 text-[10px] font-medium">({stage.count} deals)</span>
                                ${stage.value.toLocaleString()}
                              </>
                            ) : (
                              <>
                                <span className="text-zinc-500 text-[10px] font-medium">(${stage.value.toLocaleString()})</span>
                                {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                              </>
                            )}
                          </span>
                        </div>
                        
                        {/* Horizontal Bar */}
                        <div className="h-6 bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-900 flex items-center relative group">
                          {/* Animated Fill */}
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-650 rounded-lg transition-all duration-1000 ease-out fill-animate hover:from-indigo-400 hover:to-violet-550 cursor-pointer"
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

        {/* Chart Card 2: Monthly Deal Volume */}
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-white">Deal close trend</h3>
            {/* Toggle tools */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setTrendChartMetric('value')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartMetric === 'value'
                      ? 'bg-indigo-650 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Value
                </button>
                <button
                  onClick={() => setTrendChartMetric('count')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartMetric === 'count'
                      ? 'bg-indigo-650 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Count
                </button>
              </div>

              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setTrendChartType('line')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartType === 'line'
                      ? 'bg-indigo-650 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setTrendChartType('bar')}
                  className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                    trendChartType === 'bar'
                      ? 'bg-indigo-650 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-355'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mb-6 uppercase tracking-wider">
            Expected close {trendChartMetric === 'value' ? 'value forecast' : 'numerical frequency'} for calendar year {currentYear}
          </p>

          <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
            {(() => {
              const height = 230
              const width = 500
              const paddingX = 40
              const paddingY = 25
              
              const values = monthlyData.map(d => trendChartMetric === 'value' ? d.value : d.count)
              const maxVal = Math.max(...values, 1)

              // Coordinates builder
              const points = monthlyData.map((d, idx) => {
                const currentVal = trendChartMetric === 'value' ? d.value : d.count
                const x = paddingX + (idx * (width - 2 * paddingX)) / (monthlyData.length - 1)
                const y = height - paddingY - (currentVal / maxVal) * (height - 2 * paddingY)
                return { x, y, value: currentVal, month: d.name }
              })

              // Build Bezier SVG line path
              const linePath = points.reduce((acc, p, idx) => {
                if (idx === 0) return `M ${p.x} ${p.y}`
                // Bezier anchor helper
                const prev = points[idx - 1]
                const cpX1 = prev.x + (p.x - prev.x) / 2
                const cpY1 = prev.y
                const cpX2 = prev.x + (p.x - prev.x) / 2
                const cpY2 = p.y
                return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`
              }, '')

              // Closed area path
              const areaPath = linePath
                ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
                : ''

              return (
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-zinc-850">
                  <defs>
                    {/* Area fill gradient definition */}
                    <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = paddingY + ratio * (height - 2 * paddingY)
                    const labelVal = maxVal * (1 - ratio)
                    
                    let yLabel = ''
                    if (trendChartMetric === 'value') {
                      yLabel = labelVal >= 1000 ? `$${(labelVal / 1000).toFixed(0)}k` : `$${Math.round(labelVal)}`
                    } else {
                      yLabel = `${Math.round(labelVal)}`
                    }

                    return (
                      <g key={idx}>
                        <text
                          x={paddingX - 10}
                          y={y + 4}
                          className="text-[9px] fill-zinc-650 font-semibold text-right"
                          textAnchor="end"
                        >
                          {yLabel}
                        </text>
                        {idx > 0 && idx < 4 && (
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={width - paddingX}
                            y2={y}
                            stroke="rgba(39, 39, 42, 0.6)"
                            strokeDasharray="4,4"
                          />
                        )}
                      </g>
                    )
                  })}

                  {/* Base X-Axis bottom line */}
                  <line
                    x1={paddingX}
                    y1={height - paddingY}
                    x2={width - paddingX}
                    y2={height - paddingY}
                    stroke="rgb(39, 39, 42)"
                    strokeWidth={1}
                  />

                  {/* Render Chart Content */}
                  {trendChartType === 'bar' ? (
                    // Bar Chart
                    points.map((p, idx) => {
                      const barWidth = 16
                      const barHeight = Math.max((height - paddingY) - p.y, 2)
                      return (
                        <g key={idx} className="group/dot cursor-pointer">
                          <rect
                            x={p.x - barWidth / 2}
                            y={p.y}
                            width={barWidth}
                            height={barHeight}
                            rx={3}
                            className="fill-indigo-650 hover:fill-indigo-500 transition-all duration-200"
                          />

                          {/* X label */}
                          <text
                            x={p.x}
                            y={height - paddingY + 14}
                            className="text-[9px] fill-zinc-550 font-bold"
                            textAnchor="middle"
                          >
                            {p.month}
                          </text>

                          {/* Tooltip background (shows on hover) */}
                          {p.value >= 0 && (
                            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200">
                              <rect
                                x={Math.max(p.x - 45, 5)}
                                y={p.y - 30}
                                width="90"
                                height="20"
                                rx="4"
                                fill="rgb(255, 255, 255)"
                                stroke="rgb(226, 232, 240)"
                                strokeWidth="1"
                              />
                              <text
                                x={Math.max(p.x, 50)}
                                y={p.y - 17}
                                className="text-[8px] fill-zinc-300 font-bold"
                                textAnchor="middle"
                              >
                                {trendChartMetric === 'value' ? `$${p.value.toLocaleString()}` : `${p.value} deals`}
                              </text>
                            </g>
                          )}
                        </g>
                      )
                    })
                  ) : (
                    // Line Chart logic
                    <>
                      {/* Bezier Area Graph rendering */}
                      {areaPath && (
                        <path
                          d={areaPath}
                          fill="url(#area-gradient)"
                        />
                      )}

                      {/* Glow active line */}
                      {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="rgb(99, 102, 241)"
                          strokeWidth={2.5}
                          className="drop-shadow-[0_4px_6px_rgba(99,102,241,0.2)]"
                        />
                      )}

                      {/* Data points & X axis label ticks */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/dot cursor-pointer">
                          {/* X label */}
                          <text
                            x={p.x}
                            y={height - paddingY + 14}
                            className="text-[9px] fill-zinc-555 font-bold"
                            textAnchor="middle"
                          >
                            {p.month}
                          </text>

                          {/* Tooltip background (shows on hover) */}
                          {p.value >= 0 && (
                            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200">
                              <rect
                                x={Math.max(p.x - 45, 5)}
                                y={p.y - 30}
                                width="90"
                                height="20"
                                rx="4"
                                fill="rgb(255, 255, 255)"
                                stroke="rgb(226, 232, 240)"
                                strokeWidth="1"
                              />
                              <text
                                x={Math.max(p.x, 50)}
                                y={p.y - 17}
                                className="text-[8px] fill-zinc-300 font-bold"
                                textAnchor="middle"
                              >
                                {trendChartMetric === 'value' ? `$${p.value.toLocaleString()}` : `${p.value} deals`}
                              </text>
                            </g>
                          )}

                          {/* Outer Glow Ring on Hover */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={6}
                            className="fill-indigo-500/0 group-hover/dot:fill-indigo-500/20 transition-all duration-200"
                          />
                          
                          {/* Anchor Dot */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={3}
                            className="fill-zinc-950 stroke-indigo-400 stroke-[2] group-hover/dot:r-4 transition-all duration-200"
                          />
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
