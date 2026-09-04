import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import type { User } from '@/types/crm'
import DealsKanban from './DealsKanban'
import ContactsDirectory from './ContactsDirectory'
import SummaryDashboard from '@/components/SummaryDashboard'
import ProjectsWorkspace from './ProjectsWorkspace'
import ReportsWorkspace from './ReportsWorkspace'
import WhatsAppWorkspace from './WhatsAppWorkspace'
import AutomationsWorkspace from './AutomationsWorkspace'
import ApprovalsWorkspace from './ApprovalsWorkspace'
import SettingsWorkspace from './SettingsWorkspace'
import CalendarWorkspace from './CalendarWorkspace'
import EmailSyncWorkspace from './EmailSyncWorkspace'
import { InvoicesWorkspace } from './InvoicesWorkspace'
import DetailDrawer from '@/components/DetailDrawer'
import {
  LogOut,
  Users,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Building,
  Shield,
  Loader2,
  FolderOpen,
  TrendingUp,
  FolderKanban,
  BarChart3,
  MessageSquare,
  Zap,
  FileCheck,
  Settings,
  Calendar as CalendarIcon,
  Mail,
  Receipt as ReceiptIcon,
  Menu,
  X
} from 'lucide-react'

type DashboardView =
  | 'summary'
  | 'pipeline'
  | 'contacts'
  | 'projects'
  | 'reports'
  | 'whatsapp'
  | 'automations'
  | 'approvals'
  | 'settings'
  | 'calendar'
  | 'emails'
  | 'invoices'

