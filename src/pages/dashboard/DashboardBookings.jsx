import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Mail } from 'lucide-react';
import { useTheme } from './Dashboard';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function DashboardBookings() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', pageBg: '#F8F8F8', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', hover: 'rgba(0,0,0,0.03)' }
    : { bg: 'rgba(10,10,10,0.8)', pageBg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', hover: 'rgba(255,255,255,0.05)' };
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const data = await base44.entities.Booking.list('-session_date', 100);
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Booking.update(id, { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  };

  const deleteBooking = async (id) => {
    await base44.entities.Booking.delete(id);
    setBookings(b => b.filter(x => x.id !== id));
    setSelected(null);
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="flex-1 min-w-0">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
              ZARZĄDZANIE
            </p>
            <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
              Rezerwacje
            </h2>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '6px 12px',
                  border: `0.5px solid ${filter === s ? t.fuchsia : t.border}`,
                  color: filter === s ? t.fuchsia : t.muted,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {s === 'all' ? 'Wszystkie' : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.2)', letterSpacing: '0.1em' }}>
              BRAK REZERWACJI
            </p>
          </div>
        ) : (
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            {filtered.map((b, i) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 cursor-pointer transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === b.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
                onClick={() => setSelected(b)}
              >
                <div className="flex items-center gap-8 min-w-0">
                  <div className="min-w-0">
                    <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                      {b.artist_name} · {b.session_date} {b.session_time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {!b.health_form_completed && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#8B1A1A', letterSpacing: '0.1em', border: '0.5px solid #8B1A1A', padding: '2px 6px' }}>
                      BRAK ANKIETY
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status] || '#262626'}`, color: STATUS_COLORS[b.status] || 'rgba(245,240,235,0.4)',
                  }}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3 }}
            className="w-80 flex-shrink-0"
            style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', position: 'sticky', top: '80px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                {selected.client_name}
              </h3>
              <button onClick={() => setSelected(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {[
              ['Email', selected.client_email],
              ['Telefon', selected.client_phone || '—'],
              ['Artysta', selected.artist_name],
              ['Data', `${selected.session_date} ${selected.session_time}`],
              ['Miejsce', selected.tattoo_placement],
              ['Opis', selected.tattoo_description],
              ['Notatki', selected.notes || '—'],
              ['Ankieta', selected.health_form_completed ? '✓ Wypełniona' : '✗ Brak'],
            ].map(([label, value]) => (
              <div key={label} className="mb-4 pb-4" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: t.muted, fontSize: '13px', lineHeight: 1.5 }}>{value}</p>
              </div>
            ))}

            {/* Status change */}
            <div className="mb-6">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                ZMIEŃ STATUS
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    style={{
                      fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '8px', border: `0.5px solid ${selected.status === s ? STATUS_COLORS[s] : t.border}`,
                      color: selected.status === s ? STATUS_COLORS[s] : t.muted,
                      background: 'transparent', cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => deleteBooking(selected.id)}
              className="flex items-center gap-2 w-full justify-center py-3 transition-all hover:opacity-70"
              style={{ border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
            >
              <Trash2 size={12} /> USUŃ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}