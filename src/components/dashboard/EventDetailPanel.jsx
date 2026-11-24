import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Edit, ExternalLink, List, Calendar, Clock, MapPin, Users, Wallet } from 'lucide-react';
import LeaderStack from '@/components/events/LeaderStack';
import { EVENT_COLOR } from '@/lib/calendarEvents';
import { EVENT_STATUS_LABELS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, formatSessionDate, formatSessionTime, formatPrice } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };
const display = { fontFamily: 'var(--font-display)', fontWeight: 400, lineHeight: 1.1 };

function Section({ title, color, t, children }) {
  return (
    <div className="mb-5">
      <p style={{ ...mono, fontSize: '9px', color: color || t.muted, marginBottom: '8px' }}>{title}</p>
      {children}
    </div>
  );
}

function Text({ value, t }) {
  return (
    <p style={{ fontSize: '13px', lineHeight: 1.65, color: t.muted, whiteSpace: 'pre-line' }}>{value}</p>
  );
}

/**
 * Podgląd terminu oferty — otwierany z kalendarza, widoku dnia i listy rezerwacji.
 * Pokazuje dane oferty i terminu, zapisanych uczestników oraz skrót do edycji.
 */
export default function EventDetailPanel({ entry, event = {}, session = {}, bookings = [], theme = 'dark', isAdmin = false, onClose, onEdit }) {
  const navigate = useNavigate();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.65)', border: '#E5E5E5' }
    : { bg: '#0A0A0A', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', border: '#262626' };

  const accent = entry.cancelled ? t.muted : EVENT_COLOR;
  const statusLabel = entry.cancelled ? 'ANULOWANA' : (entry.event_status && entry.event_status !== 'published' ? EVENT_STATUS_LABELS[entry.event_status] : null);
  const leaderPeople = [...(entry.leaders || []), ...(entry.external_leaders || []).map(n => ({ name: n }))];
  const leaderNames = [
    ...(entry.leaders || []).map(l => l.name),
    ...(entry.external_leaders || []),
  ].filter(Boolean);
  const participants = (bookings || []).filter(b => b.session_id === entry.id && b.status !== 'cancelled');
  const taken = participants.reduce((sum, b) => sum + (Number(b.participants) || 1), 0);
  const capacity = Number(entry.capacity ?? session.capacity) || 0;
  const price = Number(event.price) || 0;
  const canOpenPublic = Boolean(entry.slug);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 h-full z-50 w-full sm:w-96 overflow-y-auto"
        style={{ borderLeft: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius) 0 0 var(--radius)' }}
      >
        {/* Nagłówek */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {event.main_image_url ? (
              <img src={event.main_image_url} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'rgba(245,158,11,0.12)', border: '0.5px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ ...display, fontSize: '15px', color: accent }}>
                  {(entry.title || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h3 style={{ ...display, fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em' }}>{entry.title}</h3>
              <p style={{ ...mono, fontSize: '9px', color: t.muted, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                OFERTA{event.category_name ? ` · ${event.category_name}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '7px', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {statusLabel && (
          <span style={{ ...mono, display: 'inline-block', fontSize: '8px', color: accent, border: `0.5px solid ${accent}`, padding: '2px 6px', borderRadius: 'var(--radius)', marginBottom: '14px' }}>
            {statusLabel}
          </span>
        )}

        {/* Akcje */}
        <div className="flex flex-col gap-2 mb-5">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 w-full py-2"
            style={{ border: '0.5px solid var(--brand)', background: 'rgb(var(--brand-rgb) /0.08)', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 'var(--radius)' }}
          >
            <Edit size={11} /> EDYTUJ OFERTĘ
          </button>
          {canOpenPublic && (
            <button
              onClick={() => navigate(`/wydarzenia/${entry.slug}`)}
              className="flex items-center justify-center gap-1.5 w-full py-2"
              style={{ border: `0.5px solid ${t.border}`, background: 'transparent', color: t.text, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 'var(--radius)' }}
            >
              <ExternalLink size={11} /> ZOBACZ OFERTĘ
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { onClose(); navigate('/dashboard/events'); }}
              className="flex items-center justify-center gap-1.5 w-full py-2"
              style={{ border: `0.5px solid ${t.border}`, background: 'transparent', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 'var(--radius)' }}
            >
              <List size={11} /> WSZYSTKIE OFERTY
            </button>
          )}
          {canOpenPublic && (
            <a
              href={`/wydarzenia/${entry.slug}`}
              onClick={(e) => { e.preventDefault(); navigate(`/wydarzenia/${entry.slug}`); }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.04em', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}
            >
              <ExternalLink size={10} style={{ flexShrink: 0 }} /> /wydarzenia/{entry.slug}
            </a>
          )}
        </div>

        {/* Termin i szczegóły */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div style={{ border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={10} /> DATA</p>
            <p style={{ fontSize: '13px', color: t.text, marginTop: '4px' }}>{formatSessionDate(entry.session_date)}</p>
          </div>
          <div style={{ border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> GODZINY</p>
            <p style={{ fontSize: '13px', color: t.text, marginTop: '4px' }}>{formatSessionTime(entry) || '—'}</p>
          </div>
          <div style={{ border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={10} /> MIEJSCA</p>
            <p style={{ fontSize: '13px', color: capacity > 0 && taken >= capacity ? '#ef4444' : t.text, marginTop: '4px' }}>
              {taken}{capacity > 0 ? ` / ${capacity}` : ''}
            </p>
          </div>
          <div style={{ border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Wallet size={10} /> CENA</p>
            <p style={{ fontSize: '13px', color: t.text, marginTop: '4px' }}>{price > 0 ? formatPrice(price) : 'Bezpłatna'}</p>
          </div>
        </div>

        {entry.location && (
          <div className="mb-5 flex items-start gap-2">
            <MapPin size={12} color={accent} style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: t.muted }}>{entry.location}</p>
          </div>
        )}

        {leaderPeople.length > 0 && (
          <Section title="PROWADZĄCY" t={t}>
            <div className="flex items-center gap-3">
              <LeaderStack people={leaderPeople} size={32} ring={t.bg} />
              <p style={{ fontSize: '13px', color: t.text }}>{leaderNames.join(', ')}</p>
            </div>
          </Section>
        )}

        <Section title={`ZAPISANI UCZESTNICY (${participants.length})`} t={t}>
          {participants.length === 0 ? (
            <p style={{ ...mono, fontSize: '9px', color: t.muted }}>BRAK ZAPISÓW</p>
          ) : (
            <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {participants.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: i < participants.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                  <div className="min-w-0">
                    <p style={{ fontSize: '13px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>
                      {(Number(b.participants) || 1)} {Number(b.participants) > 1 ? 'MIEJSCA' : 'MIEJSCE'}
                    </p>
                  </div>
                  <span style={{ ...mono, fontSize: '8px', color: BOOKING_STATUS_COLORS[b.status] || t.muted, flexShrink: 0 }}>
                    {BOOKING_STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {session.note && (
          <Section title="NOTATKA TERMINU" t={t}>
            <Text value={session.note} t={t} />
          </Section>
        )}

        {event.short_description && (
          <Section title="OPIS" t={t}>
            <Text value={event.short_description} t={t} />
          </Section>
        )}

        {event.program && (
          <Section title="PROGRAM" t={t}>
            <Text value={event.program} t={t} />
          </Section>
        )}

        {event.requirements && (
          <Section title="WYMAGANIA" t={t}>
            <Text value={event.requirements} t={t} />
          </Section>
        )}

        {event.materials && (
          <Section title="CO JEST ZAPEWNIONE" t={t}>
            <Text value={event.materials} t={t} />
          </Section>
        )}
      </motion.div>
    </>
  );
}