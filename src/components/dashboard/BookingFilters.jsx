import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';

const chipStyle = (active, t) => ({
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '6px 10px',
  border: `0.5px solid ${active ? t.fuchsia : t.border}`,
  color: active ? t.fuchsia : t.muted,
  background: active ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
  cursor: 'pointer',
});

export default function BookingFilters({ artists, artistFilters, toggleArtist, setArtistFilters, statusFilters, toggleStatus, setStatusFilters, statusOptions, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeCount = artistFilters.length + statusFilters.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '8px 14px',
          border: `0.5px solid ${activeCount > 0 ? t.fuchsia : t.border}`,
          color: activeCount > 0 ? t.fuchsia : t.muted,
          background: activeCount > 0 ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
          cursor: 'pointer',
        }}
      >
        <SlidersHorizontal size={12} /> Filtry
        {activeCount > 0 && (
          <span style={{ minWidth: '16px', height: '16px', background: t.fuchsia, color: '#F5F0EB', borderRadius: '8px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontFamily: 'var(--font-mono)' }}>
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 50,
            minWidth: '300px',
            maxWidth: '90vw',
            background: t.bg,
            border: `0.5px solid ${t.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            padding: '16px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Filtry</p>
            {activeCount > 0 && (
              <button
                onClick={() => { setArtistFilters([]); setStatusFilters([]); }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕ Wyczyść
              </button>
            )}
          </div>

          {/* Artists */}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Artyści</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            <button onClick={() => setArtistFilters([])} style={chipStyle(artistFilters.length === 0, t)}>Wszyscy</button>
            {artists.map(a => (
              <button key={a.id} onClick={() => toggleArtist(a.id)} style={chipStyle(artistFilters.includes(a.id), t)}>{a.name}</button>
            ))}
          </div>

          {/* Statuses */}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Status</p>
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map(s => (
              <button key={s} onClick={() => toggleStatus(s)} style={chipStyle(statusFilters.includes(s), t)}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}