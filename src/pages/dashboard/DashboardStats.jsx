import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const MONTHS_FULL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

export default function DashboardStats() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', card: '#F8F8F8' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', card: 'rgba(38,38,38,0.2)' };

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtistId, setSelectedArtistId] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [breakdownView, setBreakdownView] = useState('monthly'); // 'monthly' | 'daily'

  useEffect(() => {
    base44.entities.Artist.list().then(a => {
      setArtists(a.filter(x => x.is_visible !== false));
    });
    setTimeout(() => {
      base44.entities.Booking.list('-session_date', 300)
        .then(setBookings)
        .finally(() => setLoading(false));
    }, 400);
  }, []);

  // Build artist map: id -> artist (with cut)
  const artistMap = useMemo(() => {
    const m = {};
    artists.forEach(a => { m[a.id] = a; });
    return m;
  }, [artists]);

  // Completed bookings with price (only completed status)
  const paid = useMemo(() =>
    bookings.filter(b => b.estimated_price && b.status === 'completed'),
    [bookings]
  );

  // Filter by year
  const paidYear = useMemo(() =>
    paid.filter(b => b.session_date && new Date(b.session_date).getFullYear() === selectedYear),
    [paid, selectedYear]
  );

  // Filter by artist
  const filtered = useMemo(() => {
    if (selectedArtistId === 'all') return paidYear;
    return paidYear.filter(b => b.artist_id === selectedArtistId);
  }, [paidYear, selectedArtistId]);

  // Per-artist stats
  const artistStats = useMemo(() => {
    return artists.map(a => {
      const ab = paidYear.filter(b => b.artist_id === a.id);
      const totalRevenue = ab.reduce((s, b) => s + Number(b.estimated_price || 0), 0);
      const cut = a.artist_cut_percent != null ? a.artist_cut_percent : 60;
      const artistEarnings = Math.round(totalRevenue * cut / 100);
      const studioEarnings = totalRevenue - artistEarnings;
      const sessions = ab.length;
      const clients = new Set(ab.map(b => b.client_email || b.client_name)).size;
      return { artist: a, totalRevenue, artistEarnings, studioEarnings, sessions, clients, cut };
    }).filter(s => s.sessions > 0 || selectedArtistId === 'all');
  }, [artists, paidYear, selectedArtistId]);

  // Global totals
  const totals = useMemo(() => {
    const source = selectedArtistId === 'all' ? artistStats : artistStats.filter(s => s.artist.id === selectedArtistId);
    return source.reduce((acc, s) => ({
      revenue: acc.revenue + s.totalRevenue,
      artistEarnings: acc.artistEarnings + s.artistEarnings,
      studioEarnings: acc.studioEarnings + s.studioEarnings,
      sessions: acc.sessions + s.sessions,
    }), { revenue: 0, artistEarnings: 0, studioEarnings: 0, sessions: 0 });
  }, [artistStats, selectedArtistId]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    return MONTHS_PL.map((name, mi) => {
      const mb = filtered.filter(b => b.session_date && new Date(b.session_date).getMonth() === mi);
      const revenue = mb.reduce((s, b) => s + Number(b.estimated_price || 0), 0);
      return { name, revenue, sessions: mb.length };
    });
  }, [filtered]);

  // Monthly breakdown table (per artist per month)
  const monthlyBreakdown = useMemo(() => {
    return MONTHS_PL.map((name, mi) => {
      const mb = filtered.filter(b => b.session_date && new Date(b.session_date).getMonth() === mi);
      const revenue = mb.reduce((s, b) => s + Number(b.estimated_price || 0), 0);
      // artist cut weighted
      const artistEarnings = mb.reduce((s, b) => {
        const a = artistMap[b.artist_id];
        const cut = a?.artist_cut_percent ?? 60;
        return s + Math.round(Number(b.estimated_price || 0) * cut / 100);
      }, 0);
      const studioEarnings = revenue - artistEarnings;
      return { name, fullName: MONTHS_FULL[mi], revenue, artistEarnings, studioEarnings, sessions: mb.length, mi };
    });
  }, [filtered, artistMap]);

  // Daily breakdown for selected month
  const dailyBreakdown = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, di) => {
      const day = di + 1;
      const db = filtered.filter(b => {
        if (!b.session_date) return false;
        const d = new Date(b.session_date);
        return d.getMonth() === selectedMonth && d.getDate() === day;
      });
      const revenue = db.reduce((s, b) => s + Number(b.estimated_price || 0), 0);
      const artistEarnings = db.reduce((s, b) => {
        const a = artistMap[b.artist_id];
        const cut = a?.artist_cut_percent ?? 60;
        return s + Math.round(Number(b.estimated_price || 0) * cut / 100);
      }, 0);
      const studioEarnings = revenue - artistEarnings;
      return { day, revenue, artistEarnings, studioEarnings, sessions: db.length, bookings: db };
    }).filter(d => d.sessions > 0);
  }, [filtered, selectedYear, selectedMonth, artistMap]);

  const years = useMemo(() => {
    const ys = new Set(paid.map(b => b.session_date ? new Date(b.session_date).getFullYear() : null).filter(Boolean));
    ys.add(new Date().getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [paid]);

  const mono = { fontFamily: 'JetBrains Mono' };
  const display = { fontFamily: 'Bebas Neue, system-ui', fontWeight: 400 };

  const KPICard = ({ label, value, sub }) => (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
      <p style={{ ...display, fontSize: '2.2rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{value}</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
          {/* Year */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ background: t.bg, border: `0.5px solid ${t.border}`, color: t.text, ...mono, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 12px', cursor: 'pointer', outline: 'none', colorScheme: theme === 'light' ? 'light' : 'dark' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Artist filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedArtistId('all')}
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', border: `0.5px solid ${selectedArtistId === 'all' ? t.fuchsia : t.border}`, color: selectedArtistId === 'all' ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}
            >
              Wszyscy
            </button>
            {artists.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedArtistId(a.id)}
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', border: `0.5px solid ${selectedArtistId === a.id ? t.fuchsia : t.border}`, color: selectedArtistId === a.id ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <KPICard label="Łączny przychód" value={`${totals.revenue.toLocaleString('pl-PL')} PLN`} />
            <KPICard label="Zarobki artystów" value={`${totals.artistEarnings.toLocaleString('pl-PL')} PLN`} sub={totals.revenue ? `${Math.round(totals.artistEarnings / totals.revenue * 100)}% całości` : ''} />
            <KPICard label="Zarobki studia" value={`${totals.studioEarnings.toLocaleString('pl-PL')} PLN`} sub={totals.revenue ? `${Math.round(totals.studioEarnings / totals.revenue * 100)}% całości` : ''} />
            <KPICard label="Sesji" value={totals.sessions} />
          </div>

          {/* Monthly chart */}
          <div className="mb-8 p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>
              PRZYCHÓD MIESIĘCZNY {selectedYear} {selectedArtistId !== 'all' ? `— ${artistMap[selectedArtistId]?.name}` : '— WSZYSCY ARTYŚCI'}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `${v} PLN`} />
                <Tooltip
                  contentStyle={{ background: theme === 'light' ? '#fff' : '#111', border: `0.5px solid ${t.border}`, fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text }}
                  formatter={(v) => [`${v} PLN`, 'Przychód']}
                  cursor={{ fill: 'rgba(255,0,127,0.05)' }}
                />
                <Bar dataKey="revenue" radius={0}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={_.revenue > 0 ? '#FF007F' : (theme === 'light' ? '#E5E5E5' : '#262626')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly / Daily breakdown */}
          <div className="mb-8">
            {/* Tab toggle */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex gap-1">
                {[{ key: 'monthly', label: 'Miesięczny' }, { key: 'daily', label: 'Dzienny' }].map(tab => (
                  <button key={tab.key} onClick={() => setBreakdownView(tab.key)}
                    style={{ ...mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', border: `0.5px solid ${breakdownView === tab.key ? t.fuchsia : t.border}`, color: breakdownView === tab.key ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {breakdownView === 'daily' && (
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  style={{ background: t.bg, border: `0.5px solid ${t.border}`, color: t.text, ...mono, fontSize: '10px', letterSpacing: '0.06em', padding: '7px 12px', cursor: 'pointer', outline: 'none', colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                  {MONTHS_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              )}
            </div>

            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
              {/* Table header */}
              <div className="grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p className="col-span-3" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{breakdownView === 'monthly' ? 'Miesiąc' : 'Dzień'}</p>
                <p className="col-span-1" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sesje</p>
                <p className="col-span-3" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Łączny przychód</p>
                <p className="col-span-3" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zarobek artysty</p>
                <p className="col-span-2" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Zarobek studia</p>
              </div>

              {breakdownView === 'monthly' ? (
                monthlyBreakdown.filter(r => r.sessions > 0).length === 0 ? (
                  <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>BRAK DANYCH</p></div>
                ) : monthlyBreakdown.map((row, i) => row.sessions === 0 ? null : (
                  <div key={row.mi} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                    <p className="col-span-3" style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{row.fullName}</p>
                    <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.sessions}</p>
                    <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: t.text }}>{row.revenue.toLocaleString('pl-PL')} PLN</p>
                    <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{row.artistEarnings.toLocaleString('pl-PL')} PLN</p>
                    <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{row.studioEarnings.toLocaleString('pl-PL')} PLN</p>
                  </div>
                ))
              ) : (
                dailyBreakdown.length === 0 ? (
                  <div className="py-10 text-center"><p style={{ ...mono, fontSize: '10px', color: t.muted }}>BRAK SESJI W TYM MIESIĄCU</p></div>
                ) : dailyBreakdown.map(row => (
                  <div key={row.day} style={{ borderBottom: `0.5px solid ${t.border}` }}>
                    <div className="grid grid-cols-12 px-4 py-3 items-center">
                      <p className="col-span-3" style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>
                        {row.day} {MONTHS_FULL[selectedMonth]} {selectedYear}
                      </p>
                      <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.muted }}>{row.sessions}</p>
                      <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: t.text }}>{row.revenue.toLocaleString('pl-PL')} PLN</p>
                      <p className="col-span-3" style={{ ...mono, fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{row.artistEarnings.toLocaleString('pl-PL')} PLN</p>
                      <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{row.studioEarnings.toLocaleString('pl-PL')} PLN</p>
                    </div>
                    {/* Sub-rows: individual bookings */}
                    {row.bookings.map(b => (
                      <div key={b.id} className="grid grid-cols-12 px-4 py-1.5 items-center" style={{ background: 'rgba(255,0,127,0.02)', borderTop: `0.5px solid ${t.border}` }}>
                        <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: t.muted, paddingLeft: '16px' }}>↳ {b.client_name}</p>
                        <p className="col-span-1" />
                        <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: t.muted }}>{Number(b.estimated_price || 0).toLocaleString('pl-PL')} PLN · {b.artist_name}</p>
                        <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: 'rgba(22,163,74,0.7)' }}>
                          {Math.round(Number(b.estimated_price || 0) * ((artistMap[b.artist_id]?.artist_cut_percent ?? 60) / 100)).toLocaleString('pl-PL')} PLN
                        </p>
                        <p className="col-span-2" style={{ ...mono, fontSize: '9px', color: 'rgba(255,0,127,0.6)' }}>
                          {(Number(b.estimated_price || 0) - Math.round(Number(b.estimated_price || 0) * ((artistMap[b.artist_id]?.artist_cut_percent ?? 60) / 100))).toLocaleString('pl-PL')} PLN
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Per-artist breakdown */}
          <div>
            <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
              ZESTAWIENIE PER ARTYSTA — {selectedYear}
            </p>
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                {['Artysta', 'Udział %', 'Sesje', 'Klienci', 'Łączny przychód', 'Zarobek artysty', 'Zarobek studia'].map((h, i) => (
                  <p
                    key={i}
                    className={i === 0 ? 'col-span-3' : i === 1 ? 'col-span-1' : i === 2 ? 'col-span-1' : i === 3 ? 'col-span-1' : 'col-span-2'}
                    style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >{h}</p>
                ))}
              </div>
              {/* Mobile header */}
              <div className="md:hidden grid grid-cols-6 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                {['Artysta', 'Udział %', 'Sesje', 'Przychód', 'Artysta', 'Studio'].map((h, i) => (
                  <p key={i} style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</p>
                ))}
              </div>

              {artistStats.length === 0 ? (
                <div className="py-12 text-center">
                  <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK DANYCH</p>
                </div>
              ) : artistStats.map((s, i) => {
                const visible = selectedArtistId === 'all' || selectedArtistId === s.artist.id;
                if (!visible) return null;
                return (
                  <>
                    {/* Desktop row */}
                    <div key={s.artist.id} className="hidden md:grid grid-cols-12 px-4 py-4 items-center" style={{ borderBottom: i < artistStats.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                      {/* Name */}
                      <div className="col-span-3 flex items-center gap-3">
                        {s.artist.photo_url && <img src={s.artist.photo_url} alt="" className="w-8 h-8 object-cover flex-shrink-0" style={{ filter: 'brightness(0.8)' }} />}
                        <div>
                          <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{s.artist.name}</p>
                          <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{(s.artist.specialty || []).slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                      {/* Cut % */}
                      <div className="col-span-1">
                        <span style={{ ...mono, fontSize: '10px', color: t.fuchsia, letterSpacing: '0.05em' }}>{s.cut}%</span>
                        <p style={{ ...mono, fontSize: '7px', color: t.muted }}>artysta</p>
                      </div>
                      {/* Sessions */}
                      <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.text }}>{s.sessions}</p>
                      {/* Clients */}
                      <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.text }}>{s.clients}</p>
                      {/* Total revenue */}
                      <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.text }}>{s.totalRevenue.toLocaleString('pl-PL')} PLN</p>
                      {/* Artist earnings */}
                      <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{s.artistEarnings.toLocaleString('pl-PL')} PLN</p>
                      {/* Studio earnings */}
                      <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{s.studioEarnings.toLocaleString('pl-PL')} PLN</p>
                    </div>
                    {/* Mobile row — no photo, compact */}
                    <div key={`mobile-${s.artist.id}`} className="md:hidden grid grid-cols-6 px-4 py-3 items-center text-center" style={{ borderBottom: `0.5px solid ${t.border}`, fontSize: '12px' }}>
                      <p style={{ color: t.text, fontSize: '11px', fontWeight: 500, gridColumn: '1' }}>{s.artist.name}</p>
                      <p style={{ ...mono, fontSize: '9px', color: t.fuchsia }}>{s.cut}%</p>
                      <p style={{ ...mono, fontSize: '9px', color: t.text }}>{s.sessions}</p>
                      <p style={{ ...mono, fontSize: '9px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.totalRevenue.toLocaleString('pl-PL')}</p>
                      <p style={{ ...mono, fontSize: '9px', color: '#16a34a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.artistEarnings.toLocaleString('pl-PL')}</p>
                      <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.studioEarnings.toLocaleString('pl-PL')}</p>
                    </div>
                  </>
                );
              })}

              {/* Totals row */}
              {selectedArtistId === 'all' && artistStats.length > 0 && (
                <div className="grid grid-cols-12 px-4 py-4 items-center" style={{ borderTop: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.04)' }}>
                  <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SUMA</p>
                  <div className="col-span-1" />
                  <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.text, fontWeight: 600 }}>{totals.sessions}</p>
                  <div className="col-span-1" />
                  <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.text, fontWeight: 600 }}>{totals.revenue.toLocaleString('pl-PL')} PLN</p>
                  <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{totals.artistEarnings.toLocaleString('pl-PL')} PLN</p>
                  <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.fuchsia, fontWeight: 600 }}>{totals.studioEarnings.toLocaleString('pl-PL')} PLN</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}