import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import type { User } from '@/types/crm'
import DealsKanban from './DealsKanban'
import ContactsDirectory from './ContactsDirectory'
import SummaryDashboard from '@/components/SummaryDashboard'
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
  TrendingUp
} from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // App States
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'summary' | 'pipeline' | 'contacts'>('summary')
  
  // UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('current_user')
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  const userInitials = currentUser
    ? `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase()
    : 'US'

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex overflow-hidden h-screen">
      {/* Sidebar - Dynamically adjusting width */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-18' : 'w-64'
        } bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between p-4 transition-all duration-350 ease-in-out flex-shrink-0`}
      >
        <div>
          {/* Brand & Toggle */}
          <div className="flex items-center justify-between mb-6 px-1 py-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-650/20 flex-shrink-0">
                M
              </div>
              {!isSidebarCollapsed && (
                <span className="font-bold text-zinc-100 text-md tracking-tight whitespace-nowrap">
                  Mintana CRM
                </span>
              )}
            </div>
            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-md hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                Main Menu
              </span>
            )}
            
            <button
              onClick={() => setCurrentView('summary')}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'summary'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Summary Dashboard"
            >
              <TrendingUp className="h-4.5 w-4.5 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Summary Analytics</span>}
            </button>

            <button
              onClick={() => setCurrentView('pipeline')}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'pipeline'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Deals Pipeline Board"
            >
              <Layers className="h-4.5 w-4.5 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Pipeline Dashboard</span>}
            </button>

            <button
              onClick={() => setCurrentView('contacts')}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
              } rounded-lg text-sm font-medium transition-all ${
                currentView === 'contacts'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                  : 'text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 border border-transparent'
              } cursor-pointer`}
              title="Contacts Directory"
            >
              <Users className="h-4.5 w-4.5 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Contacts</span>}
            </button>

            {/* Mocks of other routes to illustrate premium UI design */}
            <div className="opacity-40 pointer-events-none">
              <button
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
                } rounded-lg text-sm font-medium border border-transparent`}
              >
                <Briefcase className="h-4.5 w-4.5 flex-shrink-0" />
                {!isSidebarCollapsed && <span>Companies</span>}
              </button>
            </div>
          </nav>
        </div>

        {/* User Identity - Collapsible Dropdown Trigger inside Footer */}
        <div className="border-t border-zinc-900 pt-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="w-full flex items-center justify-between hover:bg-zinc-900/60 p-1.5 rounded-lg transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-indigo-600/20 border border-indigo-600/35 flex items-center justify-center text-xs font-bold text-indigo-400 uppercase flex-shrink-0">
                {userInitials}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-semibold text-zinc-300 truncate">
                    {currentUser?.first_name} {currentUser?.last_name}
                  </span>
                  <span className="text-[10px] text-zinc-550 truncate font-semibold uppercase">
                    {currentUser?.role === 'ADMIN' ? 'Administrator' : 'Sales Agent'}
                  </span>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <ChevronRight className="h-3 w-3 text-zinc-500 hover:text-zinc-300 transition-colors" />
            )}
          </button>

          {/* User Popover Profile Dropdown menu */}
          {isProfileDropdownOpen && (
            <div className={`absolute bottom-12 ${isSidebarCollapsed ? 'left-14' : 'left-0 right-0'} z-50 bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 shadow-xl w-56 flex flex-col space-y-1.5`}>
              <div className="px-2 py-1.5 border-b border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Currently Logged In</span>
                <span className="text-xs font-semibold text-zinc-200">{currentUser?.email}</span>
                <span className="text-[9px] font-medium text-indigo-400 block mt-0.5 uppercase tracking-wide">
                  Tenant: {currentUser?.organization?.name || 'Local'}
                </span>
              </div>
              
              <div className="py-1 space-y-0.5">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-zinc-900 cursor-default">
                  <Building className="h-3.5 w-3.5" />
                  <span>Org Settings</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-zinc-900 cursor-default">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Access Control</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full border-t border-zinc-900 pt-1.5 mt-1.5 flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 rounded hover:bg-red-500/10 transition-colors cursor-pointer text-left font-medium"
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
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/20 backdrop-blur-md px-8 flex justify-between items-center text-sm flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
            <span>Workspace</span>
            <span className="text-zinc-650">/</span>
            <span className="text-indigo-400 font-bold">
              {currentView === 'summary' ? 'Summary Analytics' : currentView === 'pipeline' ? 'Deals Board' : 'Contacts Directory'}
            </span>
          </div>

          {/* Combined Options */}
          <div className="flex items-center gap-4">
            {/* Global Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Global searching..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="bg-zinc-950 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-900 focus:border-indigo-650 focus:outline-none text-xs text-zinc-300 placeholder-zinc-600 w-52 focus:w-64 transition-all"
              />
            </div>

            <button className="relative p-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-zinc-950/15">
          {currentView === 'summary' ? (
            <SummaryDashboard />
          ) : currentView === 'pipeline' ? (
            <DealsKanban />
          ) : (
            <ContactsDirectory />
          )}
        </div>
      </main>
    </div>
  )
}
