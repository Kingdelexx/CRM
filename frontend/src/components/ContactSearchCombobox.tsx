import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, CheckCircle2, User as UserIcon } from 'lucide-react'
import type { Contact } from '@/types/crm'

interface ContactSearchComboboxProps {
  label: string;
  sublabel?: string;
  placeholder?: string;
  contacts?: Contact[];
  selectedContactId?: string;
  onSelect: (contactId: string) => void;
  onClear: () => void;
}

export default function ContactSearchCombobox({
  label,
  sublabel,
  placeholder,
  contacts = [],
  selectedContactId,
  onSelect,
  onClear,
}: ContactSearchComboboxProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Find currently linked contact
  const selectedContact = useMemo(() => {
    if (!selectedContactId || !contacts.length) return null
    return contacts.find((c) => c.id === selectedContactId) || null
  }, [contacts, selectedContactId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter contacts by name, email, phone, or company
  const filteredContacts = useMemo(() => {
    if (!contacts.length) return []
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) {
      return contacts.slice(0, 10)
    }
    return contacts
      .filter((c) => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
        const phone = (c.phone || c.whatsapp_number || '').toLowerCase()
        const email = (c.email || '').toLowerCase()
        const company = (c.company?.name || '').toLowerCase()
        return (
          name.includes(trimmed) ||
          phone.includes(trimmed) ||
          email.includes(trimmed) ||
          company.includes(trimmed)
        )
      })
      .slice(0, 15)
  }, [contacts, query])

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 font-semibold">{label}</label>
        {sublabel && (
          <span className="text-[10px] text-emerald-400/90 font-medium">{sublabel}</span>
        )}
      </div>

      {selectedContact ? (
        <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 border border-emerald-500/40 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>
                  {selectedContact.first_name} {selectedContact.last_name === '.' ? '' : selectedContact.last_name}
                </span>
                <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Linked Contact
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                {[selectedContact.phone || selectedContact.whatsapp_number, selectedContact.email]
                  .filter(Boolean)
                  .join(' • ') || 'No direct phone/email'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear()
              setQuery('')
              setIsOpen(true)
            }}
            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
            title="Change contact"
          >
            <X className="h-3 w-3" /> Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder || 'Search contact by name, phone, or email...'}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-600 focus:outline-none rounded-lg pl-9 pr-8 py-2 text-xs text-zinc-200 placeholder-zinc-600 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 max-h-56 overflow-y-auto">
              {filteredContacts.length > 0 ? (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between">
                    <span>{query ? `Search Results (${filteredContacts.length})` : 'Recent Contacts'}</span>
                    <span>Click to autofill</span>
                  </div>
                  {filteredContacts.map((c) => {
                    const fullName = [c.first_name, c.last_name === '.' ? '' : c.last_name].filter(Boolean).join(' ')
                    const contactDetails = [c.phone || c.whatsapp_number, c.email].filter(Boolean).join(' • ')
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelect(c.id)
                          setIsOpen(false)
                          setQuery('')
                        }}
                        className="p-2.5 hover:bg-zinc-900/90 cursor-pointer border-b border-zinc-900/80 last:border-b-0 flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                            <span>{fullName || 'Unnamed Contact'}</span>
                            {c.company?.name && (
                              <span className="text-[10px] text-zinc-500 font-normal">({c.company.name})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {contactDetails || 'No phone/email'}
                          </div>
                        </div>
                        {c.status && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium uppercase flex-shrink-0">
                            {c.status}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  <div className="p-2 bg-zinc-900/50 border-t border-zinc-800/60 text-center text-[10px] text-zinc-500">
                    Not in list? Type details manually into the fields below
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-xs text-zinc-400">No contacts found matching "{query}"</p>
                  <p className="text-[10px] text-zinc-500 mt-1">You can type details manually into the fields below</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
