import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const MONTHS_FULL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

export default function ArtistStats() {
  const { artist, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'daily'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', text: '#111111', rowBorder: '#E5E5E5' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', text: '#F5F0EB', rowBorder: '#262626' };

  useEffect(() => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 200)
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

  const dailyData = useMemo(() => {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const yearBookings = bookings.filter(b => b.session_date && b.session_date >= yearStart && b.session_date <= yearEnd && b.status === 'completed');
    const grouped = {};
    yearBookings.forEach(b => {
      if (!grouped[b.session_date]) grouped[b.session_date] = [];
      grouped[b.session_date].push(b);
    });
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, items]) => {
        const revenue = items.reduce((sum, b) => sum + (b.estimated_price || 0), 0);
        const myEarning = Math.round(revenue * cut / 100);
        return { date, sessions: items.length, revenue, myEarning };
      });
  }, [bookings, year, cut]);

  const totalSessions = monthlyData.reduce((s, m) => s + m.sessions, 0);
  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalEarning = monthlyData.reduce((s, m) => s + m.myEarning, 0);

  // Selected month summary
  const monthBookings = useMemo(() => {
    const prefix = `${year}-${String(selectedMonth + 1).padStart(2, '0')}`;
    return bookings.filter(b => b.session_date?.startsWith(prefix) && b.status !== 'cancelled');
  }, [bookings, year, selectedMonth]);
  const monthCompleted = monthBookings.filter(b => b.status === 'completed');
  const monthRemaining = monthBookings.filter(b => b.status !== 'completed');
  const monthSessions = monthBookings.length;
  const monthDone = monthCompleted.length;
  const monthLeft = monthRemaining.length;
  const monthEarned = monthCompleted.reduce((s, b) => s + Math.round((b.estimated_price || 0) * cut / 100), 0);
  const monthToEarn = monthRemaining.reduce((s, b) => s + Math.round((b.estimated_price || 0) * cut / 100), 0);

  return (
    <div>
      {/* Year selector */}
      <div className="flex items-center gap-2 mb-8">
        {[year - 1, year, year + 1 > new Date().getFullYear() ? null : year + 1].filter(Boolean).map(y => (
          <button key={y} onClick={() => setYear(y)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', padding: '6px 16px', border: `0.5px solid ${y === year ? 'var(--brand)' : t.cardBorder}`, color: y === year ? 'var(--brand)' : t.muted, background: y === year ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer' }}>
            {y}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Sesji', value: totalSessions },
          { label: 'Łączna kwota', value: `${totalRevenue} zł` },
          { label: `Mój zarobek (${cut}%)`, value: `${totalEarning} zł` },
        ].map(kpi => (
          <div key={kpi.label} className="p-5" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: t.text, lineHeight: 1, letterSpacing: '0.04em' }}>{loading ? '—' : kpi.value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-4 mb-8" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>MÓJ ZAROBEK — MIESIĘCZNIE</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="label" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: t.cardBg, border: `0.5px solid ${t.cardBorder}`, fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, borderRadius: 'var(--radius)' }}
              itemStyle={{ color: t.text }}
              labelStyle={{ color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              formatter={(value) => [`${value} zł`, 'Zarobek']}
            />
            <Bar dataKey="myEarning" fill="var(--brand)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month summary tiles */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Podsumowanie miesiąca:</p>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{ background: t.cardBg, border: `0.5px solid ${t.cardBorder}`, color: t.text, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', padding: '6px 12px', cursor: 'pointer', outline: 'none', colorScheme: theme === 'light' ? 'light' : 'dark' }}
          >
            {MONTHS_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: t.text, lineHeight: 1, letterSpacing: '0.04em' }}>{monthSessions}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>Sesje w miesiącu</p>
          </div>
          <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#16a34a', lineHeight: 1, letterSpacing: '0.04em' }}>{monthDone}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>Zrobione</p>
          </div>
          <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f59e0b', lineHeight: 1, letterSpacing: '0.04em' }}>{monthLeft}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>Do zrobienia</p>
          </div>
          <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#16a34a', lineHeight: 1, letterSpacing: '0.04em' }}>{monthEarned} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>zł</span></p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>Zarobione</p>
          </div>
          <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--brand)', lineHeight: 1, letterSpacing: '0.04em' }}>{monthToEarn} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>zł</span></p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>Do zarobienia</p>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        {[['monthly', 'MIESIĘCZNY'], ['daily', 'DZIENNY']].map(([mode, label]) => (
          <button key={mode} onClick={() => setViewMode(mode)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 14px', border: `0.5px solid ${viewMode === mode ? 'var(--brand)' : t.cardBorder}`, color: viewMode === mode ? 'var(--brand)' : t.muted, background: viewMode === mode ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Monthly table */}
      {viewMode === 'monthly' && (
        <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <div className="grid grid-cols-4 gap-4 p-3" style={{ borderBottom: `0.5px solid ${t.rowBorder}` }}>
            {['Miesiąc', 'Sesje', 'Łączna kwota', 'Mój zarobek'].map(h => (
              <p key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {monthlyData.map((row, i) => (
            <div key={row.label} className="grid grid-cols-4 gap-4 p-3" style={{ borderBottom: i < monthlyData.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', opacity: row.sessions === 0 ? 0.4 : 1 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: t.text, letterSpacing: '0.06em' }}>{row.label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text }}>{row.sessions}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{row.revenue} zł</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: row.myEarning > 0 ? 'var(--brand)' : t.muted }}>{row.myEarning} zł</p>
            </div>
          ))}
        </div>
      )}

      {/* Daily table */}
      {viewMode === 'daily' && (
        <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <div className="grid grid-cols-4 gap-4 p-3" style={{ borderBottom: `0.5px solid ${t.rowBorder}` }}>
            {['Data', 'Sesje', 'Łączna kwota', 'Mój zarobek'].map(h => (
              <p key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {dailyData.length === 0 ? (
            <div className="p-6 text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK DANYCH</p>
            </div>
          ) : (
            dailyData.map((row, i) => (
              <div key={row.date} className="grid grid-cols-4 gap-4 p-3" style={{ borderBottom: i < dailyData.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', opacity: row.sessions === 0 ? 0.4 : 1 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: t.text, letterSpacing: '0.06em' }}>{row.date}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text }}>{row.sessions}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{row.revenue} zł</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: row.myEarning > 0 ? 'var(--brand)' : t.muted }}>{row.myEarning} zł</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}