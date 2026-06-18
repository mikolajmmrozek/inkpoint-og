import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

export default function ArtistStats() {
  const { artist, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', text: '#111111', rowBorder: '#E5E5E5' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', text: '#F5F0EB', rowBorder: '#262626' };

  useEffect(() => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 500)
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [artist?.id]);

  const cut = artist?.artist_cut_percent || 60;

  const monthlyData = useMemo(() => {
    return MONTHS_PL.map((label, idx) => {
      const month = String(idx + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      const completed = bookings.filter(b => b.session_date?.startsWith(prefix) && b.status === 'completed');
      const revenue = completed.reduce((sum, b) => sum + (b.estimated_price || 0), 0);
      const myEarning = Math.round(revenue * cut / 100);
      return { label, sessions: completed.length, revenue, myEarning };
    });
  }, [bookings, year, cut]);

  const totalSessions = monthlyData.reduce((s, m) => s + m.sessions, 0);
  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalEarning = monthlyData.reduce((s, m) => s + m.myEarning, 0);

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>MOJE WYNIKI</p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Statystyki</h1>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-2 mb-8">
        {[year - 1, year, year + 1 > new Date().getFullYear() ? null : year + 1].filter(Boolean).map(y => (
          <button key={y} onClick={() => setYear(y)}
            style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', padding: '6px 16px', border: `0.5px solid ${y === year ? '#FF007F' : t.cardBorder}`, color: y === year ? '#FF007F' : t.muted, background: y === year ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer' }}>
            {y}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Sesji', value: totalSessions },
          { label: 'Przychód studia', value: `${totalRevenue} zł` },
          { label: `Mój zarobek (${cut}%)`, value: `${totalEarning} zł` },
        ].map(kpi => (
          <div key={kpi.label} className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', color: t.text, lineHeight: 1, letterSpacing: '0.04em' }}>{loading ? '—' : kpi.value}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-4 mb-8" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>MÓJ ZAROBEK — MIESIĘCZNIE</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="label" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0A0A0A', border: '0.5px solid #262626', fontFamily: 'JetBrains Mono', fontSize: '10px' }}
              formatter={(value) => [`${value} zł`, 'Zarobek']}
            />
            <Bar dataKey="myEarning" fill="#FF007F" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly table */}
      <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
        <div className="grid grid-cols-4 gap-4 p-3" style={{ borderBottom: `0.5px solid ${t.rowBorder}` }}>
          {['Miesiąc', 'Sesje', 'Przychód studia', 'Mój zarobek'].map(h => (
            <p key={h} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
          ))}
        </div>
        {monthlyData.map((row, i) => (
          <div key={row.label} className="grid grid-cols-4 gap-4 p-3" style={{ borderBottom: i < monthlyData.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', opacity: row.sessions === 0 ? 0.4 : 1 }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text, letterSpacing: '0.06em' }}>{row.label}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text }}>{row.sessions}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted }}>{row.revenue} zł</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: row.myEarning > 0 ? '#FF007F' : t.muted }}>{row.myEarning} zł</p>
          </div>
        ))}
      </div>
    </div>
  );
}