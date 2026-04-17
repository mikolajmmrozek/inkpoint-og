import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Mail } from 'lucide-react';

const STATUS_COLORS = {
  pending: '#8B1A1A',
  confirmed: '#4A7C59',
  completed: '#4A6FA5',
  cancelled: '#5A5A5A',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function DashboardBookings() {
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
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
              ZARZĄDZANIE
            </p>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 700, color: '#F5F0EB', lineHeight: 1 }}>
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
                  border: `0.5px solid ${filter === s ? '#8B1A1A' : '#262626'}`,
                  color: filter === s ? '#8B1A1A' : 'rgba(245,240,235,0.35)',
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
            <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.2)', letterSpacing: '0.1em' }}>
              BRAK REZERWACJI
            </p>
          </div>
        ) : (
          <div style={{ border: '0.5px solid #262626' }}>
            {filtered.map((b, i) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '0.5px solid #262626' : 'none', background: selected?.id === b.id ? 'rgba(139,26,26,0.05)' : 'transparent' }}
                onClick={() => setSelected(b)}
              >
                <div className="flex items-center gap-8 min-w-0">
                  <div className="min-w-0">
                    <p style={{ color: '#F5F0EB', fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.35)', letterSpacing: '0.08em', marginTop: '2px' }}>
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
            style={{ border: '0.5px solid #262626', background: 'rgba(10,10,10,0.8)', padding: '24px', position: 'sticky', top: '80px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 600, color: '#F5F0EB' }}>
                {selected.client_name}
              </h3>
              <button onClick={() => setSelected(null)} style={{ color: 'rgba(245,240,235,0.3)' }}>
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
              <div key={label} className="mb-4 pb-4" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#8B1A1A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: 'rgba(245,240,235,0.7)', fontSize: '13px', lineHeight: 1.5 }}>{value}</p>
              </div>
            ))}

            {/* Status change */}
            <div className="mb-6">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#8B1A1A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                ZMIEŃ STATUS
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    style={{
                      fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '8px', border: `0.5px solid ${selected.status === s ? STATUS_COLORS[s] : '#262626'}`,
                      color: selected.status === s ? STATUS_COLORS[s] : 'rgba(245,240,235,0.35)',
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
              style={{ border: '0.5px solid #3a1a1a', color: '#8B1A1A', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent' }}
            >
              <Trash2 size={12} /> USUŃ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}