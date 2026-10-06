import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, ChevronRight, Plus, X, Search, Zap, RefreshCw, FileText, Edit3, Wallet, Phone, Mail, QrCode, Check } from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateMenu } from '@/components/create/CreateMenuContext';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';
import SettlementModal from '@/components/dashboard/SettlementModal';
import { openHealthFormQRPage } from '@/lib/qrPage';
import AvailabilityEditModal from '@/components/dashboard/AvailabilityEditModal';
import ReferenceImagesUpload from '@/components/dashboard/ReferenceImagesUpload';
import { getAvailabilityForDay } from '@/components/dashboard/ArtistScheduleEditor';
import { findTimeOffConflict, findDoubleBookingConflict } from '@/lib/bookingConflicts';
import BookingConflictModal from '@/components/booking/BookingConflictModal';
import { recomputeClientTotalSessions } from '@/lib/clientStats';
import { buildHealthFormStatusMap, resolveBookingHealthStatus } from '@/lib/healthFormStatus';
import HealthFormBadge from '@/components/booking/HealthFormBadge';
import ReferenceImagesGallery from '@/components/booking/ReferenceImagesGallery';
import GroupedBookingList from '@/components/booking/GroupedBookingList';
import ArtistSessionRow from '@/components/artist/ArtistSessionRow';

const STATUS_COLORS = { pending: 'var(--brand)', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };
const STATUS_LABELS = { pending: 'Oczekuje', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };
const PAYMENT_METHOD_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };
const PAYMENT_METHOD_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const getDefaultSessionTime = () => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const roundedM = Math.round(m / 15) * 15;
  if (roundedM >= 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
};

