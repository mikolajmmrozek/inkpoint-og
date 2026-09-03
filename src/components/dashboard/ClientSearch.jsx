import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Search, History } from 'lucide-react';

export default function ClientSearch({ value, onSelect, t }) {
  const [query, setQuery] = useState(value?.name || '');
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Load clients on mount so the list is ready before the user types
  useEffect(() => {
    base44.entities.Client.list('-created_date', 2000).then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); return; }
    // Token-based matching: every whitespace-separated token must appear in name/email/phone
    const tokens = query.toLowerCase().trim().split(/\s+/);
    setFiltered(clients.filter(c => {
      const haystack = `${(c.name || '')} ${(c.email || '')} ${(c.phone || '')}`.toLowerCase();
      return tokens.every(tok => haystack.includes(tok));
    }).slice(0, 8));
  }, [query, clients]);

  useEffect(() => {
    const handle = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSelect = async (client) => {
    setQuery(client.name);
    setOpen(false);

    if ((client.total_sessions || 0) > 0 && client.email) {
      try {
        const sessions = await base44.entities.Booking.filter({ client_email: client.email }, '-session_date', 5);
        const lastSession = sessions.filter(s => s.status !== 'cancelled')[0] || sessions[0];
        if (lastSession) {
          onSelect({ ...client, _lastSession: lastSession });
          return;
        }
      } catch {}
    }

    onSelect(client);
  };

  const handleNewClient = () => {
    onSelect({ name: query, email: '', phone: '', _isNew: true });
    setOpen(false);
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    color: t.text,
    padding: '10px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={12} color={t.muted} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          style={{ ...inputStyle, paddingLeft: '20px' }}
          placeholder="Szukaj klienta po imieniu, emailu, telefonie..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={e => { setOpen(true); e.target.style.borderBottomColor = 'var(--brand)'; }}
          onBlur={e => e.target.style.borderBottomColor = t.border}
        />
      </div>

      {open && query.trim() && (
        <div
          className="absolute left-0 right-0 z-50 overflow-hidden"
          style={{ top: '100%', background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#111111', border: `0.5px solid ${t.border}`, maxHeight: '280px', overflowY: 'auto' }}
        >
          {filtered.map(client => (
            <button
              key={client.id}
              type="button"
              className="w-full text-left px-4 py-3 transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: `0.5px solid ${t.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={() => handleSelect(client)}
            >
              <div className="flex items-center justify-between gap-2">
                <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{client.name}</p>
                {client.is_blocked && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '1px 4px', marginLeft: '6px' }}>ZABLOKOWANY</span>}
                {(client.total_sessions || 0) > 0 && (
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    <History size={9} color="var(--brand)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.08em' }}>{client.total_sessions} sesji</span>
                  </div>
                )}
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '2px' }}>
                {[client.email, client.phone].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}

          <button
            type="button"
            className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={handleNewClient}
          >
            <UserPlus size={12} color="var(--brand)" />
            <div>
              <p style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em' }}>NOWY KLIENT</p>
              <p style={{ color: t.muted, fontSize: '12px', marginTop: '1px' }}>Dodaj „{query}" jako nowego klienta</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}