import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search } from 'lucide-react';

export default function ClientEmailPicker({ value, onChange, t }) {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { base44.entities.Client.list('-created_date', 2000).then(setClients).catch(() => {}); }, []);
  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = !query.trim() ? [] : clients.filter(c => {
    const tokens = query.toLowerCase().trim().split(/\s+/);
    const hay = `${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();
    return tokens.every(tok => hay.includes(tok));
  }).slice(0, 8);

  const pick = (c) => { onChange(c.email || ''); setOpen(false); };

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
          type="email"
          style={{ ...inputStyle, paddingLeft: '20px' }}
          placeholder="Szukaj klienta lub wpisz e-mail..."
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={e => { setOpen(true); e.target.style.borderBottomColor = 'var(--brand)'; }}
          onBlur={e => e.target.style.borderBottomColor = t.border}
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 z-50 overflow-hidden" style={{ top: '100%', background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#111111', border: `0.5px solid ${t.border}`, maxHeight: '280px', overflowY: 'auto' }}>
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-4 py-3 transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: `0.5px solid ${t.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onMouseDown={() => pick(c)}
            >
              <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{c.name}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '2px' }}>
                {[c.email, c.phone].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em' }}>
              Brak klienta w bazie — wpisz e-mail ręcznie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}