export default function Dashboard() {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  
  // App States
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<DashboardView>('summary')
  
  // UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<any | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Drawer States
  const [drawerType, setDrawerType] = useState<'contact' | 'deal' | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)

  useEffect(() => {
    // Attempt to load current user from API
    const fetchUser = async () => {
      try {
        const response = await apiClient.get<User>('/accounts/me')
        setCurrentUser(response.data)
      } catch (err) {
        console.error('Failed to load user session', err)
        const saved = localStorage.getItem('current_user')
        if (saved) {
          setCurrentUser(JSON.parse(saved))
        } else {
          navigate('/login')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [navigate])

  // Close dropdown on click-away
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchText('')
        setSearchResults(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Trigger Search
  useEffect(() => {
    if (searchText.trim().length < 2) {
      setSearchResults(null)
      return
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await apiClient.get<any>('/search/', {
          params: { q: searchText }
        })
        setSearchResults(response.data)
      } catch (err) {
        console.error('Search failed', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchText])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('current_user')
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  const userInitials = currentUser
    ? `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase()
    : 'US'

  const getBreadcrumbTitle = () => {
    switch (currentView) {
      case 'summary':
        return 'Summary Analytics'
      case 'pipeline':
        return 'Deals Board'
      case 'contacts':
        return 'Contacts Directory'
      case 'projects':
        return 'Projects Management'
      case 'reports':
        return 'Visual Reports & Analytics'
      case 'whatsapp':
        return 'WhatsApp Communication'
      case 'automations':
        return 'Workflow Automations'
      case 'approvals':
        return 'Approvals & Compliance'
      case 'settings':
        return 'Organization Settings'
      case 'calendar':
        return 'CRM Calendar Events'
      case 'emails':
        return 'Email Sync Channels'
      default:
        return 'CRM Directory'
    }
  }

  const handleNavClick = (view: DashboardView) => {
    setCurrentView(view);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex overflow-hidden h-screen">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar - Desktop & Mobile Off-canvas Drawer */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between p-4 transition-all duration-300 ease-in-out flex-shrink-0
          ${isSidebarCollapsed ? 'md:w-18' : 'md:w-64'}
          ${isMobileSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] pr-1">
          {/* Brand & Toggle */}
          <div className="flex items-center justify-between mb-2 px-1 py-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <img 
                src="/mintana-logo.jpg" 
                alt="Mintana Global Logistics Logo" 
                className="h-8 w-auto object-contain rounded bg-white px-1.5 py-0.5 shadow-md flex-shrink-0" 
              />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                <span className="font-bold text-zinc-100 text-sm tracking-tight whitespace-nowrap">
                  Mintana CRM
                </span>
              )}
            </div>
            
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:block p-1 rounded-md hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-405 hover:text-white transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1 rounded-md hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <span className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                Main Menu
              </span>
            )}
            
            <button
              onClick={() => handleNavClick('summary')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'summary'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Summary Dashboard"
            >
              <TrendingUp className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Summary Analytics</span>}
            </button>

            <button
              onClick={() => handleNavClick('pipeline')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'pipeline'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Deals Pipeline Board"
            >
              <Layers className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Pipeline Dashboard</span>}
            </button>

            <button
              onClick={() => handleNavClick('contacts')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'contacts'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Contacts Directory"
            >
              <Users className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Contacts</span>}
            </button>

            <button
              onClick={() => handleNavClick('projects')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'projects'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Project Modules"
            >
              <FolderKanban className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Projects</span>}
            </button>

            <button
              onClick={() => handleNavClick('invoices')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'invoices'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Invoices & Receipts"
            >
              <ReceiptIcon className="h-4.5 w-4.5 flex-shrink-0 text-sky-400" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Invoices & Receipts</span>}
            </button>

            <button
              onClick={() => handleNavClick('calendar')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'calendar'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Shared Calendar"
            >
              <CalendarIcon className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>CRM Calendar</span>}
            </button>

            <button
              onClick={() => handleNavClick('emails')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'emails'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Email Sync Lines"
            >
              <Mail className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Emails Sync</span>}
            </button>

            <button
              onClick={() => handleNavClick('whatsapp')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'whatsapp'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-655/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="WhatsApp Channel"
            >
              <MessageSquare className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>WhatsApp Inbox</span>}
            </button>

            <button
              onClick={() => handleNavClick('automations')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'automations'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-655/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Automations Engine"
            >
              <Zap className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Automation Rules</span>}
            </button>

            <button
              onClick={() => handleNavClick('approvals')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'approvals'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-650/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Approvals Workflow"
            >
              <FileCheck className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Signoff Compliance</span>}
            </button>

            <button
              onClick={() => handleNavClick('reports')}
              className={`w-full flex items-center ${
                isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'reports'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-655/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Visual Reports"
            >
              <BarChart3 className="h-4.5 w-4.5 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Reports Visualizer</span>}
            </button>
          </nav>
        </div>

        {/* User Identity - Collapsible Dropdown Trigger inside Footer */}
        <div className="border-t border-zinc-900 pt-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="w-full flex items-center justify-between hover:bg-zinc-900/60 p-1.5 rounded-lg transition-colors cursor-pointer text-left focus:outline-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-indigo-600/20 border border-indigo-600/35 flex items-center justify-center text-xs font-bold text-indigo-400 uppercase flex-shrink-0">
                {userInitials}
              </div>
              {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-semibold text-zinc-300 truncate">
                    {currentUser?.first_name} {currentUser?.last_name}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate font-semibold uppercase">
                    {currentUser?.role === 'ADMIN' ? 'Administrator' : currentUser?.role === 'MANAGER' ? 'Manager' : 'Staff Member'}
                  </span>
                </div>
              )}
            </div>
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <ChevronRight className="h-3 w-3 text-zinc-500 hover:text-zinc-300 transition-colors" />
            )}
          </button>

          {/* User Popover Profile Dropdown menu */}
          {isProfileDropdownOpen && (
            <div className={`absolute bottom-12 ${isSidebarCollapsed && !isMobileSidebarOpen ? 'left-14' : 'left-0 right-0'} z-50 bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 shadow-xl w-56 flex flex-col space-y-1.5`}>
              <div className="px-2 py-1.5 border-b border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-505 uppercase tracking-wider block">Currently Logged In</span>
                <span className="text-xs font-semibold text-zinc-200">{currentUser?.email}</span>
                <span className="text-[9px] font-medium text-indigo-400 block mt-0.5 uppercase tracking-wide">
                  Tenant: {currentUser?.organization?.name || 'Local'}
                </span>
              </div>
              
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    handleNavClick('settings');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-zinc-900 cursor-pointer text-left focus:outline-none"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Org Settings</span>
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-full border-t border-zinc-900 pt-1.5 mt-1.5 flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 rounded hover:bg-red-500/10 transition-colors cursor-pointer text-left font-medium focus:outline-none"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out Session</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content body */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/20 backdrop-blur-md px-4 sm:px-8 flex justify-between items-center text-sm flex-shrink-0">
          {/* Mobile Menu Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              aria-label="Toggle Mobile Navigation"
            >
              {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <FolderOpen className="h-3.5 w-3.5 text-zinc-500 hidden sm:inline" />
              <span className="hidden sm:inline">Workspace</span>
              <span className="text-zinc-600 hidden sm:inline">/</span>
              <span className="text-indigo-400 font-bold truncate max-w-[140px] sm:max-w-none">
                {getBreadcrumbTitle()}
              </span>
            </div>
          </div>

          {/* Combined Options */}
          <div className="flex items-center gap-4">
            {/* Global Search Bar */}
            <div className="relative hidden md:block" ref={searchRef}>
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-550" />
              <input
                type="text"
                placeholder="Global searching..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="bg-zinc-950 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-900 focus:border-indigo-650 focus:outline-none text-xs text-zinc-305 placeholder-zinc-650 w-52 focus:w-64 transition-all"
              />

              {/* Dropdown Results Overlay */}
              {searchText.trim().length >= 2 && (
                <div className="absolute right-0 top-11 z-[60] bg-zinc-950/95 border border-zinc-900 rounded-xl p-4 shadow-2xl w-[450px] max-h-[480px] overflow-y-auto backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <span>Search Results for "{searchText}"</span>
                    {isSearching && <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />}
                  </div>

                  {!isSearching && searchResults && Object.values(searchResults).every((arr: any) => arr.length === 0) && (
                    <div className="text-center py-6 text-zinc-500 text-xs font-semibold">
                      No results matched your query.
                    </div>
                  )}

                  {!isSearching && searchResults && (
                    <div className="space-y-4">
                      {/* Contacts */}
                      {searchResults.contacts?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider block">Contacts</span>
                          {searchResults.contacts.map((c: any) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setDrawerType('contact')
                                setDrawerId(c.id)
                                setSearchText('')
                                setSearchResults(null)
                              }}
                              className="p-2 hover:bg-zinc-900/40 rounded-lg cursor-pointer border border-transparent hover:border-zinc-900 transition-all flex items-center justify-between font-semibold"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-200 block">{c.title}</span>
                                <span className="text-[10px] text-zinc-500 block truncate">{c.subtitle}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Deals */}
                      {searchResults.deals?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider block">Deals</span>
                          {searchResults.deals.map((d: any) => (
                            <div
                              key={d.id}
                              onClick={() => {
                                setDrawerType('deal')
                                setDrawerId(d.id)
                                setSearchText('')
                                setSearchResults(null)
                              }}
                              className="p-2 hover:bg-zinc-900/40 rounded-lg cursor-pointer border border-transparent hover:border-zinc-905 transition-all flex items-center justify-between font-semibold"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-200 block">{d.title}</span>
                                <span className="text-[10px] text-zinc-500 block truncate">{d.subtitle}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Projects */}
                      {searchResults.projects?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-455 tracking-wider block">Projects</span>
                          {searchResults.projects.map((p: any) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setCurrentView('projects')
                                setSearchText('')
                                setSearchResults(null)
                              }}
                              className="p-2 hover:bg-zinc-900/40 rounded-lg cursor-pointer border border-transparent hover:border-zinc-900 transition-all flex items-center justify-between font-semibold"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-200 block">{p.title}</span>
                                <span className="text-[10px] text-zinc-500 block truncate">{p.subtitle}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tasks */}
                      {searchResults.tasks?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider block">Tasks</span>
                          {searchResults.tasks.map((t: any) => (
                            <div
                              key={t.id}
                              onClick={() => {
                                if (t.contact_id) {
                                  setDrawerType('contact')
                                  setDrawerId(t.contact_id)
                                } else if (t.deal_id) {
                                  setDrawerType('deal')
                                  setDrawerId(t.deal_id)
                                }
                                setSearchText('')
                                setSearchResults(null)
                              }}
                              className="p-2 hover:bg-zinc-900/40 rounded-lg cursor-pointer border border-transparent hover:border-zinc-900 transition-all flex items-center justify-between font-semibold"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-200 block">{t.title}</span>
                                <span className="text-[10px] text-zinc-550 block truncate">{t.subtitle}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Documents */}
                      {searchResults.documents?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider block">Documents</span>
                          {searchResults.documents.map((doc: any) => (
                            <a
                              key={doc.id}
                              href={doc.file_url || doc.subtitle}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                setSearchText('')
                                setSearchResults(null)
                              }}
                              className="p-2 hover:bg-zinc-900/40 rounded-lg cursor-pointer border border-transparent hover:border-zinc-900 transition-all flex items-center justify-between font-semibold"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-205 block">{doc.title}</span>
                                <span className="text-[10px] text-zinc-555 block truncate">{doc.subtitle}</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Synced Emails */}
                      {searchResults.emails?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider block">Synced Emails</span>
                          {searchResults.emails.map((e: any) => (
                            <div
                              key={e.id}
                              onClick={() => {
                                setCurrentView('emails')
                                setSearchText('')
                                setSearchResults(null)
                              }}
                              className="p-2 hover:bg-zinc-900/40 rounded-lg cursor-pointer border border-transparent hover:border-zinc-900 transition-all flex items-center justify-between font-semibold"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-200 block">{e.title}</span>
                                <span className="text-[10px] text-zinc-500 block truncate">{e.subtitle}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="relative p-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-905 text-zinc-450 hover:text-white transition-all cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-300/50">
          {currentView === 'summary' && <SummaryDashboard />}
          {currentView === 'pipeline' && <DealsKanban />}
          {currentView === 'contacts' && <ContactsDirectory />}
          {currentView === 'projects' && <ProjectsWorkspace />}
          {currentView === 'reports' && <ReportsWorkspace />}
          {currentView === 'whatsapp' && <WhatsAppWorkspace />}
          {currentView === 'automations' && <AutomationsWorkspace />}
          {currentView === 'approvals' && <ApprovalsWorkspace />}
          {currentView === 'settings' && <SettingsWorkspace />}
          {currentView === 'calendar' && <CalendarWorkspace />}
          {currentView === 'emails' && <EmailSyncWorkspace />}
          {currentView === 'invoices' && <InvoicesWorkspace />}
        </div>
      </main>

      {/* Global Detail Drawer */}
      <DetailDrawer
        isOpen={drawerType !== null && drawerId !== null}
        type={drawerType || 'contact'}
        id={drawerId}
        onClose={() => {
          setDrawerType(null)
          setDrawerId(null)
        }}
      />
    </div>
  )
}
