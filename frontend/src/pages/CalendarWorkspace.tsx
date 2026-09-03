import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Compass,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react'

interface CalendarEvent {
  id: string;
  type: 'DEAL' | 'PROJECT_START' | 'PROJECT_END' | 'TASK' | 'ACTIVITY';
  title: string;
  start: string;
  end: string;
  color: string;
  details?: string;
}

export default function CalendarWorkspace() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [scope, setScope] = useState<'PERSONAL' | 'TEAM' | 'COMPANY'>('COMPANY')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchEvents = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      // Fetch calendar window 30 days before/after current date
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString()
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString()
      
      const response = await apiClient.get<CalendarEvent[]>('/calendar/events', {
        params: { start_date: start, end_date: end, scope }
      })
      setEvents(response.data)
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 403) {
        setErrorMsg("Access denied: only ADMIN and MANAGER roles can access COMPANY or TEAM calendar views.")
        setEvents([])
      } else {
        setErrorMsg("Failed to load calendar events.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [currentDate, scope])

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // Generate calendar days
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = []

    // Previous month filler days
    const prevMonthTotalDays = new Date(year, month, 0).getDate()
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthTotalDays - i)
      })
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      })
    }

    return days
  }

  const days = getDaysInMonth()
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eDate = new Date(e.start)
      return eDate.getDate() === date.getDate() &&
             eDate.getMonth() === date.getMonth() &&
             eDate.getFullYear() === date.getFullYear()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-zinc-150">
            <CalendarIcon className="text-indigo-400 h-5.5 w-5.5" />
            CRM Shared Calendar
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Aggregated timelines indicating project launches, deal expected closings, task deliverables, and logged history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
          {/* Scope Selector */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-900">
            {(['PERSONAL', 'TEAM', 'COMPANY'] as const).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider cursor-pointer ${
                  scope === s
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-450 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Navigation toolbar */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 bg-zinc-950/80 border border-zinc-900 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-xs font-bold text-zinc-150 uppercase tracking-widest min-w-[120px] text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>

            <button
              onClick={nextMonth}
              className="p-2 bg-zinc-950/80 border border-zinc-900 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-4.5 min-h-[500px] flex flex-col justify-between">
          {errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <AlertCircle className="h-10 w-10 mb-3 text-rose-500/80 drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]" />
              <p className="text-zinc-200 text-sm font-bold tracking-wide">{errorMsg}</p>
              <p className="text-zinc-500 text-[10.5px] mt-1.5 max-w-sm leading-relaxed">
                Your role does not permit access to broader team or company-wide schedules. Switch to the <strong>PERSONAL</strong> scope to view your own assigned events.
              </p>
              <button
                onClick={() => setScope('PERSONAL')}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-xl text-[10px] font-bold text-zinc-200 tracking-wider uppercase transition-all cursor-pointer"
              >
                Switch to Personal Scope
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(wd => (
                  <span key={wd} className="text-center text-[10px] text-zinc-650 font-bold tracking-widest py-2">
                    {wd}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 flex-1 mt-1">
                {days.map((item, idx) => {
                  const dayEvents = getEventsForDay(item.date)
                  return (
                    <div
                      key={idx}
                      className={`min-h-[75px] p-1.5 rounded-lg border transition-all flex flex-col justify-between ${
                        item.isCurrentMonth
                          ? 'bg-zinc-950/15 border-zinc-900/60 hover:border-zinc-800'
                          : 'bg-zinc-900/40 border-transparent opacity-30 pointer-events-none'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${item.isCurrentMonth ? 'text-zinc-400' : 'text-zinc-700'}`}>
                        {item.day}
                      </span>
                      
                      <div className="space-y-1 mt-1 flex-1 overflow-y-auto">
                        {dayEvents.map(e => (
                          <div
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            style={{ borderLeftColor: e.color }}
                            className="text-[9px] font-semibold text-zinc-305 truncate p-1 rounded bg-zinc-900/90 border-l-2 cursor-pointer hover:bg-zinc-850"
                            title={e.title}
                          >
                            {e.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Event Details Panel */}
        <div className="lg:col-span-1 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-850 h-fit space-y-4 backdrop-blur-sm">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Timelines inspector</span>
          
          {selectedEvent ? (
            <div className="space-y-4 text-xs font-semibold">
              <div>
                <span
                  style={{ backgroundColor: `${selectedEvent.color}15`, color: selectedEvent.color, borderColor: `${selectedEvent.color}30` }}
                  className="px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider block w-fit"
                >
                  {selectedEvent.type}
                </span>
                <h3 className="font-bold text-zinc-150 text-sm mt-2">{selectedEvent.title}</h3>
                <p className="text-[10.5px] text-zinc-450 mt-1">{selectedEvent.details || 'No additional status detail provided.'}</p>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 text-[10px] space-y-1.5">
                <span className="text-zinc-650 font-bold uppercase block">Timeline Period</span>
                <div className="flex items-center gap-1.5 text-zinc-350 font-medium">
                  <Clock className="h-3.5 w-3.5 text-zinc-550" />
                  <span>{new Date(selectedEvent.start).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-600 border border-dashed border-zinc-850 rounded-xl min-h-[220px]">
              <Compass className="h-6 w-6 text-zinc-700 mb-2" />
              <span className="text-xs font-medium">Select any timeline slot on the calendar grids.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
