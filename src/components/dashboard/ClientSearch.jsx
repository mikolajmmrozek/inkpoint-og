import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Search, X, History, CalendarPlus } from 'lucide-react';

export default function ClientSearch({ value, onSelect, t }) {
  const [query, setQuery] = useState(value?.name || '');
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const [repeatPrompt, setRepeatPrompt] = useState(null); // { client, lastSession }
  const [loadingSession, setLoadingSession] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.Client.list('-created_date', 200).then(setClients).catch(() => {});
  }, []);

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
    setOpen(false);
    setQuery(client.name);

    // If client has sessions, fetch the last one and show repeat prompt
    if ((client.total_sessions || 0) > 0 && client.email) {
      setLoadingSession(true);
      try {
        const sessions = await base44.entities.Booking.filter({ client_email: client.email }, '-session_date', 5);
        const completed = sessions.filter(s => s.status === 'completed' || s.status === 'confirmed');
        const lastSession = completed[0] || sessions[0];
        if (lastSession) {
          setRepeatPrompt({ client, lastSession });
          setLoadingSession(false);
          return;
        }
      } catch {}
      setLoadingSession(false);
    }

    onSelect(client);
  };

  const handleNewClient = () => {
    onSelect({ name: query, email: '', phone: '', _isNew: true });
    setOpen(false);
  };

  const handleRepeatYes = () => {
    const { client, lastSession } = repeatPrompt;
    setRepeatPrompt(null);
    onSelect({
      ...client,
      _repeatSession: lastSession,
    });
  };

  const handleRepeatNo = () => {
    const { client } = repeatPrompt;
    setRepeatPrompt(null);
    onSelect(client);
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
    <>
      <div ref={ref} className="relative">
        <div className="relative">
          <Search size={12} color={t.muted} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            style={{ ...inputStyle, paddingLeft: '20px' }}
            placeholder="Szukaj klienta po imieniu, emailu, telefonie..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={e => { setOpen(true); e.target.style.borderBottomColor = '#FF007F'; }}
            onBlur={e => e.target.style.borderBottomColor = t.border}
          />
          {loadingSession && (
            <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid #FF007F', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
          )}
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

      {/* Repeat session prompt */}
      {repeatPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A', padding: '36px', maxWidth: '460px', width: '100%' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <History size={14} color="#FF007F" />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>POWRACAJĄCY KLIENT</p>
              </div>
              <button onClick={handleRepeatNo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
                <X size={14} />
              </button>
            </div>

            <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.bg === '#FFFFFF' ? '#111' : '#F5F0EB', letterSpacing: '0.04em', marginBottom: '20px' }}>
              {repeatPrompt.client.name}
            </h3>

            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              OSTATNIA SESJA
            </p>
            <div style={{ border: `0.5px solid ${t.border}`, padding: '14px 16px', marginBottom: '20px' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.bg === '#FFFFFF' ? '#111' : '#F5F0EB', marginBottom: '4px' }}>
                {repeatPrompt.lastSession.session_date}{repeatPrompt.lastSession.artist_name ? ` · ${repeatPrompt.lastSession.artist_name}` : ''}
              </p>
              {repeatPrompt.lastSession.tattoo_placement && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted }}>
                  {repeatPrompt.lastSession.tattoo_placement}{repeatPrompt.lastSession.tattoo_description ? ` — ${repeatPrompt.lastSession.tattoo_description}` : ''}
                </p>
              )}
              {repeatPrompt.lastSession.estimated_price > 0 && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', marginTop: '4px' }}>
                  {repeatPrompt.lastSession.estimated_price} PLN
                </p>
              )}
            </div>

            <p style={{ fontSize: '13px', color: t.muted, marginBottom: '20px', lineHeight: 1.6 }}>
              Czy chcesz umówić ponownie z danymi z ostatniej sesji (artysta, opis, cena)?
            </p>

            <div className="flex gap-3">
              <button className="btn-oxblood flex-1" onClick={handleRepeatYes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CalendarPlus size={13} /> TAK, POWTÓRZ SESJĘ
              </button>
              <button className="btn-ghost-parchment" onClick={handleRepeatNo} style={{ flex: 1 }}>
                NIE, NOWA SESJA
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}