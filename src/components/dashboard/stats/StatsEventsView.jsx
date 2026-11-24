import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { eventSummary, payTypeLabel } from '@/lib/eventFinance';

// Statystyki ofert (warsztatów i wydarzeń): przychód z potwierdzonych zapisów,
// oczekujące zgłoszenia i wynagrodzenia artystów prowadzących.
export default function StatsEventsView({ t, events, sessions, bookings, selectedYear }) {
  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  const yearSessions = useMemo(
    () => (sessions || []).filter(s => String(s.date || '').startsWith(String(selectedYear))),
    [sessions, selectedYear]
  );

  const rows = useMemo(() => {
    return (events || []).map(event => {
      const evSessions = yearSessions.filter(s => s.event_id === event.id);
      const summary = eventSummary(event, evSessions, bookings);
      return { event, sessionsCount: evSessions.length, ...summary };
    }).filter(r => r.sessionsCount > 0 || r.revenue > 0);
  }, [events, yearSessions, bookings]);

  const pending = useMemo(() => {
    const ids = new Set(yearSessions.map(s => s.id));
    return (bookings || []).filter(b => ids.has(b.session_id) && b.status === 'pending').length;
  }, [yearSessions, bookings]);

  const totals = rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    participants: acc.participants + r.participants,
    payout: acc.payout + r.payout,
  }), { revenue: 0, participants: 0, payout: 0 });

  const KPI = ({ label, value, sub, accent }) => (
    <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <p style={{ ...display, fontSize: '2.2rem', color: accent || t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{value}</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KPI label="Przychód z ofert" value={`${totals.revenue.toLocaleString('pl-PL')} PLN`} sub={`${rows.length} ofert · ${selectedYear}`} />
        <KPI label="Potwierdzone miejsca" value={totals.participants} />
        <KPI label="Zapisy do potwierdzenia" value={pending} accent={pending > 0 ? '#f59e0b' : t.title} />
        <KPI label="Wynagrodzenia prowadzących" value={`${totals.payout.toLocaleString('pl-PL')} PLN`} sub="wg stawek ofert" />
      </div>

      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
        OFERTY — {selectedYear}
      </p>

      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div className="hidden md:grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          {[
            { label: 'Oferta', cls: 'col-span-4' },
            { label: 'Terminy', cls: 'col-span-1' },
            { label: 'Miejsca', cls: 'col-span-1' },
            { label: 'Przychód', cls: 'col-span-2' },
            { label: 'Wynagrodzenie', cls: 'col-span-2' },
            { label: 'Stawka', cls: 'col-span-2' },
          ].map(h => (
            <p key={h.label} className={h.cls} style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h.label}</p>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarDays size={20} color="var(--brand)" className="mx-auto mb-3" />
            <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK OFERT W TYM ROKU</p>
          </div>
        ) : rows.map((r, i) => (
          <div key={r.event.id} style={{ borderBottom: i < rows.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
            <div className="hidden md:grid grid-cols-12 px-4 py-3 items-center">
              <p className="col-span-4" style={{ fontSize: '13px', color: t.text, fontWeight: 500 }}>{r.event.title}</p>
              <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.text }}>{r.sessionsCount}</p>
              <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.text }}>{r.participants}</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.text }}>{r.revenue.toLocaleString('pl-PL')} PLN</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{r.payout.toLocaleString('pl-PL')} PLN</p>
              <p className="col-span-2" style={{ ...mono, fontSize: '9px', color: t.muted }}>
                {r.event.leader_pay_type === 'percent' ? `${r.event.leader_pay_value || 0}%` : r.event.leader_pay_type === 'fixed' ? `${Number(r.event.leader_pay_value || 0).toLocaleString('pl-PL')} PLN / termin` : '—'}
              </p>
            </div>
            <div className="md:hidden px-4 py-3">
              <p style={{ fontSize: '13px', color: t.text, fontWeight: 600 }}>{r.event.title}</p>
              <div className="flex flex-wrap gap-3 mt-1" style={{ ...mono, fontSize: '9px', color: t.muted }}>
                <span>{r.sessionsCount} terminów</span>
                <span>{r.participants} miejsc</span>
                <span style={{ color: t.text }}>{r.revenue.toLocaleString('pl-PL')} PLN</span>
                <span style={{ color: '#16a34a' }}>wynagrodzenie {r.payout.toLocaleString('pl-PL')} PLN</span>
              </div>
            </div>
          </div>
        ))}

        {rows.length > 0 && (
          <div className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderTop: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.04)' }}>
            <p className="col-span-4" style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SUMA</p>
            <div className="col-span-1" />
            <p className="col-span-1" style={{ ...mono, fontSize: '11px', color: t.text, fontWeight: 600 }}>{totals.participants}</p>
            <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: t.text, fontWeight: 600 }}>{totals.revenue.toLocaleString('pl-PL')} PLN</p>
            <p className="col-span-2" style={{ ...mono, fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{totals.payout.toLocaleString('pl-PL')} PLN</p>
            <div className="col-span-2" />
          </div>
        )}
      </div>
    </div>
  );
}