import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Search, History } from 'lucide-react';

export default function ClientSearch({ value, onSelect, t }) {
  const [query, setQuery] = useState(value?.name || '');
  const [clients, setClients] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Lazy load — only when user starts typing
  const ensureLoaded = () => {
    if (loaded) return;
    setLoaded(true);
    base44.entities.Client.list('-created_date', 150).then(setClients).catch(() => {});
  };

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); return; }
    const q = query.toLowerCase();
    setFiltered(clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ).slice(0, 8));
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
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={12} color={t.muted} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          style={{ ...inputStyle, paddingLeft: '20px' }}
          placeholder="Szukaj klienta po imieniu, emailu, telefonie..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); ensureLoaded(); }}
          onFocus={e => { setOpen(true); e.target.style.borderBottomColor = '#FF007F'; ensureLoaded(); }}
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
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,127,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={() => handleSelect(client)}
            >
              <div className="flex items-center justify-between gap-2">
                <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{client.name}</p>
                {(client.total_sessions || 0) > 0 && (
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    <History size={9} color="#FF007F" />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.08em' }}>{client.total_sessions} sesji</span>
                  </div>
                )}
              </div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '2px' }}>
                {[client.email, client.phone].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}

          <button
            type="button"
            className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,127,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={handleNewClient}
          >
            <UserPlus size={12} color="#FF007F" />
            <div>
              <p style={{ color: '#FF007F', fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em' }}>NOWY KLIENT</p>
              <p style={{ color: t.muted, fontSize: '12px', marginTop: '1px' }}>Dodaj „{query}" jako nowego klienta</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}