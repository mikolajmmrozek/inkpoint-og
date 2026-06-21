import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { parseISO, isAfter, isToday } from 'date-fns';
import SessionCard from '@/components/client/SessionCard';
import ChangeRequestModal from '@/components/client/ChangeRequestModal';
import MessageModal from '@/components/client/MessageModal';

export default function ClientSessions() {
  const { client, user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [changeRequestBooking, setChangeRequestBooking] = useState(null);
  const [messageBooking, setMessageBooking] = useState(null);

  const load = async () => {
    const res = await base44.entities.Booking.filter({ client_email: user.email }, '-session_date', 200);
    setBookings(res);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.email) load().catch(() => setLoading(false));
  }, [user]);

  const today = new Date();
  const upcoming = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const d = b.session_date ? parseISO(b.session_date) : null;
    return d && (isAfter(d, today) || isToday(d));
  }).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));

  const past = bookings.filter(b => {
    const d = b.session_date ? parseISO(b.session_date) : null;
    return !d || (!isAfter(d, today) && !isToday(d));
  }).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));

  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
            TWOJE SESJE
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em' }}>
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
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '8px 16px', border: `0.5px solid ${tab === t.key ? '#FF007F' : '#262626'}`,
              color: tab === t.key ? '#FF007F' : 'rgba(245,240,235,0.4)',
              background: tab === t.key ? 'rgba(255,0,127,0.06)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} /></div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center" style={{ border: '0.5px solid #262626' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em' }}>
            BRAK SESJI
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(b => (
            <SessionCard
              key={b.id}
              booking={b}
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
          onClose={() => setMessageBooking(null)}
          onSent={() => setMessageBooking(null)}
        />
      )}
    </div>
  );
}