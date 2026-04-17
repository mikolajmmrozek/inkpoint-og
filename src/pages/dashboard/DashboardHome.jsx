import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, MessageSquare, FileText, TrendingUp, Clock } from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState({ bookings: 0, pending: 0, messages: 0, forms: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Booking.list('-created_date', 50),
      base44.entities.ContactMessage.filter({ is_read: false }),
      base44.entities.HealthForm.list('-created_date', 10),
    ]).then(([bookings, messages, forms]) => {
      setStats({
        bookings: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        messages: messages.length,
        forms: forms.length,
      });
      setRecentBookings(bookings.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const STATUS_COLORS = {
    pending: '#8B1A1A',
    confirmed: '#4A7C59',
    completed: '#4A6FA5',
    cancelled: '#5A5A5A',
  };

  const KPI = [
    { label: 'Wszystkie rezerwacje', value: stats.bookings, icon: Calendar, link: '/dashboard/bookings' },
    { label: 'Oczekujące', value: stats.pending, icon: Clock, link: '/dashboard/bookings' },
    { label: 'Nowe wiadomości', value: stats.messages, icon: MessageSquare, link: '/dashboard/messages' },
    { label: 'Ankiety zdrowotne', value: stats.forms, icon: FileText, link: '/dashboard/health-forms' },
  ];

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          PANEL GŁÓWNY
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: '3rem', fontWeight: 700, color: '#F5F0EB', lineHeight: 1 }}>
          Przegląd
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {KPI.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link to={kpi.link} className="block p-6 transition-all duration-300 hover:border-oxblood" style={{ border: '0.5px solid #262626', background: 'rgba(38,38,38,0.2)' }}>
                <div className="flex items-start justify-between mb-4">
                  <Icon size={16} color="#8B1A1A" />
                  <TrendingUp size={12} color="rgba(245,240,235,0.15)" />
                </div>
                <p style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 700, color: '#F5F0EB', lineHeight: 1 }}>
                  {loading ? '—' : kpi.value}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>
                  {kpi.label}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            OSTATNIE REZERWACJE
          </p>
          <Link to="/dashboard/bookings" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#8B1A1A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            WSZYSTKIE →
          </Link>
        </div>

        <div style={{ border: '0.5px solid #262626' }}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-px mx-auto animate-pulse" style={{ background: '#8B1A1A' }} />
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="p-8 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.2)', letterSpacing: '0.1em' }}>
                BRAK REZERWACJI
              </p>
            </div>
          ) : (
            recentBookings.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < recentBookings.length - 1 ? '0.5px solid #262626' : 'none' }}>
                <div className="flex items-center gap-6">
                  <div>
                    <p style={{ color: '#F5F0EB', fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.35)', letterSpacing: '0.08em', marginTop: '2px' }}>
                      {b.artist_name} · {b.session_date}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  border: `0.5px solid ${STATUS_COLORS[b.status] || '#262626'}`,
                  color: STATUS_COLORS[b.status] || 'rgba(245,240,235,0.4)',
                }}>
                  {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}