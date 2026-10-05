import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { AnimatePresence } from 'framer-motion';
import { parseISO, isAfter, isToday } from 'date-fns';
import SessionCard from '@/components/client/SessionCard';
import ChangeRequestModal from '@/components/client/ChangeRequestModal';
import MessageModal from '@/components/client/MessageModal';
import SessionDetailModal from '@/components/client/SessionDetailModal';
import { getPriceLabel } from '@/lib/priceLabel';

export default function ClientSessions() {
  const { client, user, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [changeRequestBooking, setChangeRequestBooking] = useState(null);
  const [messageBooking, setMessageBooking] = useState(null);
  const [previewBooking, setPreviewBooking] = useState(null);
  const [services, setServices] = useState([]);
  const priceFor = (b) => getPriceLabel(b, services.find(s => s.id === b.service_id));

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)' };

  const load = async () => {
    const res = await base44.entities.Booking.filter({ client_email: user.email }, '-session_date', 200);
    setBookings(res);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.email) load().catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    base44.entities.Service.list().then(setServices).catch(() => {});
  }, []);

  // Realtime — sesje i statusy odświeżają się na żywo (np. zmiana statusu przez admina/artystę)
  useRealtimeSync('Booking', () => { if (user?.email) load().catch(() => {}); }, [user?.email]);

  const today = new Date();
  const upcoming = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const d = b.session_date ? parseISO(b.session_date) : null;
    return d && (isAfter(d, today) || isToday(d));
  }).sort((a, b) => {
    const dc = (a.session_date || '').localeCompare(b.session_date || '');
    if (dc !== 0) return dc;
    return (a.session_time || '').localeCompare(b.session_time || '');
  });

  const past = bookings.filter(b => {
    const d = b.session_date ? parseISO(b.session_date) : null;
    return !d || (!isAfter(d, today) && !isToday(d));
  }).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));

  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
            TWOJE SESJE
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
            Rezerwacje
          </h1>
        </div>
        <Link to="/booking" className="btn-oxblood" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', whiteSpace: 'nowrap' }}>
          <Plus size={13} /> UMÓW SESJĘ
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'upcoming', label: `Nadchodzące (${upcoming.length})` },
          { key: 'past', label: `Historia (${past.length})` },
        ].map(tbtn => (
          <button
            key={tbtn.key}
            onClick={() => setTab(tbtn.key)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '8px 16px', border: `0.5px solid ${tab === tbtn.key ? t.fuchsia : t.border}`,
              color: tab === tbtn.key ? t.fuchsia : t.muted,
              background: tab === tbtn.key ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {tbtn.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} /></div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
            BRAK SESJI
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(b => (
            <SessionCard
              key={b.id}
              booking={b}
              theme={theme}
              priceLabel={priceFor(b)}
              onPreview={setPreviewBooking}
              onChangeRequest={setChangeRequestBooking}
              onMessage={setMessageBooking}
              showActions={tab === 'upcoming'}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {changeRequestBooking && (
          <ChangeRequestModal
            booking={changeRequestBooking}
            theme={theme}
            onClose={() => setChangeRequestBooking(null)}
            onSaved={() => { setChangeRequestBooking(null); load(); }}
          />
        )}
      </AnimatePresence>

      {messageBooking && (
        <MessageModal
          booking={messageBooking}
          client={client}
          user={user}
          theme={theme}
          onClose={() => setMessageBooking(null)}
          onSent={() => setMessageBooking(null)}
        />
      )}

      {previewBooking && (
        <SessionDetailModal
          booking={previewBooking}
          theme={theme}
          priceLabel={priceFor(previewBooking)}
          onClose={() => setPreviewBooking(null)}
          onUpdated={(updated) => { setPreviewBooking(updated); load(); }}
        />
      )}
    </div>
  );
}