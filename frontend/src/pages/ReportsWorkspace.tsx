import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import type { Report } from '@/types/crm'
import {
  BarChart3,
  Plus,
  FileText,
  Trash2,
  Filter,
  PieChart,
  Calendar,
  Layers,
  Database,
  RefreshCw,
  TrendingUp,
  Table as TableIcon
} from 'lucide-react'

import { CSRReportsWorkspace } from '@/components/CSRReportsWorkspace'

interface ReportData {
  rows: any[]
  summary: Record<string, any>
  display_type: Report['display_type']
}

export default function ReportsWorkspace() {
  const [activeTab, setActiveTab] = useState<'CUSTOM' | 'CSR'>('CSR')

  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(false)

  // Creator Modal options
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_module: 'DEALS' as Report['base_module'],
    display_type: 'SUMMARY_CARDS' as Report['display_type'],
    statusFilter: ''
  })

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<Report[]>('/reports')
      setReports(response.data)
      if (response.data.length > 0 && !selectedReport) {
        setSelectedReport(response.data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadReportData = async (report: Report) => {
    setIsDataLoading(true)
    try {
      const response = await apiClient.get<ReportData>(`/reports/${report.id}/data`)
      setReportData(response.data)
    } catch (err) {
      console.error(err)
      setReportData(null)
    } finally {
      setIsDataLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    if (selectedReport) {
      loadReportData(selectedReport)
    } else {
      setReportData(null)
    }
  }, [selectedReport])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    const payload = {
      name: formData.name,
      description: formData.description,
      base_module: formData.base_module,
      display_type: formData.display_type,
      filters: formData.statusFilter ? { status: formData.statusFilter } : {}
    }

    try {
      const response = await apiClient.post<Report>('/reports', payload)
      setReports([...reports, response.data])
      setSelectedReport(response.data)
      setIsModalOpen(false)
      setFormData({
        name: '',
        description: '',
        base_module: 'DEALS',
        display_type: 'SUMMARY_CARDS',
        statusFilter: ''
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report configuration?')) return
    try {
      await apiClient.delete(`/reports/${id}`)
      const filtered = reports.filter(r => r.id !== id)
      setReports(filtered)
      if (selectedReport?.id === id) {
        setSelectedReport(filtered.length > 0 ? filtered[0] : null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Pure CSS/SVG charts widgets for high fidelity premium looking charts
  const renderSVGChart = (data: ReportData) => {
    const rows = data.rows || []
    const summary = data.summary || {}
    const type = data.display_type

    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-550 border border-zinc-800 rounded-xl bg-zinc-950/20">
          <Database className="h-6 w-6 text-zinc-750 mb-2" />
          <span className="text-xs">No matching entries to calculate visualization.</span>
        </div>
      )
    }

    // Pie chart / bar charts from deals / tasks / projects summaries
    if (type === 'PIE_CHART') {
      // Find statuses distribution from summary
      const categories = Object.entries(summary).filter(([k]) => k !== 'total_deals' && k !== 'total_value' && k !== 'total_projects' && k !== 'total_tasks')
      const total = categories.reduce((sum, [_, val]) => sum + (Number(val) || 0), 0)

      if (total === 0) {
        return <div className="text-center text-xs text-zinc-500 py-8">Metadata distribution total is zero.</div>
      }

      let cumulativePercent = 0
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

      return (
        <div className="flex flex-col md:flex-row items-center justify-around gap-6 p-4">
          <svg viewBox="0 0 100 100" className="w-44 h-44 transform -rotate-90">
            {categories.map(([key, val], idx) => {
              const count = Number(val) || 0
              const percentage = (count / total) * 100
              const strokeDasharray = `${percentage} ${100 - percentage}`
              const strokeDashoffset = 100 - cumulativePercent
              cumulativePercent += percentage
              return (
                <circle
                  key={key}
                  cx="50"
                  cy="50"
                  r="15.915"
                  fill="transparent"
                  stroke={colors[idx % colors.length]}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              )
            })}
          </svg>
          <div className="space-y-2">
            {categories.map(([key, val], idx) => (
              <div key={key} className="flex items-center gap-3 text-xs">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                <span className="text-zinc-350 capitalize font-medium">{key.replace('_', ' ')}:</span>
                <span className="text-zinc-100 font-bold">{val}</span>
                <span className="text-zinc-500 text-[10px]">({Math.round((Number(val) / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (type === 'BAR_CHART') {
      const categories = Object.entries(summary).filter(([k]) => k !== 'total_deals' && k !== 'total_value' && k !== 'total_projects' && k !== 'total_tasks')
      const maxVal = Math.max(...categories.map(([_, v]) => Number(v) || 0), 1)

      return (
        <div className="space-y-4 p-4">
          {categories.map(([key, val], idx) => {
            const count = Number(val) || 0
            const percentage = (count / maxVal) * 100
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400 capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-zinc-200">{count}</span>
                </div>
                <div className="w-full bg-zinc-950/80 rounded-full h-3 overflow-hidden border border-zinc-900">
                  <div
                    className="bg-indigo-650 h-full rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // LINE CHART or fallback
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-550 border border-zinc-800 rounded-xl bg-zinc-950/20">
        <TrendingUp className="h-6 w-6 text-indigo-400 mb-2" />
        <span className="text-xs">Summary Cards and Tables represent the primary modes.</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <BarChart3 className="h-10 w-10 text-indigo-500 animate-pulse" />
        <span className="ml-3 text-zinc-400 text-sm">Processing Reports Workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-zinc-800 space-x-6">
        <button
          onClick={() => setActiveTab('CSR')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'CSR'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          CSR Performance Reports
        </button>

        <button
          onClick={() => setActiveTab('CUSTOM')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'CUSTOM'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics & Custom Reports
        </button>
      </div>

      {activeTab === 'CSR' ? (
        <CSRReportsWorkspace />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2.5 text-zinc-150">
                <BarChart3 className="text-indigo-400 h-5.5 w-5.5" />
                Decision Intelligence & Reports
              </h1>
              <p className="text-xs text-zinc-450 mt-1">
                Build specialized workspace analytics, inspect performance indexes, and download database stats.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer transform hover:scale-[1.02] transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Custom Report
            </button>
          </div>
        </>
      )}

      {activeTab === 'CUSTOM' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side Roster */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 h-fit space-y-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Available Templates</span>
          <div className="space-y-1">
            {reports.map(rep => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs transition-all border ${
                  selectedReport?.id === rep.id
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/40 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <span className="truncate">{rep.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(rep.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 rounded cursor-pointer transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {reports.length === 0 && (
              <span className="text-xs text-zinc-550 block py-4 text-center">No reports initialized. Click create above.</span>
            )}
          </div>
        </div>

        {/* Right Side Render Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedReport ? (
            <>
              {/* Header Info */}
              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-md font-bold text-zinc-200">{selectedReport.name}</h2>
                  <p className="text-xs text-zinc-450 mt-1">{selectedReport.description || 'Custom report definitions overview.'}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 bg-zinc-950/60 px-3.5 py-2 rounded-xl border border-zinc-900">
                  <span className="flex items-center gap-1.5 uppercase text-[10px]">
                    <Database className="h-3.5 w-3.5 text-zinc-500" />
                    Module: {selectedReport.base_module}
                  </span>
                  <span className="text-zinc-700">|</span>
                  <span className="flex items-center gap-1.5 uppercase text-[10px]">
                    <Filter className="h-3.5 w-3.5 text-zinc-550" />
                    Layout: {selectedReport.display_type}
                  </span>
                </div>
              </div>

              {/* Data Load Loader or widgets block */}
              {isDataLoading ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin" />
                </div>
              ) : reportData ? (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  {selectedReport.display_type === 'SUMMARY_CARDS' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(reportData.summary || {}).map(([key, val]) => (
                        <div key={key} className="bg-zinc-900/50 p-4 border border-zinc-855 rounded-2xl flex flex-col">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{key.replace('_', ' ')}</span>
                          <span className="text-lg font-bold text-zinc-200 mt-1">
                            {typeof val === 'number' && key.includes('value') ? `$${val.toLocaleString()}` : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chart Block */}
                  {selectedReport.display_type !== 'TABLE' && selectedReport.display_type !== 'SUMMARY_CARDS' && (
                    <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-850">
                      <h3 className="text-xs font-bold text-zinc-450 uppercase mb-4 tracking-wider">Visual Distribution Chart</h3>
                      {renderSVGChart(reportData)}
                    </div>
                  )}

                  {/* Table List View */}
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-850 flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                        <TableIcon className="h-4 w-4 text-zinc-500" />
                        Retrieved Database Record Entries ({reportData.rows?.length || 0})
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-zinc-950/80 sticky top-0 text-[10px] uppercase font-bold tracking-wider text-zinc-500 border-b border-zinc-900">
                          <tr>
                            {reportData.rows && reportData.rows.length > 0
                              ? Object.keys(reportData.rows[0]).filter(k => k !== 'id').map(key => (
                                  <th key={key} className="px-6 py-3.5 font-bold uppercase">{key.replace('_', ' ')}</th>
                                ))
                              : <th className="px-6 py-3">No Fields</th>
                            }
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {reportData.rows?.map((row, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                              {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val]) => (
                                <th key={key} className="px-6 py-3.5 font-medium text-zinc-350 max-w-[200px] truncate">
                                  {typeof val === 'number' && key.includes('value') ? `$${val}` : String(val)}
                                </th>
                              ))}
                            </tr>
                          ))}
                          {(!reportData.rows || reportData.rows.length === 0) && (
                            <tr>
                              <th colSpan={6} className="text-center py-12 text-zinc-650 font-normal">None loaded.</th>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500 text-xs bg-zinc-900/10 border border-dashed border-zinc-850 rounded-2xl">
                  Report failed to load data. Please retry again.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-24 text-center text-zinc-550 border border-dashed border-zinc-880 rounded-2xl h-80 bg-zinc-950/10">
              <BarChart3 className="h-8 w-8 text-zinc-700 mb-3" />
              <span className="text-xs font-semibold">Select or instantiate a report configuration to evaluate leads, deals conversion ratios, and productivity.</span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Creation Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-200">Configure Custom SQL Report</h2>
              <p className="text-[11px] text-zinc-500 mt-1">Declare target Django app base modules and display dimensions.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-zinc-400">Report Moniker Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Conversion Report 2026"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Short Explanation Description</label>
                <input
                  type="text"
                  placeholder="Summarize report scope"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-205 focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-400">Target CRM Table</label>
                  <select
                    value={formData.base_module}
                    onChange={e => setFormData({ ...formData, base_module: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="DEALS">Deals</option>
                    <option value="PROJECTS">Projects</option>
                    <option value="TASKS">Tasks</option>
                    <option value="ACTIVITIES">Activities</option>
                    <option value="LEADS">Leads</option>
                    <option value="CUSTOMERS">Customers</option>
                    <option value="EMPLOYEES">Employees</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400">Display Layout</label>
                  <select
                    value={formData.display_type}
                    onChange={e => setFormData({ ...formData, display_type: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="SUMMARY_CARDS">Summary Cards</option>
                    <option value="BAR_CHART">Bar Chart</option>
                    <option value="PIE_CHART">Pie Chart</option>
                    <option value="TABLE">Plain Table</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Optional Status Filter Pattern</label>
                <select
                  value={formData.statusFilter}
                  onChange={e => setFormData({ ...formData, statusFilter: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-650 cursor-pointer"
                >
                  <option value="">No status filter</option>
                  {formData.base_module === 'DEALS' && (
                    <>
                      <option value="OPEN">Open Deals</option>
                      <option value="WON">Won Deals</option>
                      <option value="LOST">Lost Deals</option>
                    </>
                  )}
                  {formData.base_module === 'PROJECTS' && (
                    <>
                      <option value="PLANNING">Planning</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="READY">Ready</option>
                      <option value="DELIVERED">Delivered</option>
                    </>
                  )}
                  {formData.base_module === 'TASKS' && (
                    <>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Completed</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer text-center text-xs"
                >
                  Save Report
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-colors cursor-pointer text-center text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
