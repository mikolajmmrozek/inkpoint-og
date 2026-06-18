import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Calendar, Clock, TrendingUp, User } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

export default function ArtistHome() {
  const { artist, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', value: '#111111', rowHover: 'rgba(0,0,0,0.03)', rowBorder: '#E5E5E5' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', value: '#F5F0EB', rowHover: 'rgba(255,255,255,0.04)', rowBorder: '#262626' };

  useEffect(() => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100)
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [artist?.id]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.session_date >= today && (b.status === 'pending' || b.status === 'confirmed'));
  const thisMonth = bookings.filter(b => b.session_date?.startsWith(new Date().toISOString().slice(0, 7)) && b.status === 'completed');
  const revenue = thisMonth.reduce((sum, b) => sum + ((b.estimated_price || 0) * (artist.artist_cut_percent || 60) / 100), 0);

  const KPI = [
    { label: 'Nadchodzące sesje', value: upcoming.length, icon: Calendar, link: '/artist/schedule' },
    { label: 'Sesje w tym miesiącu', value: thisMonth.length, icon: TrendingUp, link: '/artist/stats' },
    { label: 'Mój zarobek (mies.)', value: `${Math.round(revenue)} zł`, icon: Clock, link: '/artist/stats' },
  ];

  // next 7 days
  const nextBookings = upcoming.slice(0, 5);

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>PANEL ARTYSTY</p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Cześć, {artist.name?.split(' ')[0]}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {KPI.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={kpi.link} className="block p-6 h-full" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
                <Icon size={16} color="#FF007F" className="mb-4" />
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.2rem', fontWeight: 400, color: t.value, lineHeight: 1, letterSpacing: '0.04em' }}>
                  {loading ? '—' : kpi.value}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>{kpi.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>NADCHODZĄCE SESJE</p>
          <Link to="/artist/schedule" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>WSZYSTKIE →</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: '#FF007F' }} />
          </div>
        ) : nextBookings.length === 0 ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK NADCHODZĄCYCH SESJI</p>
          </div>
        ) : (
          <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            {nextBookings.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between p-4" style={{ borderBottom: i < nextBookings.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                <div>
                  <p style={{ color: t.value, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                    {b.session_date}{b.session_time ? ` · ${b.session_time}` : ''}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
                  </p>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[b.status]}`, color: STATUS_COLORS[b.status] }}>
                  {b.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}