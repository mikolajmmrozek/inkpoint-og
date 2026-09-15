import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, BarChart2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, startOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import TodaySettlementView from '@/components/dashboard/TodaySettlementView';

const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const MONTHS_FULL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

const PAYMENT_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };
const PAYMENT_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };

// Sum amount for a given method from a booking's payment_breakdown.
// Falls back to estimated_price as 'cash' for legacy completed bookings without breakdown.
const sumMethod = (b, method) => {
  if (b.payment_breakdown && b.payment_breakdown.length > 0) {
    return b.payment_breakdown.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  return method === 'cash' ? Number(b.estimated_price || 0) : 0;
};

export default function DashboardStats() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', card: '#F8F8F8' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', card: 'rgba(38,38,38,0.2)' };

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtistId, setSelectedArtistId] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [breakdownView, setBreakdownView] = useState('monthly'); // 'monthly' | 'daily'
  const [pageView, setPageView] = useState('stats'); // 'stats' | 'today'
  const [paymentWeekStart, setPaymentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

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

  // Monthly chart data — stacked by payment method
  const monthlyData = useMemo(() => {
    return MONTHS_PL.map((name, mi) => {
      const mb = filtered.filter(b => b.session_date && new Date(b.session_date).getMonth() === mi);
      const cash = mb.reduce((s, b) => s + sumMethod(b, 'cash'), 0);
      const card = mb.reduce((s, b) => s + sumMethod(b, 'card'), 0);
      const voucher = mb.reduce((s, b) => s + sumMethod(b, 'voucher'), 0);
      return { name, revenue: cash + card + voucher, cash, card, voucher, sessions: mb.length };
    });
  }, [filtered]);

  // Payment method stats — daily (today) and monthly (selected month) totals
  const paymentStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = filtered.filter(b => b.session_date === todayStr);
    const monthBookings = filtered.filter(b => b.session_date && new Date(b.session_date).getMonth() === selectedMonth && new Date(b.session_date).getFullYear() === selectedYear);
    const methods = ['cash', 'card', 'voucher'];
    return methods.map(m => ({
      method: m,
      today: todayBookings.reduce((s, b) => s + sumMethod(b, m), 0),
      month: monthBookings.reduce((s, b) => s + sumMethod(b, m), 0),
    }));
  }, [filtered, selectedMonth, selectedYear]);

  // Daily payment breakdown — 7-day window (Mon–Sun), movable by ±7 days
  const dailyPaymentData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(paymentWeekStart, i);
      const ds = format(d, 'yyyy-MM-dd');
      const db = filtered.filter(b => b.session_date === ds);
      return {
        day: format(d, 'd.MM', { locale: pl }),
        cash: db.reduce((s, b) => s + sumMethod(b, 'cash'), 0),
        card: db.reduce((s, b) => s + sumMethod(b, 'card'), 0),
        voucher: db.reduce((s, b) => s + sumMethod(b, 'voucher'), 0),
      };
    });
  }, [filtered, paymentWeekStart]);

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

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  const KPICard = ({ label, value, sub }) => (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <p style={{ ...display, fontSize: '2.2rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{value}</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  const ViewToggle = () => (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {[{ key: 'stats', label: 'Statystyki', icon: BarChart2, desc: 'Przychód i zestawienia' }, { key: 'today', label: 'Rozliczenie dnia', icon: Wallet, desc: 'Tydzień · podział na artystów' }].map(v => {
        const Icon = v.icon;
        const active = pageView === v.key;
        return (
          <button
            key={v.key}
            onClick={() => setPageView(v.key)}
            className="flex items-center gap-3 p-4 transition-all text-left"
            style={{ border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, background: active ? 'rgb(var(--brand-rgb) /0.08)' : t.bg, cursor: 'pointer', borderRadius: 'var(--radius)' }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: active ? 'var(--brand)' : 'rgb(var(--brand-rgb) /0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={active ? '#fff' : 'var(--brand)'} />
            </div>
            <div className="min-w-0">
              <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: active ? 'var(--brand)' : t.text, fontWeight: 600 }}>{v.label}</p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '3px' }}>{v.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (pageView === 'today') {
    return (
      <div>
        <ViewToggle />
        <TodaySettlementView t={t} theme={theme} />
      </div>
    );
  }

  return (
    <div>
      <ViewToggle />
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

          {/* Monthly chart — stacked by payment method */}
          <div className="mb-8 p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
            <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>
              PRZYCHÓD MIESIĘCZNY {selectedYear} {selectedArtistId !== 'all' ? `— ${artistMap[selectedArtistId]?.name}` : '— WSZYSCY ARTYŚCI'}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `${v} PLN`} />
                <Tooltip
                  contentStyle={{ background: theme === 'light' ? '#fff' : '#111', border: `0.5px solid ${t.border}`, fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text }}
                  formatter={(v, name) => [`${Number(v).toLocaleString('pl-PL')} PLN`, PAYMENT_LABELS[name] || name]}
                  cursor={{ fill: 'rgb(var(--brand-rgb) /0.05)' }}
                />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' }} formatter={(v) => PAYMENT_LABELS[v] || v} />
                <Bar dataKey="cash" stackId="a" fill={PAYMENT_COLORS.cash} />
                <Bar dataKey="card" stackId="a" fill={PAYMENT_COLORS.card} />
                <Bar dataKey="voucher" stackId="a" fill={PAYMENT_COLORS.voucher} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Formy płatności */}
          <div className="mb-8">
            <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
              FORMY PŁATNOŚCI — {MONTHS_FULL[selectedMonth]} {selectedYear}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {paymentStats.map(ps => (
                <div key={ps.method} className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PAYMENT_COLORS[ps.method] }} />
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{PAYMENT_LABELS[ps.method]}</p>
                  </div>
                  <p style={{ ...display, fontSize: '1.6rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{ps.month.toLocaleString('pl-PL')} PLN</p>
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>
                    Miesiąc
                  </p>
                  <div className="pt-3 mt-3" style={{ borderTop: `0.5px solid ${t.border}` }}>
                    <p style={{ ...mono, fontSize: '13px', color: PAYMENT_COLORS[ps.method], fontWeight: 600 }}>{ps.today.toLocaleString('pl-PL')} PLN</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Dziś</p>
                  </div>
                </div>
              ))}
            </div>
            {dailyPaymentData.length > 0 && (
              <div className="p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
                <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>
                  PŁATNOŚCI DZIENNIE — {format(paymentWeekStart, 'd MMM', { locale: pl })} — {format(addDays(paymentWeekStart, 6), 'd MMM yyyy', { locale: pl })}
                </p>
                <div className="flex items-center justify-end gap-2 mb-4">
                  <button onClick={() => setPaymentWeekStart(addWeeks(paymentWeekStart, -1))} style={{ padding: '6px', border: `0.5px solid ${t.border}`, background: t.bg, color: t.muted, cursor: 'pointer' }}>
                    <ChevronLeft size={13} />
                  </button>
                  <button onClick={() => setPaymentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} style={{ ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 10px', border: `0.5px solid ${t.border}`, color: t.muted, background: t.bg, cursor: 'pointer' }}>DZIŚ</button>
                  <button onClick={() => setPaymentWeekStart(addWeeks(paymentWeekStart, 1))} style={{ padding: '6px', border: `0.5px solid ${t.border}`, background: t.bg, color: t.muted, cursor: 'pointer' }}>
                    <ChevronRight size={13} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dailyPaymentData} barCategoryGap="20%">
                    <XAxis dataKey="day" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: t.muted }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `${v}`} />
                    <Tooltip
                      contentStyle={{ background: theme === 'light' ? '#fff' : '#111', border: `0.5px solid ${t.border}`, fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text }}
                      formatter={(v, name) => [`${Number(v).toLocaleString('pl-PL')} PLN`, PAYMENT_LABELS[name] || name]}
                      cursor={{ fill: 'rgb(var(--brand-rgb) /0.05)' }}
                    />
                    <Bar dataKey="cash" stackId="d" fill={PAYMENT_COLORS.cash} />
                    <Bar dataKey="card" stackId="d" fill={PAYMENT_COLORS.card} />
                    <Bar dataKey="voucher" stackId="d" fill={PAYMENT_COLORS.voucher} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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

            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
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
                      <div key={b.id} className="grid grid-cols-12 px-4 py-1.5 items-center" style={{ background: 'rgb(var(--brand-rgb) /0.02)', borderTop: `0.5px solid ${t.border}` }}>
                        <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: t.muted, paddingLeft: '16px' }}>↳ {b.client_name}</p>
                        <p className="col-span-1" />
                        <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: t.muted }}>{Number(b.estimated_price || 0).toLocaleString('pl-PL')} PLN · {b.artist_name}</p>
                        <p className="col-span-3" style={{ ...mono, fontSize: '9px', color: 'rgba(22,163,74,0.7)' }}>
                          {Math.round(Number(b.estimated_price || 0) * ((artistMap[b.artist_id]?.artist_cut_percent ?? 60) / 100)).toLocaleString('pl-PL')} PLN
                        </p>
                        <p className="col-span-2" style={{ ...mono, fontSize: '9px', color: 'rgb(var(--brand-rgb) /0.6)' }}>
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
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
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
                        {s.artist.photo_url && <img src={s.artist.photo_url} alt="" className="w-8 h-8 object-cover flex-shrink-0" style={{ filter: 'brightness(0.8)', borderRadius: 'var(--radius)' }} />}
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
                <div className="grid grid-cols-12 px-4 py-4 items-center" style={{ borderTop: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.04)' }}>
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