// ── Booking list row (for search results) ────────────────────────────────────
function ArtistBookingRow({ b, i, items, t, healthStatusMap, onSelect }) {
  const endDisplay = b.session_end_time ? `→ ${b.session_end_time}` : b.session_time && b.session_duration ? (() => {
    const [h, m] = b.session_time.split(':').map(Number);
    const endTotal = h * 60 + m + b.session_duration;
    return `→ ${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
  })() : null;
  return (
    <div
      className="flex items-center justify-between p-4 cursor-pointer transition-colors"
      style={{ borderBottom: i < items.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', opacity: b.status === 'cancelled' ? 0.5 : 1 }}
      onClick={() => onSelect(b)}
      onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 text-center" style={{ minWidth: '52px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: STATUS_COLORS[b.status] || 'var(--brand)', letterSpacing: '0.05em' }}>{b.session_time || '—'}</p>
          {endDisplay && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{endDisplay}</p>}
        </div>
        <div className="min-w-0">
          <p style={{ color: t.text, fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>
          {b.tattoo_placement && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.tattoo_placement}</p>}
          {b.service_name && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>{b.service_name}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <HealthFormBadge status={resolveBookingHealthStatus(b, healthStatusMap)} fontSize="10px" style={{ padding: '3px 7px' }} />
        {b.estimated_price > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: t.muted }}>{b.estimated_price} PLN</span>}
        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted }} />
      </div>
    </div>
  );
}

// ── Booking Detail / Edit Modal ──────────────────────────────────────────────
function BookingModal({ booking, isNew, artist, artistServices, theme, user, availabilityRecords, allBookings, onClose, onSaved, healthStatusMap }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', inputBorder: '#CCCCCC' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', inputBorder: '#262626' };

  const [form, setForm] = useState(() => {
    if (isNew) return {
      client_name: '', client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
      session_date: booking?.session_date || format(new Date(), 'yyyy-MM-dd'),
      session_time: booking?.session_time || getDefaultSessionTime(), session_end_time: '', session_duration: 0,
      tattoo_description: '', tattoo_placement: '', estimated_price: '',
      service_id: '', service_name: '', notes: '', status: 'confirmed', deposit_paid: false,
      artist_id: artist.id, artist_name: artist.name, reference_images: [],
      source: 'dashboard',
    };
    const [first, ...last] = (booking?.client_name || '').split(' ');
    return {
      ...booking,
      client_first_name: booking?.client_first_name || first || '',
      client_last_name: booking?.client_last_name || last.join(' ') || '',
      reference_images: booking?.reference_images || [],
    };
  });
  const [saving, setSaving] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [settlingBooking, setSettlingBooking] = useState(null);
  const [editing, setEditing] = useState(isNew);
  const [clientQuery, setClientQuery] = useState(isNew ? '' : (booking?.client_name || ''));
  const [clientSuggestions, setClientSuggestions] = useState([]);

  const formUrl = booking ? `${window.location.origin}/health-form?booking_id=${booking.id}` : '';
  const phone = (form.client_phone || '').trim();
  const email = (form.client_email || '').trim();

  const handleSettled = (updated) => {
    setSettlingBooking(null);
    setForm(f => ({ ...f, ...updated }));
    onSaved();
    if (updated?.id) {
      base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: updated.id }).catch(() => {});
    }
  };

  // Auto-populate client name from Client entity if missing on the booking
  useEffect(() => {
    if (!isNew && !form.client_first_name && form.client_email) {
      base44.entities.Client.filter({ email: form.client_email }, '-created_date', 1)
        .then(clients => {
          if (clients.length > 0) {
            const c = clients[0];
            const [first, ...last] = (c.name || '').split(' ');
            setForm(f => ({
              ...f,
              client_first_name: f.client_first_name || c.first_name || first || '',
              client_last_name: f.client_last_name || c.last_name || last.join(' ') || '',
              client_phone: f.client_phone || c.phone || '',
            }));
          }
        })
        .catch(() => {});
    }
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serviceQuery, setServiceQuery] = useState(isNew ? '' : (booking?.service_name || ''));
  const [showServiceSugg, setShowServiceSugg] = useState(false);
  const [conflict, setConflict] = useState(null);

  const inp = (field, type = 'text') => ({
    type,
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)' },
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.inputBorder,
  });

  const label = txt => (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const searchClients = async (q) => {
    if (!q || q.length < 2) { setClientSuggestions([]); return; }
    const all = await base44.entities.Client.list('-created_date', 200);
    const ql = q.toLowerCase();
    setClientSuggestions(all.filter(c => (c.name || '').toLowerCase().includes(ql) || (c.email || '').toLowerCase().includes(ql) || (c.phone || '').includes(q)).slice(0, 6));
  };

  const selectClient = (c) => {
    const [first, ...last] = (c.name || '').split(' ');
    setForm(f => ({ ...f, client_first_name: c.first_name || first || '', client_last_name: c.last_name || last.join(' ') || '', client_email: c.email || '', client_phone: c.phone || '' }));
    setClientQuery(c.name || '');
    setShowSuggestions(false);
  };

  const handleServiceSelect = (svc) => {
    setForm(f => {
      const dur = svc.duration_minutes || 0;
      let endTime = '';
      if (f.session_time && dur) {
        const [h, m] = f.session_time.split(':').map(Number);
        const total = h * 60 + m + dur;
        endTime = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      }
      return { ...f, service_id: svc.id, service_name: svc.name, session_duration: dur, ...(endTime ? { session_end_time: endTime } : {}), ...(svc.price_fixed ? { estimated_price: svc.price_fixed } : {}) };
    });
    setServiceQuery(svc.name);
    setShowServiceSugg(false);
  };

  const checkConflicts = () => {
    const timeOff = findTimeOffConflict(availabilityRecords, form.session_date, form.session_time, form.session_end_time);
    const doubleBooking = findDoubleBookingConflict(allBookings, form.session_date, form.session_time, form.session_end_time, booking?.id);
    return timeOff || doubleBooking ? { timeOff, doubleBooking } : null;
  };

  const handleSave = () => {
    const c = checkConflicts();
    if (c) { setConflict(c); return; }
    doSave();
  };

  const doSave = async () => {
    setSaving(true);
    const fullName = `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim() || form.client_name || clientQuery;
    const data = { ...form, client_name: fullName };
    let savedBookingId = booking?.id;
    if (isNew) {
      data.session_id = `SES-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const created = await base44.entities.Booking.create(data);
      savedBookingId = created?.id;
      // Upsert client (basic info only; total_sessions recomputed from completed bookings)
      if (form.client_email) {
        const existing = await base44.entities.Client.filter({ email: form.client_email }, '-created_date', 1).catch(() => []);
        if (existing.length === 0) {
          await base44.entities.Client.create({ first_name: form.client_first_name, last_name: form.client_last_name, name: fullName, email: form.client_email, phone: form.client_phone });
        }
      }
    } else {
      await base44.entities.Booking.update(booking.id, data);
    }
    if (form.client_email || form.client_name) recomputeClientTotalSessions(form.client_email, form.client_name).catch(() => {});
    setSaving(false);
    onSaved();
    // Auto-sync to Google Calendar (silent — no error if not connected)
    if (savedBookingId) {
      base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: savedBookingId }).catch(() => {});
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      // Mark as cancelled but keep visible for admin — artist cannot delete
      await base44.entities.Booking.update(booking.id, { status: 'cancelled' });
      if (form.client_email || form.client_name) recomputeClientTotalSessions(form.client_email, form.client_name).catch(() => {});
      onSaved();
      base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: booking.id }).catch(() => {});
      return;
    }
    await base44.entities.Booking.update(booking.id, { status: newStatus });
    setForm(f => ({ ...f, status: newStatus }));
    if (form.client_email || form.client_name) recomputeClientTotalSessions(form.client_email, form.client_name).catch(() => {});
    onSaved();
    base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: booking.id }).catch(() => {});
  };

  const filteredServices = artistServices.filter(s => !serviceQuery || s.name.toLowerCase().includes(serviceQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '32px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>{isNew ? 'NOWA SESJA' : 'PODGLĄD SESJI'}</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>
              {isNew ? 'Dodaj rezerwację' : form.client_name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && !editing && (
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><Edit3 size={18} /></button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><X size={18} /></button>
          </div>
        </div>

        {/* Status badges (view mode) */}
        {!isNew && !editing && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', border: `0.5px solid ${STATUS_COLORS[form.status]}`, color: STATUS_COLORS[form.status] }}>
                {STATUS_LABELS[form.status]}
              </span>
              {form.deposit_paid && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ DEPOZYT</span>}
              <HealthFormBadge status={resolveBookingHealthStatus(form, healthStatusMap)} fontSize="8px" style={{ padding: '3px 8px' }} />
            </div>

            {/* Quick status change */}
            {form.status !== 'cancelled' && (
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>ZMIEŃ STATUS</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== form.status && k !== 'cancelled').map(([k, lbl]) => (
                    <button key={k} onClick={() => handleStatusChange(k)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[k]}`, color: STATUS_COLORS[k], background: 'transparent', cursor: 'pointer' }}>
                      → {lbl}
                    </button>
                  ))}
                  <button onClick={() => handleStatusChange('cancelled')}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid #9ca3af', color: '#9ca3af', background: 'transparent', cursor: 'pointer' }}>
                    → Anuluj
                  </button>
                </div>
              </div>
            )}

            {/* Quick contact */}
            {(phone || email) && (
              <div className="flex gap-2">
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 flex-1 py-2" style={{ border: `0.5px solid ${t.border}`, color: t.text, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <Phone size={11} color="#16a34a" /> ZADZWOŃ
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center justify-center gap-1.5 flex-1 py-2" style={{ border: `0.5px solid ${t.border}`, color: t.text, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <Mail size={11} color="var(--brand)" /> EMAIL
                  </a>
                )}
              </div>
            )}

            {/* Settlement action */}
            <div>
              <button
                onClick={() => setSettlingBooking(booking)}
                className="btn-oxblood flex items-center gap-1.5 justify-center w-full"
                style={{ fontSize: '9px', padding: '10px' }}
              >
                <Wallet size={12} /> {form.is_settled ? 'EDYTUJ ROZLICZENIE' : 'ROZLICZ'}
              </button>
            </div>

            {/* Settlement summary */}
            {form.is_settled && form.payment_breakdown && (
              <div className="p-3" style={{ border: '0.5px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Check size={11} color="#16a34a" />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>ROZLICZONO</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>FINAŁNA KWOTA</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.title, fontWeight: 600 }}>{Number(form.final_amount || 0).toLocaleString('pl-PL')} PLN</span>
                  </div>
                  {Number(form.deposit_amount || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>ZALICZKA</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>{Number(form.deposit_amount).toLocaleString('pl-PL')} PLN</span>
                    </div>
                  )}
                  <div className="pt-2" style={{ borderTop: '0.5px solid rgba(22,163,74,0.2)' }}>
                    {form.payment_breakdown.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PAYMENT_METHOD_COLORS[p.method] || t.muted }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.title }}>{Number(p.amount || 0).toLocaleString('pl-PL')} PLN</span>
                      </div>
                    ))}
                  </div>
                  {form.settled_by_name && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid rgba(22,163,74,0.15)' }}>
                      ROZLICZYŁ: {form.settled_by_name}{form.settled_date ? ` · ${new Date(form.settled_date).toLocaleDateString('pl-PL')}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Health form section */}
            {form.health_form_completed ? (
              <div className="p-3" style={{ border: '0.5px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.04)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={11} color="#16a34a" />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>ANKIETA ZDROWOTNA — WYPEŁNIONA</p>
                </div>
                <button onClick={() => setShowHealthForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#16a34a', background: 'transparent', padding: '7px 10px', border: '0.5px solid rgba(22,163,74,0.4)', marginTop: '6px', cursor: 'pointer', width: '100%' }}>
                  <FileText size={10} /> PODGLĄD ANKIETY
                </button>
              </div>
            ) : (
              <div className="p-3" style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.3)', background: 'rgb(var(--brand-rgb) /0.04)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>ANKIETA ZDROWOTNA — BRAK</p>
                <button onClick={() => openHealthFormQRPage(formUrl)} title="Pokaż kod QR do ankiety"
                  className="flex items-center gap-1.5 justify-center w-full py-2"
                  style={{ border: '0.5px solid var(--brand)', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
                  <QrCode size={12} /> QR
                </button>
              </div>
            )}

            {/* Details view */}
            <div className="space-y-3 pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
              {[
                ['DATA', `${form.session_date || '—'}${form.session_time ? ` · ${form.session_time}${form.session_end_time ? `–${form.session_end_time}` : ''}` : ''}`],
                ['KLIENT', form.client_name],
                ['TELEFON', form.client_phone],
                ['EMAIL', form.client_email],
                ['USŁUGA', form.service_name],
                ['MIEJSCE', form.tattoo_placement],
                ['OPIS', form.tattoo_description],
                ['CENA', form.estimated_price ? `${form.estimated_price} zł` : null],
                ['NOTATKI', form.notes],
              ].filter(([, v]) => v).map(([lbl, val]) => (
                <div key={lbl}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>{lbl}</p>
                  <p style={{ color: t.text, fontSize: '13px' }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Reference images gallery */}
            {form.reference_images && form.reference_images.length > 0 && (
              <div className="pt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ZDJĘCIA REFERENCYJNE ({form.reference_images.length})</p>
                <ReferenceImagesGallery images={form.reference_images} theme={theme} t={theme === 'light' ? { border: '#E5E5E5' } : { border: '#262626' }} />
              </div>
            )}

          </div>
        )}

        {/* Edit / New form */}
        {(isNew || editing) && (
          <div className="space-y-5">
            {/* Client */}
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>KLIENT</p>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                {label('Szukaj klienta z bazy')}
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: t.muted, pointerEvents: 'none' }} />
                  <input type="text" value={clientQuery}
                    onChange={e => { setClientQuery(e.target.value); searchClients(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Imię, email lub telefon..."
                    style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0 10px 18px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)' }}
                  />
                </div>
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: t.bg, border: `0.5px solid ${t.border}`, maxHeight: '180px', overflowY: 'auto' }}>
                    {clientSuggestions.map(c => (
                      <button key={c.id} onMouseDown={() => selectClient(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', color: t.text, fontFamily: 'var(--font-body)', fontSize: '13px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <span>{c.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginLeft: '8px' }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>{label('Imię *')}<input {...inp('client_first_name')} /></div>
                <div>{label('Nazwisko')}<input {...inp('client_last_name')} /></div>
              </div>
              <div className="mt-3">{label('Email')}<input {...inp('client_email', 'email')} /></div>
              <div className="mt-3">{label('Telefon')}<input {...inp('client_phone')} /></div>
            </div>

            {/* Service */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>USŁUGA</p>
              <div style={{ position: 'relative' }}>
                {label('Wybierz usługę')}
                <input type="text" value={serviceQuery}
                  onChange={e => { setServiceQuery(e.target.value); setShowServiceSugg(true); if (!e.target.value) setForm(f => ({ ...f, service_id: '', service_name: '' })); }}
                  onFocus={() => setShowServiceSugg(true)}
                  onBlur={() => setTimeout(() => setShowServiceSugg(false), 150)}
                  placeholder="Wpisz nazwę..."
                  style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${form.service_id ? 'var(--brand)' : t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)' }}
                />
                {showServiceSugg && filteredServices.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: t.bg, border: `0.5px solid ${t.border}`, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredServices.map(s => (
                      <button key={s.id} onMouseDown={() => handleServiceSelect(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', color: t.text, fontFamily: 'var(--font-body)', fontSize: '13px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        {s.name}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginLeft: '8px' }}>
                          {s.duration_minutes ? `${s.duration_minutes} min` : ''}{s.price_fixed ? ` · ${s.price_fixed} zł` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.service_id && (
                <div className="mt-2 px-3 py-1 flex items-center gap-2" style={{ background: 'rgb(var(--brand-rgb) /0.05)', border: '0.5px solid rgb(var(--brand-rgb) /0.2)' }}>
                  <Zap size={10} color="var(--brand)" />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>CZAS I CENA UZUPEŁNIONE</p>
                </div>
              )}
            </div>

            {/* Session */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>TERMIN</p>
              <div className="mb-3">{label('Data *')}<input {...inp('session_date', 'date')} style={{ ...inp('session_date', 'date').style, colorScheme: theme === 'light' ? 'light' : 'dark' }} /></div>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[['Godz. start', 'session_time', true], ['Min start', 'session_time', false], ['Godz. koniec', 'session_end_time', true], ['Min koniec', 'session_end_time', false]].map(([lbl, field, isHour], idx) => (
                  <div key={idx}>
                    {label(lbl)}
                    <select
                      value={isHour ? (form[field]?.split(':')[0] || '00') : (form[field]?.split(':')[1] || '00')}
                      onChange={e => {
                        setForm(f => {
                          const parts = (f[field] || '00:00').split(':');
                          if (isHour) parts[0] = e.target.value; else parts[1] = e.target.value;
                          return { ...f, [field]: parts.join(':') };
                        });
                      }}
                      style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', colorScheme: theme === 'light' ? 'light' : 'dark' }}
                    >
                      {(isHour ? HOURS : MINUTES).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>{label('Cena (PLN)')}<input {...inp('estimated_price', 'number')} /></div>
            </div>

            {/* Tattoo */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>TATUAŻ / ZABIEG</p>
              <div className="mb-3">{label('Miejsce na ciele')}<input {...inp('tattoo_placement')} /></div>
              <div className="mb-3">{label('Opis')}<textarea rows={2} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', resize: 'none' }} value={form.tattoo_description || ''} onChange={e => setForm(f => ({ ...f, tattoo_description: e.target.value }))} /></div>
              <div className="mb-3">
                {label('Zdjęcia referencyjne')}
                <ReferenceImagesUpload
                  images={form.reference_images || []}
                  onChange={(imgs) => setForm(f => ({ ...f, reference_images: imgs }))}
                  t={theme === 'light'
                    ? { border: '#E5E5E5', muted: 'rgba(0,0,0,0.4)' }
                    : { border: '#262626', muted: 'rgba(245,240,235,0.4)' }
                  }
                />
              </div>
              <div>{label('Notatki')}<textarea rows={2} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', resize: 'none' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>

            {/* Status (edit mode) */}
            {!isNew && (
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
                {label('Status')}
                <select value={form.status || 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}

            {/* Flags */}
            <div className="flex gap-4 pt-2">
              {[['deposit_paid', '✓ Depozyt wpłacony'], ['health_form_completed', '✓ Ankieta zdrowotna']].map(([field, lbl]) => (
                <button key={field} onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: form[field] ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form[field] ? '#16a34a' : t.border}`, background: form[field] ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form[field] && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                  </div>
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={() => {
                if (saving) return;
                if (!form.client_first_name) { alert('Brak imienia klienta — uzupełnij, aby zapisać.'); return; }
                if (!form.session_date) { alert('Brak daty sesji — uzupełnij, aby zapisać.'); return; }
                handleSave();
              }} className="btn-oxblood flex-1" style={{ fontSize: '10px', opacity: saving || !form.client_first_name || !form.session_date ? 0.5 : 1 }}>
                {saving ? 'ZAPISUJĘ...' : isNew ? 'DODAJ SESJĘ' : 'ZAPISZ ZMIANY'}
              </button>
              <button onClick={() => isNew ? onClose() : setEditing(false)} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>ANULUJ</button>
            </div>
          </div>
        )}
      </motion.div>

      {showHealthForm && (
        <HealthFormPreviewModal
          bookingId={booking?.id}
          clientName={form.client_name}
          onClose={() => setShowHealthForm(false)}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)' }
          }
        />
      )}

      {settlingBooking && (
        <SettlementModal
          booking={settlingBooking}
          user={user}
          onClose={() => setSettlingBooking(null)}
          onSettled={handleSettled}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)' }}
        />
      )}

      {conflict && (
        <BookingConflictModal
          conflicts={conflict}
          theme={theme}
          onConfirm={() => { setConflict(null); doSave(); }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  );
}

// ── Monthly Calendar View ────────────────────────────────────────────────────
function MonthView({ bookings, selectedDate, onDayClick, viewMonth, setViewMonth, t, theme, onBookingClick, onAddBooking, availabilityRecords, onAvailabilityClick, healthStatusMap }) {
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const startPad = (getDay(startOfMonth(viewMonth)) + 6) % 7;
  const today = new Date();
  const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
  const selectedDayBookings = bookings
    .filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate))
    .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));

  // Get availability badge for a day: 'free' | 'block' | null
  const getAvailBadge = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const exceptions = (availabilityRecords || []).filter(r => r.type === 'exception');
    const match = exceptions.find(r => {
      if (!r.date || r.date > dateStr) return false;
      if (r.repeat_until && r.repeat_until !== 'indefinite' && r.repeat_until < dateStr) return false;
      if (!r.repeat || r.repeat === 'none') return r.date === dateStr;
      const start = parseISO(r.date);
      const target = parseISO(dateStr);
      const diff = Math.round((target - start) / 86400000);
      if (diff < 0) return false;
      if (r.repeat === 'weekly') return diff % 7 === 0;
      if (r.repeat === 'biweekly') return diff % 14 === 0;
      if (r.repeat === 'monthly') return start.getDate() === target.getDate();
      return false;
    });
    if (!match) return null;
    return { type: match.is_available ? 'free' : 'block', record: match };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: t.title, letterSpacing: '0.08em' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => <div key={d} className="text-center py-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em' }}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const dayBk = bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), day));
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const avail = getAvailBadge(day);
          const isBlocked = avail && avail.type === 'block';
          const isFullDayOff = isBlocked && !avail.record.start_time && !avail.record.end_time;
          return (
            <button key={day.toISOString()} onClick={() => onDayClick(day)}
              style={{
                minHeight: '52px', padding: '6px 4px',
                border: isSelected ? `0.5px solid var(--brand)` : isBlocked ? `0.5px solid rgb(var(--brand-rgb) /0.35)` : isToday ? `0.5px solid ${t.cardBorder}` : `0.5px solid transparent`,
                background: isSelected
                  ? 'rgb(var(--brand-rgb) /0.12)'
                  : isFullDayOff
                    ? 'repeating-linear-gradient(45deg, rgb(var(--brand-rgb) /0.10) 0px, rgb(var(--brand-rgb) /0.10) 3px, rgb(var(--brand-rgb) /0.03) 3px, rgb(var(--brand-rgb) /0.03) 8px)'
                    : 'transparent',
                cursor: 'pointer', textAlign: 'center', position: 'relative',
                opacity: isFullDayOff && !isSelected ? 0.75 : 1,
              }}>
              {avail && avail.type === 'free' && (
                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', borderRadius: '1px', background: '#16a34a', opacity: 0.7 }} />
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isSelected ? 'var(--brand)' : isBlocked ? 'var(--brand)' : isToday ? t.title : isSameMonth(day, viewMonth) ? t.text : t.muted, fontWeight: isToday ? 600 : 400 }}>
                {format(day, 'd')}
              </span>
              <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                {dayBk.slice(0, 3).map((b, i) => (
                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[b.status] || 'var(--brand)' }} />
                ))}
                {dayBk.length > 3 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted }}>+{dayBk.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day sessions */}
      <div className="mt-6" style={{ borderTop: `0.5px solid ${t.cardBorder}`, paddingTop: '16px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
          SESJE — {format(selectedDate, 'EEEE, d MMMM', { locale: pl }).toUpperCase()}
        </p>

        {/* Availability badge for selected day */}
        {(() => {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const avail = getAvailBadge(selectedDate);
          if (!avail) return null;
          const isRecurring = avail.record.repeat && avail.record.repeat !== 'none';
          const color = avail.type === 'free' ? '#16a34a' : 'var(--brand)';
          const timeStr = avail.record.start_time && avail.record.end_time ? `${avail.record.start_time}–${avail.record.end_time}` : 'Cały dzień';
          return (
            <button
              onClick={() => {
                const r = avail.record;
                const related = (availabilityRecords || []).filter(x =>
                  x.type === 'exception' &&
                  (x.note || '') === (r.note || '') &&
                  (x.start_time || '') === (r.start_time || '') &&
                  (x.end_time || '') === (r.end_time || '') &&
                  (x.repeat || 'none') === (r.repeat || 'none') &&
                  x.is_available === r.is_available
                );
                onAvailabilityClick({ record: r, dateStr, allRecords: related.length > 0 ? related : [r] });
              }}
              className="flex items-center gap-2 w-full mb-3 px-3 py-2 text-left"
              style={{ border: `0.5px solid ${color}40`, background: `${color}08`, cursor: 'pointer' }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.06em' }}>
                {avail.type === 'free' ? 'Dyspozycja' : 'Blokada'} · {timeStr}
              </span>
              {isRecurring && <RefreshCw size={9} color={color} style={{ opacity: 0.7 }} />}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, opacity: 0.6, marginLeft: 'auto' }}>KLIKNIJ ABY EDYTOWAĆ →</span>
            </button>
          );
        })()}

        {selectedDayBookings.length === 0 ? (
          <div className="py-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: 'rgb(var(--brand-rgb) /0.02)', borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px' }}>BRAK SESJI W TEN DZIEŃ</p>
            <button onClick={onAddBooking} className="btn-oxblood" style={{ fontSize: '10px', padding: '8px 20px' }}>+ DODAJ SESJĘ</button>
          </div>
        ) : (
          <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {selectedDayBookings.map((b, i) => (
              <ArtistSessionRow key={b.id} booking={b} healthStatusMap={healthStatusMap} t={t} isLast={i === selectedDayBookings.length - 1} onClick={() => onBookingClick(b)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hourly Day View ──────────────────────────────────────────────────────────
const DAY_START_H = 8;
const DAY_END_H = 22;
const PX_PER_MIN = 2;
const TOTAL_H = (DAY_END_H - DAY_START_H) * 60 * PX_PER_MIN;
const HOUR_MARKS = Array.from({ length: DAY_END_H - DAY_START_H + 1 }, (_, i) => DAY_START_H + i);

function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function HourlyDayView({ bookings, selectedDate, onDateChange, onBookingClick, onNewBookingClick, t, artistId, availabilityRecords, onAvailabilityClick }) {
  const scrollRef = useRef(null);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBk = bookings.filter(b => b.session_date === dateStr).sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));

  // Find availability record for this day
  const availRecord = (() => {
    const exceptions = (availabilityRecords || []).filter(r => r.type === 'exception');
    return exceptions.find(r => {
      if (!r.date || r.date > dateStr) return false;
      if (r.repeat_until && r.repeat_until !== 'indefinite' && r.repeat_until < dateStr) return false;
      if (!r.repeat || r.repeat === 'none') return r.date === dateStr;
      const start = parseISO(r.date);
      const target = parseISO(dateStr);
      const diff = Math.round((target - start) / 86400000);
      if (diff < 0) return false;
      if (r.repeat === 'weekly') return diff % 7 === 0;
      if (r.repeat === 'biweekly') return diff % 14 === 0;
      if (r.repeat === 'monthly') return start.getDate() === target.getDate();
      return false;
    }) || null;
  })();

  // Compute unavailable ranges (hours outside working schedule)
  const unavailableRanges = (() => {
    const DAY_START_MIN = DAY_START_H * 60;
    const DAY_END_MIN = DAY_END_H * 60;
    const ranges = [];
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    const artistRecords = (availabilityRecords || []).filter(r => r.artist_id === artistId);

    const recurring = artistRecords.find(r => r.type === 'recurring' && r.day_of_week === dow && r.is_available !== false);
    let workStart = recurring ? toMin(recurring.start_time) : null;
    let workEnd = recurring ? toMin(recurring.end_time) : null;

    if (availRecord) {
      if (availRecord.is_available) {
        workStart = toMin(availRecord.start_time);
        workEnd = toMin(availRecord.end_time);
      } else if (!availRecord.start_time || !availRecord.end_time) {
        workStart = null;
        workEnd = null;
      }
    }

    if (workStart === null || workEnd === null) {
      ranges.push({ start: DAY_START_MIN, end: DAY_END_MIN, full: true });
    } else {
      if (workStart > DAY_START_MIN) ranges.push({ start: DAY_START_MIN, end: workStart });
      if (workEnd < DAY_END_MIN) ranges.push({ start: workEnd, end: DAY_END_MIN });
    }

    if (availRecord && !availRecord.is_available && availRecord.start_time && availRecord.end_time) {
      const blockStart = toMin(availRecord.start_time);
      const blockEnd = toMin(availRecord.end_time);
      if (blockStart !== null && blockEnd !== null) ranges.push({ start: blockStart, end: blockEnd });
    }

    return ranges;
  })();

  const showNow = isToday(selectedDate);

  useEffect(() => {
    if (scrollRef.current && showNow) {
      const n = new Date();
      const top = Math.max(0, (n.getHours() * 60 + n.getMinutes() - DAY_START_H * 60)) * PX_PER_MIN;
      scrollRef.current.scrollTop = Math.max(0, top - 100);
    }
  }, [showNow]);

  const nowTop = (() => {
    const n = new Date();
    return Math.max(0, (n.getHours() * 60 + n.getMinutes() - DAY_START_H * 60)) * PX_PER_MIN;
  })();

  const handleColumnClick = (e) => {
    if (e.target.closest('[data-bk]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = scrollRef.current?.scrollTop || 0;
    const offsetY = e.clientY - rect.top + scrollTop;
    const clickedMin = Math.round((offsetY / PX_PER_MIN + DAY_START_H * 60) / 15) * 15;
    const h = String(Math.floor(clickedMin / 60)).padStart(2, '0');
    const m = String(clickedMin % 60).padStart(2, '0');
    onNewBookingClick?.(`${h}:${m}`);
  };

  return (
    <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
      {/* Date nav */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.cardBorder}` }}>
        <button onClick={() => onDateChange(subDays(selectedDate, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: t.title, letterSpacing: '0.08em' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight size={16} /></button>
      </div>
      

      {/* Timeline */}
      <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '560px' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Time axis */}
          <div style={{ width: '44px', flexShrink: 0, position: 'relative', height: `${TOTAL_H}px` }}>
            {HOUR_MARKS.map(h => (
              <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START_H) * 60 * PX_PER_MIN}px`, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.04em' }}>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {/* Column */}
          <div onClick={handleColumnClick} style={{ flex: 1, position: 'relative', height: `${TOTAL_H}px`, borderLeft: `0.5px solid ${t.cardBorder}`, cursor: 'crosshair' }}>
            {/* Grid lines */}
            {HOUR_MARKS.map(h => (
              <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START_H) * 60 * PX_PER_MIN}px`, left: 0, right: 0, borderTop: `0.5px solid ${t.cardBorder}`, pointerEvents: 'none' }} />
            ))}
            {/* Unavailable hours overlay (striped) */}
            {unavailableRanges.map((range, idx) => {
              const top = Math.max(0, (range.start - DAY_START_H * 60)) * PX_PER_MIN;
              const height = Math.max(0, range.end - range.start) * PX_PER_MIN;
              return (
                <div key={`unavail-${idx}`} style={{
                  position: 'absolute', top: `${top}px`, height: `${height}px`, left: 0, right: 0,
                  backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--brand-rgb) /0.07) 0px, rgb(var(--brand-rgb) /0.07) 4px, transparent 4px, transparent 10px)',
                  borderTop: range.start > DAY_START_H * 60 ? '0.5px dashed rgb(var(--brand-rgb) /0.25)' : 'none',
                  borderBottom: range.end < DAY_END_H * 60 ? '0.5px dashed rgb(var(--brand-rgb) /0.25)' : 'none',
                  pointerEvents: 'none', zIndex: 0,
                }} />
              );
            })}
            {/* Now line */}
            {showNow && (
              <>
                <div style={{ position: 'absolute', top: `${nowTop}px`, left: 0, right: 0, borderTop: '1px solid var(--brand)', opacity: 0.7, pointerEvents: 'none', zIndex: 2 }} />
                <div style={{ position: 'absolute', top: `${nowTop}px`, left: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 3 }} />
              </>
            )}
            {/* Availability tile in timeline */}
            {availRecord && availRecord.start_time && availRecord.end_time && (() => {
              const color = availRecord.is_available ? '#16a34a' : 'var(--brand)';
              const label = availRecord.is_available ? 'Dyspozycja' : 'Blokada';
              const isRecurring = availRecord.repeat && availRecord.repeat !== 'none';
              const startMin = toMin(availRecord.start_time);
              const endMin = toMin(availRecord.end_time);
              const top = Math.max(0, (startMin - DAY_START_H * 60)) * PX_PER_MIN;
              const height = Math.max(20, (endMin - startMin) * PX_PER_MIN);
              return (
                <div
                  key="avail-tile"
                  onClick={(e) => {
                    e.stopPropagation();
                    const related = (availabilityRecords || []).filter(x =>
                      x.type === 'exception' &&
                      (x.note || '') === (availRecord.note || '') &&
                      (x.start_time || '') === (availRecord.start_time || '') &&
                      (x.end_time || '') === (availRecord.end_time || '') &&
                      (x.repeat || 'none') === (availRecord.repeat || 'none') &&
                      x.is_available === availRecord.is_available
                    );
                    onAvailabilityClick?.({ record: availRecord, dateStr, allRecords: related.length > 0 ? related : [availRecord] });
                  }}
                  style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: '4px', right: '4px', background: `${color}12`, borderLeft: `2px solid ${color}80`, borderTop: `0.5px solid ${color}40`, borderRight: `0.5px solid ${color}40`, borderBottom: `0.5px solid ${color}40`, cursor: 'pointer', padding: '3px 6px', zIndex: 0, display: 'flex', alignItems: 'flex-start', gap: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}20`}
                  onMouseLeave={e => e.currentTarget.style.background = `${color}12`}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label} {availRecord.start_time}–{availRecord.end_time}
                  </span>
                  {isRecurring && <RefreshCw size={8} color={color} style={{ opacity: 0.7, flexShrink: 0 }} />}
                </div>
              );
            })()}

            {/* Booking tiles */}
            {dayBk.map(b => {
              const startMin = toMin(b.session_time);
              if (startMin === null) return null;
              const dur = b.session_duration || 60;
              const top = Math.max(0, (startMin - DAY_START_H * 60)) * PX_PER_MIN;
              const height = Math.max(30, dur * PX_PER_MIN);
              const color = STATUS_COLORS[b.status] || 'var(--brand)';
              const endTime = b.session_end_time || (() => { const e = startMin + dur; return `${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`; })();
              return (
                <div key={b.id} data-bk="1" onClick={(e) => { e.stopPropagation(); onBookingClick(b); }}
                  style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: '4px', right: '4px', background: `${color}18`, borderLeft: `2px solid ${color}`, borderTop: `0.5px solid ${color}40`, borderRight: `0.5px solid ${color}40`, borderBottom: `0.5px solid ${color}40`, cursor: 'pointer', padding: '3px 6px', overflow: 'hidden', zIndex: 1, opacity: b.status === 'cancelled' ? 0.45 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}2e`}
                  onMouseLeave={e => e.currentTarget.style.background = `${color}18`}
                >
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.session_time}–{endTime}</p>
                  {height >= 36 && <p style={{ fontSize: '11px', color: t.text, fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>}
                  {height >= 56 && b.tattoo_placement && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.tattoo_placement}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Summary */}
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap" style={{ borderTop: `0.5px solid ${t.cardBorder}` }}>
        {dayBk.length === 0
          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>BRAK SESJI — kliknij na oś czasu aby dodać</span>
          : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>{dayBk.length} {dayBk.length === 1 ? 'SESJA' : 'SESJE'}</span>
        }
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArtistSchedule() {
  const { artist, theme } = useOutletContext();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'hourly' | 'list'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [artistServices, setArtistServices] = useState([]);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [healthStatusMap, setHealthStatusMap] = useState({});
  const [selectedAvailability, setSelectedAvailability] = useState(null); // { record, dateStr }
  const [searchQuery, setSearchQuery] = useState('');

  const createMenu = useCreateMenu() || {};
  const registerSelectedDate = createMenu.registerSelectedDate || (() => {});

  // Keep the create-menu's booking/dyspozycja prefill in sync with the selected day.
  useEffect(() => {
    registerSelectedDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
  }, [registerSelectedDate, selectedDate]);

  const loadAvailability = useCallback(() => {
    if (!artist?.id) return;
    base44.entities.ArtistAvailability.filter({ artist_id: artist.id }, '-date', 500).then(setAvailabilityRecords);
  }, [artist?.id]);

  // Find the availability record that applies to a given date string
  const getAvailabilityRecordForDate = useCallback((dateStr) => {
    const exceptions = availabilityRecords.filter(r => r.type === 'exception');
    // First: exact single-day match (no repeat)
    const exact = exceptions.find(r => r.date === dateStr && (!r.repeat || r.repeat === 'none'));
    if (exact) return exact;
    // Then: recurring that matches
    const recurring = exceptions.find(r => r.repeat && r.repeat !== 'none' && matchesRepeatOnDate(r, dateStr));
    return recurring || null;
  }, [availabilityRecords]);

  function matchesRepeatOnDate(ex, dateStr) {
    if (!ex.date || ex.date > dateStr) return false;
    if (ex.repeat_until && ex.repeat_until !== 'indefinite' && ex.repeat_until < dateStr) return false;
    const start = parseISO(ex.date);
    const target = parseISO(dateStr);
    const diffDays = Math.round((target - start) / 86400000);
    if (diffDays < 0) return false;
    if (ex.repeat === 'weekly') return diffDays % 7 === 0;
    if (ex.repeat === 'biweekly') return diffDays % 14 === 0;
    if (ex.repeat === 'monthly') {
      return start.getDate() === target.getDate() &&
        (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) >= 0;
    }
    return false;
  }

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', text: '#111111', rowBorder: '#E5E5E5', rowHover: 'rgba(0,0,0,0.03)' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', text: '#F5F0EB', rowBorder: '#262626', rowHover: 'rgba(255,255,255,0.04)' };

  const loadBookings = useCallback(() => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 150)
      .then(setBookings)
      .finally(() => setLoading(false));
    // Load health forms to classify ankieta status badges
    base44.entities.HealthForm.list('-created_date', 500)
      .then(forms => setHealthStatusMap(buildHealthFormStatusMap(forms)))
      .catch(() => {});
  }, [artist?.id]);

  useEffect(() => {
    if (!artist?.id) return;
    // Sequential to avoid rate limit — bookings first, then availability, then services
    loadBookings();
    setTimeout(() => loadAvailability(), 600);
    setTimeout(() => {
      base44.entities.Service.filter({ is_active: true }).then(svcs => {
        setArtistServices(svcs.filter(s => !s.artist_ids?.length || s.artist_ids.includes(artist.id)));
      });
    }, 1200);
    // Auto-sync to Google Calendar in background (picks up new client-submitted bookings)
    setTimeout(() => {
      base44.functions.invoke('manageGoogleCalendar', { action: 'sync' }).catch(() => {});
    }, 2000);
  }, [artist?.id]);

  // Realtime — grafik i sesje odświeżają się na żywo
  useRealtimeSync('Booking', () => loadBookings(), [artist?.id]);
  useRealtimeSync('ArtistAvailability', () => loadAvailability(), [artist?.id]);

  // Deep link from a notification: open the booking's modal and jump to its day.
  const [searchParams] = useSearchParams();
  const pendingBookingId = searchParams.get('booking_id');
  useEffect(() => {
    if (loading || bookings.length === 0) return;
    if (!pendingBookingId) return;
    const found = bookings.find(b => b.id === pendingBookingId);
    if (found) {
      if (found.session_date) setSelectedDate(new Date(found.session_date));
      setSelectedBooking(found);
    }
  }, [loading, bookings, pendingBookingId]);

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  const dayBookings = bookings
    .filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate))
    .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));

  const searchResults = (() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return bookings.filter(b =>
      (b.client_name || '').toLowerCase().includes(q) ||
      (b.session_id || '').toLowerCase().includes(q) ||
      (b.client_email || '').toLowerCase().includes(q) ||
      (b.client_phone || '').includes(searchQuery) ||
      (b.tattoo_placement || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q)
    ).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '') || (a.session_time || '').localeCompare(b.session_time || ''));
  })();

  return (
    <div>
      {/* View toggle + new session */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[['month', 'MIESIĘCZNY'], ['hourly', 'GODZINOWY'], ['list', 'LISTA']].map(([mode, lbl]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 12px', border: `0.5px solid ${viewMode === mode ? 'var(--brand)' : t.cardBorder}`, color: viewMode === mode ? 'var(--brand)' : t.muted, background: viewMode === mode ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-oxblood" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Plus size={13} /> NOWA SESJA
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <div className="flex items-center gap-2 w-full" style={{ border: `0.5px solid ${searchQuery ? 'var(--brand)' : t.cardBorder}`, padding: '8px 14px', background: t.cardBg }}>
          <Search size={12} color={searchQuery ? 'var(--brand)' : t.muted} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Szukaj klienta, emailu, miejsca, sesji..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text, letterSpacing: '0.05em' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Search results — grouped by day */}
      {searchQuery.trim() && (
        <div className="mb-6">
          <div style={{ padding: '10px 16px', background: t.cardBg, border: `0.5px solid ${t.cardBorder}`, marginBottom: '12px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: t.title, letterSpacing: '0.08em' }}>WYNIKI WYSZUKIWANIA</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: searchResults.length > 0 ? 'var(--brand)' : t.muted, letterSpacing: '0.1em', marginTop: '3px' }}>
              {searchResults.length} {searchResults.length === 1 ? 'SESJA' : searchResults.length >= 2 && searchResults.length <= 4 ? 'SESJE' : 'SESJI'}
            </p>
          </div>
          <GroupedBookingList
            bookings={searchResults}
            t={{ border: t.cardBorder, bg: t.cardBg, muted: t.muted, text: t.text }}
            emptyMessage="BRAK PASUJĄCYCH SESJI"
            renderRow={(b, i, items) => <ArtistBookingRow key={b.id} b={b} i={i} items={items} t={t} healthStatusMap={healthStatusMap} onSelect={setSelectedBooking} />}
          />
        </div>
      )}

      {/* Monthly view */}
      {viewMode === 'month' && (
        <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
          <MonthView
            bookings={bookings} selectedDate={selectedDate} onDayClick={handleDayClick}
            viewMonth={viewMonth} setViewMonth={setViewMonth} t={t} theme={theme}
            onBookingClick={setSelectedBooking} onAddBooking={() => setShowNewModal(true)}
            availabilityRecords={availabilityRecords}
            onAvailabilityClick={setSelectedAvailability}
            healthStatusMap={healthStatusMap}
          />
        </div>
      )}

      {/* Hourly day view */}
      {viewMode === 'hourly' && !searchQuery.trim() && (
        <HourlyDayView
          bookings={bookings}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onBookingClick={setSelectedBooking}
          onNewBookingClick={() => setShowNewModal(true)}
          t={t}
          artistId={artist.id}
          availabilityRecords={availabilityRecords}
          onAvailabilityClick={setSelectedAvailability}
        />
      )}

      {/* List view */}
      {viewMode === 'list' && !searchQuery.trim() && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {format(selectedDate, 'EEE, d MMM yyyy', { locale: pl }).toUpperCase()}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setSelectedDate(d => subDays(d, 1))} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 10px' }}><ChevronLeft size={14} /></button>
              <button onClick={() => setSelectedDate(new Date())} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DZIŚ</button>
              <button onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 10px' }}><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* Availability info for selected day */}
          {(() => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const ex = getAvailabilityRecordForDate(dateStr);
            const dow = selectedDate.getDay();
            const recurringOff = availabilityRecords.find(r => r.type === 'recurring' && r.day_of_week === dow && r.is_available === false);
            const record = ex || (recurringOff ? { is_available: false, start_time: recurringOff.start_time, end_time: recurringOff.end_time, note: recurringOff.note || 'Cykliczne wolne' } : null);
            if (!record) return null;
            const color = record.is_available ? '#16a34a' : 'var(--brand)';
            const label = record.is_available ? 'Dyspozycja' : 'Wolne';
            const timeStr = record.start_time && record.end_time ? `${record.start_time}–${record.end_time}` : 'Cały dzień';
            return (
              <div className="flex items-center gap-2 mb-3 px-3 py-2" style={{ border: `0.5px solid ${color}40`, background: `${color}08` }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, letterSpacing: '0.06em' }}>{label} · {timeStr}</span>
                {record.note && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, opacity: 0.7, marginLeft: '4px' }}>{record.note}</span>}
              </div>
            );
          })()}

          {loading ? (
            <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}><div className="w-8 h-px mx-auto animate-pulse" style={{ background: 'var(--brand)' }} /></div>
          ) : dayBookings.length === 0 ? (
            <div className="p-10 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px' }}>BRAK SESJI W TEN DZIEŃ</p>
              <button onClick={() => setShowNewModal(true)} className="btn-oxblood" style={{ fontSize: '10px' }}>+ DODAJ SESJĘ</button>
            </div>
          ) : (
            <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {dayBookings.map((b, i) => (
                <ArtistSessionRow key={b.id} booking={b} healthStatusMap={healthStatusMap} t={t} isLast={i === dayBookings.length - 1} onClick={() => setSelectedBooking(b)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingModal
            booking={selectedBooking}
            isNew={false}
            artist={artist}
            artistServices={artistServices}
            theme={theme}
            user={user}
            availabilityRecords={availabilityRecords}
            allBookings={bookings}
            onClose={() => setSelectedBooking(null)}
            onSaved={() => { setSelectedBooking(null); loadBookings(); }}
            healthStatusMap={healthStatusMap}
          />
        )}
        {showNewModal && (
          <BookingModal
            booking={{ session_date: format(selectedDate, 'yyyy-MM-dd') }}
            isNew={true}
            artist={artist}
            artistServices={artistServices}
            theme={theme}
            user={user}
            availabilityRecords={availabilityRecords}
            allBookings={bookings}
            onClose={() => setShowNewModal(false)}
            onSaved={() => { setShowNewModal(false); loadBookings(); }}
          />
        )}
      </AnimatePresence>

      {selectedAvailability && (
        <AvailabilityEditModal
          record={selectedAvailability.record}
          allRecords={selectedAvailability.allRecords || [selectedAvailability.record]}
          dateStr={selectedAvailability.dateStr}
          theme={theme}
          onClose={() => setSelectedAvailability(null)}
          onSaved={() => { setSelectedAvailability(null); loadAvailability(); }}
        />
      )}
    </div>
  );
}