import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Users, Copy, Eye, EyeOff, Trash2, Tags, Loader2, CalendarDays, ArrowUpRight } from 'lucide-react';
import EventEditorModal from '@/components/dashboard/events/EventEditorModal';
import EventParticipantsModal from '@/components/dashboard/events/EventParticipantsModal';
import EventCategoriesModal from '@/components/dashboard/events/EventCategoriesModal';
import {
  EVENT_STATUS_COLORS, EVENT_STATUS_LABELS, formatPrice, formatSessionDate,
  formatSessionTime, nextSession, sessionSpots, slugify,
} from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };

export default function DashboardEvents() {
  const { theme } = useOutletContext();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', cardBg: '#FFFFFF', rowHover: 'rgba(0,0,0,0.02)' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', cardBg: 'rgba(255,255,255,0.04)', rowHover: 'rgba(255,255,255,0.04)' };

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorEvent, setEditorEvent] = useState(null);
  const [participantsEvent, setParticipantsEvent] = useState(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', leader: 'all', status: 'all', date: '' });
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    const [evts, cats, sess, bks, arts] = await Promise.all([
      base44.entities.Event.list('-created_date', 200),
      base44.entities.EventCategory.list('order', 100),
      base44.entities.EventSession.list('date', 500),
      base44.entities.EventBooking.list('-created_date', 1000),
      base44.entities.Artist.list('order', 100),
    ]);
    setEvents(evts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
    setCategories(cats);
    setSessions(sess);
    setBookings(bks);
    setArtists(arts);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const visible = useMemo(() => {
    return events.filter(e => {
      if (filters.category !== 'all' && e.category_id !== filters.category) return false;
      if (filters.status !== 'all' && e.status !== filters.status) return false;
      if (filters.leader !== 'all' && !(e.leader_ids || []).includes(filters.leader)) return false;
      if (filters.date) {
        const has = sessions.some(s => s.event_id === e.id && s.date === filters.date);
        if (!has) return false;
      }
      return true;
    });
  }, [events, filters, sessions]);

  const togglePublish = async (event) => {
    setBusyId(event.id);
    try {
      await base44.entities.Event.update(event.id, { status: event.status === 'published' ? 'hidden' : 'published' });
      await load();
    } finally { setBusyId(''); }
  };

  const remove = async (event) => {
    if (!window.confirm(`Usunąć wydarzenie „${event.title}” wraz z terminami i zapisami?`)) return;
    setBusyId(event.id);
    try {
      const evSessions = sessions.filter(s => s.event_id === event.id);
      for (const s of evSessions) {
        await base44.functions.invoke('manageEventCalendar', { action: 'delete_session', session_id: s.id }).catch(() => {});
        await base44.entities.EventSession.delete(s.id).catch(() => {});
      }
      await base44.entities.EventBooking.deleteMany({ event_id: event.id });
      await base44.entities.Event.delete(event.id);
      await load();
    } finally { setBusyId(''); }
  };

  const duplicate = async (event) => {
    setBusyId(event.id);
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = event;
      const copy = await base44.entities.Event.create({
        ...rest,
        title: `${event.title} (kopia)`,
        slug: `${slugify(event.title)}-kopia-${Date.now().toString().slice(-4)}`,
        status: 'draft',
      });
      const evSessions = sessions.filter(s => s.event_id === event.id);
      for (const s of evSessions) {
        const { id: sid, created_date: cd, updated_date: ud, created_by_id: cb, gcal_events, ...srest } = s;
        await base44.entities.EventSession.create({ ...srest, event_id: copy.id, event_title: copy.title, gcal_events: [] });
      }
      await load();
    } finally { setBusyId(''); }
  };

  const selectStyle = {
    background: t.cardBg, border: `0.5px solid ${t.border}`, color: t.text,
    padding: '8px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', outline: 'none', borderRadius: 'var(--radius)',
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[180px]">
          <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>WARSZTATY I WYDARZENIA</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1, marginTop: '4px' }}>
            {events.length} wydarzeń · {bookings.filter(b => b.status === 'pending').length} zapisów do potwierdzenia
          </p>
        </div>
        <a href="/wydarzenia" target="_blank" rel="noopener noreferrer" style={{ ...mono, fontSize: '9px', padding: '9px 13px', border: `0.5px solid ${t.border}`, color: t.text, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius)', textDecoration: 'none' }}>
          POKAŻ OFERTY <ArrowUpRight size={12} />
        </a>
        <button onClick={() => setCategoriesOpen(true)} style={{ ...mono, fontSize: '9px', padding: '9px 13px', border: `0.5px solid ${t.border}`, color: t.text, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius)' }}>
          <Tags size={12} /> KATEGORIE
        </button>
        <button onClick={() => setEditorEvent({})} className="btn-oxblood" style={{ fontSize: '9px', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Plus size={12} /> NOWE WYDARZENIE
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select style={selectStyle} value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="all">Wszystkie kategorie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={selectStyle} value={filters.leader} onChange={e => setFilters(f => ({ ...f, leader: e.target.value }))}>
          <option value="all">Wszyscy prowadzący</option>
          {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={selectStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="all">Wszystkie statusy</option>
          <option value="published">Opublikowane</option>
          <option value="draft">Szkice</option>
          <option value="hidden">Ukryte</option>
        </select>
        <input type="date" style={selectStyle} value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
        {(filters.category !== 'all' || filters.leader !== 'all' || filters.status !== 'all' || filters.date) && (
          <button onClick={() => setFilters({ category: 'all', leader: 'all', status: 'all', date: '' })} style={{ ...mono, fontSize: '9px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>Wyczyść filtry</button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin" color="var(--brand)" /></div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <CalendarDays size={22} color="var(--brand)" className="mx-auto mb-3" />
          <p style={{ ...mono, fontSize: '10px', color: t.muted }}>Brak wydarzeń dla wybranych filtrów.</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div className="hidden lg:grid px-4 py-2.5" style={{ gridTemplateColumns: '2.2fr 1.1fr 1.1fr 0.9fr 1fr 1.1fr 1.4fr', borderBottom: `0.5px solid ${t.border}`, background: t.cardBg }}>
            {['Wydarzenie', 'Kategoria', 'Prowadzący', 'Data', 'Cena', 'Miejsca', 'Akcje'].map(h => (
              <p key={h} style={{ ...mono, fontSize: '8px', color: t.muted }}>{h}</p>
            ))}
          </div>
          {visible.map(event => {
            const evSessions = sessions.filter(s => s.event_id === event.id);
            const session = nextSession(evSessions);
            const spots = session ? sessionSpots(session, bookings) : null;
            return (
              <div
                key={event.id}
                className="px-4 py-3 grid gap-2 items-center"
                style={{ gridTemplateColumns: '1fr', borderBottom: `0.5px solid ${t.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="lg:grid lg:gap-2 lg:items-center" style={{ gridTemplateColumns: '2.2fr 1.1fr 1.1fr 0.9fr 1fr 1.1fr 1.4fr' }}>
                  <div className="min-w-0">
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: t.text, fontWeight: 600 }}>{event.title}</p>
                    <p style={{ ...mono, fontSize: '8px', marginTop: '3px', color: EVENT_STATUS_COLORS[event.status] }}>{EVENT_STATUS_LABELS[event.status]}</p>
                  </div>
                  <p className="hidden lg:block" style={{ fontSize: '12px', color: t.muted }}>{event.category_name || '—'}</p>
                  <p className="hidden lg:block" style={{ fontSize: '12px', color: t.muted }}>{(event.leader_names || []).join(', ') || '—'}</p>
                  <p className="hidden lg:block" style={{ ...mono, fontSize: '10px', color: t.text }}>
                    {session ? `${formatSessionDate(session.date, false)} ${session.start_time || ''}` : '—'}
                  </p>
                  <p className="hidden lg:block" style={{ ...mono, fontSize: '10px', color: t.text }}>{formatPrice(event.price)}</p>
                  <p className="hidden lg:block" style={{ ...mono, fontSize: '10px', color: spots?.full ? '#ef4444' : t.text }}>
                    {spots ? `${spots.taken}/${spots.capacity}` : '—'}
                    {spots && <span style={{ color: t.muted }}> · wolne {spots.left}</span>}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2 lg:mt-0">
                    <button title="Edytuj" onClick={() => setEditorEvent(event)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, padding: '5px', cursor: 'pointer', borderRadius: 'var(--radius)' }}><Pencil size={12} /></button>
                    <button title="Uczestnicy" onClick={() => setParticipantsEvent(event)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, padding: '5px', cursor: 'pointer', borderRadius: 'var(--radius)' }}><Users size={12} /></button>
                    <button title="Duplikuj" onClick={() => duplicate(event)} disabled={busyId === event.id} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, padding: '5px', cursor: 'pointer', borderRadius: 'var(--radius)' }}><Copy size={12} /></button>
                    <button title={event.status === 'published' ? 'Ukryj' : 'Opublikuj'} onClick={() => togglePublish(event)} disabled={busyId === event.id} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: event.status === 'published' ? '#16a34a' : t.muted, padding: '5px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                      {event.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button title="Usuń" onClick={() => remove(event)} disabled={busyId === event.id} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#ef4444', padding: '5px', cursor: 'pointer', borderRadius: 'var(--radius)' }}><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 lg:hidden" style={{ ...mono, fontSize: '8px', color: t.muted }}>
                  <span>{event.category_name || 'bez kategorii'}</span>
                  <span>{session ? `${formatSessionDate(session.date, false)} · ${formatSessionTime(session)}` : 'brak terminu'}</span>
                  <span>{spots ? `${spots.taken}/${spots.capacity} miejsc` : ''}</span>
                  <span style={{ color: 'var(--brand)' }}>{formatPrice(event.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorEvent && (
        <EventEditorModal
          event={editorEvent.id ? editorEvent : null}
          categories={categories}
          artists={artists}
          theme={theme}
          onClose={() => setEditorEvent(null)}
          onSaved={() => { setEditorEvent(null); load(); }}
        />
      )}

      {participantsEvent && (
        <EventParticipantsModal
          event={participantsEvent}
          sessions={sessions}
          bookings={bookings}
          theme={theme}
          onClose={() => setParticipantsEvent(null)}
          onReload={load}
        />
      )}

      {categoriesOpen && (
        <EventCategoriesModal
          categories={categories}
          theme={theme}
          onClose={() => setCategoriesOpen(false)}
          onReload={load}
        />
      )}
    </div>
  );
}