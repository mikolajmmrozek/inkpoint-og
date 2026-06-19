import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Plus, X, Search, Zap, RefreshCw } from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';
import AvailabilityEditModal from '@/components/dashboard/AvailabilityEditModal';
import { getAvailabilityForDay } from '@/components/dashboard/ArtistScheduleEditor';

const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };
const STATUS_LABELS = { pending: 'Oczekuje', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

// ── Booking Detail / Edit Modal ──────────────────────────────────────────────
function BookingModal({ booking, isNew, artist, artistServices, theme, onClose, onSaved }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', inputBorder: '#CCCCCC' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', inputBorder: '#262626' };

  const [form, setForm] = useState(() => {
    if (isNew) return {
      client_name: '', client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
      session_date: booking?.session_date || format(new Date(), 'yyyy-MM-dd'),
      session_time: '', session_end_time: '', session_duration: 0,
      tattoo_description: '', tattoo_placement: '', estimated_price: '',
      service_id: '', service_name: '', notes: '', status: 'pending', deposit_paid: false,
      artist_id: artist.id, artist_name: artist.name,
    };
    return { ...booking };
  });
  const [saving, setSaving] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [editing, setEditing] = useState(isNew);
  const [clientQuery, setClientQuery] = useState(isNew ? '' : (booking?.client_name || ''));
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serviceQuery, setServiceQuery] = useState(isNew ? '' : (booking?.service_name || ''));
  const [showServiceSugg, setShowServiceSugg] = useState(false);

  const inp = (field, type = 'text') => ({
    type,
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' },
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = t.inputBorder,
  });

  const label = txt => (
    <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
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

  const handleSave = async () => {
    setSaving(true);
    const fullName = `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim() || form.client_name || clientQuery;
    const data = { ...form, client_name: fullName };
    if (isNew) {
      data.session_id = `SES-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await base44.entities.Booking.create(data);
      // Upsert client
      if (form.client_email) {
        const existing = await base44.entities.Client.filter({ email: form.client_email }, '-created_date', 1).catch(() => []);
        if (existing.length > 0) {
          await base44.entities.Client.update(existing[0].id, { total_sessions: (existing[0].total_sessions || 0) + 1 });
        } else {
          await base44.entities.Client.create({ first_name: form.client_first_name, last_name: form.client_last_name, name: fullName, email: form.client_email, phone: form.client_phone, total_sessions: 1 });
        }
      }
    } else {
      await base44.entities.Booking.update(booking.id, data);
    }
    setSaving(false);
    onSaved();
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      // Mark as cancelled but keep visible for admin — artist cannot delete
      await base44.entities.Booking.update(booking.id, { status: 'cancelled' });
      onSaved();
      return;
    }
    await base44.entities.Booking.update(booking.id, { status: newStatus });
    setForm(f => ({ ...f, status: newStatus }));
    onSaved();
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
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>{isNew ? 'NOWA SESJA' : 'PODGLĄD SESJI'}</p>
            <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>
              {isNew ? 'Dodaj rezerwację' : form.client_name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && !editing && (
              <button onClick={() => setEditing(true)} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>EDYTUJ</button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
          </div>
        </div>

        {/* Status badges (view mode) */}
        {!isNew && !editing && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', border: `0.5px solid ${STATUS_COLORS[form.status]}`, color: STATUS_COLORS[form.status] }}>
                {STATUS_LABELS[form.status]}
              </span>
              {form.deposit_paid && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ DEPOZYT</span>}
              {!form.health_form_completed && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', padding: '3px 8px', border: '0.5px solid #FF007F', color: '#FF007F' }}>BRAK ANKIETY</span>}
            </div>

            {/* Quick status change */}
            {form.status !== 'cancelled' && (
              <div>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>ZMIEŃ STATUS</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== form.status && k !== 'cancelled').map(([k, lbl]) => (
                    <button key={k} onClick={() => handleStatusChange(k)}
                      style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${STATUS_COLORS[k]}`, color: STATUS_COLORS[k], background: 'transparent', cursor: 'pointer' }}>
                      → {lbl}
                    </button>
                  ))}
                  <button onClick={() => handleStatusChange('cancelled')}
                    style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid #9ca3af', color: '#9ca3af', background: 'transparent', cursor: 'pointer' }}>
                    → Anuluj
                  </button>
                </div>
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
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>{lbl}</p>
                  <p style={{ color: t.text, fontSize: '13px' }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Health form button */}
            {form.health_form_completed && (
              <button onClick={() => setShowHealthForm(true)} className="btn-ghost-parchment" style={{ fontSize: '9px', marginTop: '8px' }}>
                PODGLĄD ANKIETY ZDROWOTNEJ
              </button>
            )}
          </div>
        )}

        {/* Edit / New form */}
        {(isNew || editing) && (
          <div className="space-y-5">
            {/* Client */}
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>KLIENT</p>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                {label('Szukaj klienta z bazy')}
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: t.muted, pointerEvents: 'none' }} />
                  <input type="text" value={clientQuery}
                    onChange={e => { setClientQuery(e.target.value); searchClients(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Imię, email lub telefon..."
                    style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0 10px 18px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: t.bg, border: `0.5px solid ${t.border}`, maxHeight: '180px', overflowY: 'auto' }}>
                    {clientSuggestions.map(c => (
                      <button key={c.id} onMouseDown={() => selectClient(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', color: t.text, fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,127,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <span>{c.name}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginLeft: '8px' }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</span>
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
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>USŁUGA</p>
              <div style={{ position: 'relative' }}>
                {label('Wybierz usługę')}
                <input type="text" value={serviceQuery}
                  onChange={e => { setServiceQuery(e.target.value); setShowServiceSugg(true); if (!e.target.value) setForm(f => ({ ...f, service_id: '', service_name: '' })); }}
                  onFocus={() => setShowServiceSugg(true)}
                  onBlur={() => setTimeout(() => setShowServiceSugg(false), 150)}
                  placeholder="Wpisz nazwę..."
                  style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${form.service_id ? '#FF007F' : t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                />
                {showServiceSugg && filteredServices.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: t.bg, border: `0.5px solid ${t.border}`, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredServices.map(s => (
                      <button key={s.id} onMouseDown={() => handleServiceSelect(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', color: t.text, fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,127,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        {s.name}
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginLeft: '8px' }}>
                          {s.duration_minutes ? `${s.duration_minutes} min` : ''}{s.price_fixed ? ` · ${s.price_fixed} zł` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.service_id && (
                <div className="mt-2 px-3 py-1 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.05)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
                  <Zap size={10} color="#FF007F" />
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>CZAS I CENA UZUPEŁNIONE</p>
                </div>
              )}
            </div>

            {/* Session */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>TERMIN</p>
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
                      style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: theme === 'light' ? 'light' : 'dark' }}
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
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>TATUAŻ / ZABIEG</p>
              <div className="mb-3">{label('Miejsce na ciele')}<input {...inp('tattoo_placement')} /></div>
              <div className="mb-3">{label('Opis')}<textarea rows={2} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'none' }} value={form.tattoo_description || ''} onChange={e => setForm(f => ({ ...f, tattoo_description: e.target.value }))} /></div>
              <div>{label('Notatki')}<textarea rows={2} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'none' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>

            {/* Status (edit mode) */}
            {!isNew && (
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
                {label('Status')}
                <select value={form.status || 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}

            {/* Flags */}
            <div className="flex gap-4 pt-2">
              {[['deposit_paid', '✓ Depozyt wpłacony'], ['health_form_completed', '✓ Ankieta zdrowotna']].map(([field, lbl]) => (
                <button key={field} onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: form[field] ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form[field] ? '#16a34a' : t.border}`, background: form[field] ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form[field] && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                  </div>
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSave} disabled={saving || !form.client_first_name || !form.session_date} className="btn-oxblood flex-1" style={{ fontSize: '10px', opacity: saving || !form.client_first_name || !form.session_date ? 0.5 : 1 }}>
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
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' }
          }
        />
      )}
    </div>
  );
}

// ── Monthly Calendar View ────────────────────────────────────────────────────
function MonthView({ bookings, selectedDate, onDayClick, viewMonth, setViewMonth, t, theme, onBookingClick, onAddBooking, availabilityRecords, onAvailabilityClick }) {
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const startPad = (getDay(startOfMonth(viewMonth)) + 6) % 7;
  const today = new Date();
  const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
  const selectedDayBookings = bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate));

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
        <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', color: t.title, letterSpacing: '0.08em' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: pl }).toUpperCase()}
        </p>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => <div key={d} className="text-center py-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.08em' }}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const dayBk = bookings.filter(b => b.session_date && isSameDay(new Date(b.session_date), day));
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const avail = getAvailBadge(day);
          return (
            <button key={day.toISOString()} onClick={() => onDayClick(day)}
              style={{ minHeight: '52px', padding: '6px 4px', border: `0.5px solid ${isSelected ? '#FF007F' : isToday ? t.cardBorder : 'transparent'}`, background: isSelected ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
              {avail && (
                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', borderRadius: '1px', background: avail.type === 'free' ? '#16a34a' : '#FF007F', opacity: 0.7 }} />
              )}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: isSelected ? '#FF007F' : isToday ? t.title : isSameMonth(day, viewMonth) ? t.text : t.muted, fontWeight: isToday ? 600 : 400 }}>
                {format(day, 'd')}
              </span>
              <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                {dayBk.slice(0, 3).map((b, i) => (
                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[b.status] || '#FF007F' }} />
                ))}
                {dayBk.length > 3 && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted }}>+{dayBk.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day sessions */}
      <div className="mt-6" style={{ borderTop: `0.5px solid ${t.cardBorder}`, paddingTop: '16px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
          SESJE — {format(selectedDate, 'EEEE, d MMMM', { locale: pl }).toUpperCase()}
        </p>

        {/* Availability badge for selected day */}
        {(() => {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const avail = getAvailBadge(selectedDate);
          if (!avail) return null;
          const isRecurring = avail.record.repeat && avail.record.repeat !== 'none';
          const color = avail.type === 'free' ? '#16a34a' : '#FF007F';
          const timeStr = avail.record.start_time && avail.record.end_time ? `${avail.record.start_time}–${avail.record.end_time}` : 'Cały dzień';
          return (
            <button
              onClick={() => onAvailabilityClick({ record: avail.record, dateStr })}
              className="flex items-center gap-2 w-full mb-3 px-3 py-2 text-left"
              style={{ border: `0.5px solid ${color}40`, background: `${color}08`, cursor: 'pointer' }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color, letterSpacing: '0.06em' }}>
                {avail.type === 'free' ? 'Dyspozycja' : 'Blokada'} · {timeStr}
              </span>
              {isRecurring && <RefreshCw size={9} color={color} style={{ opacity: 0.7 }} />}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color, opacity: 0.6, marginLeft: 'auto' }}>KLIKNIJ ABY EDYTOWAĆ →</span>
            </button>
          );
        })()}

        {selectedDayBookings.length === 0 ? (
          <div className="py-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: 'rgba(255,0,127,0.02)' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px' }}>BRAK SESJI W TEN DZIEŃ</p>
            <button onClick={onAddBooking} className="btn-oxblood" style={{ fontSize: '10px', padding: '8px 20px' }}>+ DODAJ SESJĘ</button>
          </div>
        ) : (
          <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            {selectedDayBookings.map((b, i) => (
              <div key={b.id} onClick={() => onBookingClick(b)}
                style={{ borderBottom: i < selectedDayBookings.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', padding: '12px', cursor: 'pointer', opacity: b.status === 'cancelled' ? 0.5 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: STATUS_COLORS[b.status] || '#FF007F', letterSpacing: '0.05em', flexShrink: 0 }}>{b.session_time || '—'}{b.session_end_time ? `–${b.session_end_time}` : ''}</span>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[b.status] || t.muted, flexShrink: 0 }} />
                </div>
                <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                {(b.tattoo_placement || b.service_name) && (
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
                    {b.tattoo_placement}{b.service_name ? ` · ${b.service_name}` : ''}
                  </p>
                )}
                {b.estimated_price > 0 && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>{b.estimated_price} zł</p>}
              </div>
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

function HourlyDayView({ bookings, selectedDate, onDateChange, onBookingClick, onNewBookingClick, t, availabilityRecords, onAvailabilityClick }) {
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
        <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.2rem', color: t.title, letterSpacing: '0.08em' }}>
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
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.04em' }}>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {/* Column */}
          <div onClick={handleColumnClick} style={{ flex: 1, position: 'relative', height: `${TOTAL_H}px`, borderLeft: `0.5px solid ${t.cardBorder}`, cursor: 'crosshair' }}>
            {/* Grid lines */}
            {HOUR_MARKS.map(h => (
              <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START_H) * 60 * PX_PER_MIN}px`, left: 0, right: 0, borderTop: `0.5px solid ${t.cardBorder}`, pointerEvents: 'none' }} />
            ))}
            {/* Now line */}
            {showNow && (
              <>
                <div style={{ position: 'absolute', top: `${nowTop}px`, left: 0, right: 0, borderTop: '1px solid #FF007F', opacity: 0.7, pointerEvents: 'none', zIndex: 2 }} />
                <div style={{ position: 'absolute', top: `${nowTop}px`, left: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#FF007F', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 3 }} />
              </>
            )}
            {/* Availability tile in timeline */}
            {availRecord && availRecord.start_time && availRecord.end_time && (() => {
              const color = availRecord.is_available ? '#16a34a' : '#FF007F';
              const label = availRecord.is_available ? 'Dyspozycja' : 'Blokada';
              const isRecurring = availRecord.repeat && availRecord.repeat !== 'none';
              const startMin = toMin(availRecord.start_time);
              const endMin = toMin(availRecord.end_time);
              const top = Math.max(0, (startMin - DAY_START_H * 60)) * PX_PER_MIN;
              const height = Math.max(20, (endMin - startMin) * PX_PER_MIN);
              return (
                <div
                  key="avail-tile"
                  onClick={(e) => { e.stopPropagation(); onAvailabilityClick?.({ record: availRecord, dateStr }); }}
                  style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: '4px', right: '4px', background: `${color}12`, borderLeft: `2px solid ${color}80`, borderTop: `0.5px solid ${color}40`, borderRight: `0.5px solid ${color}40`, borderBottom: `0.5px solid ${color}40`, cursor: 'pointer', padding: '3px 6px', zIndex: 0, display: 'flex', alignItems: 'flex-start', gap: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}20`}
                  onMouseLeave={e => e.currentTarget.style.background = `${color}12`}
                >
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              const color = STATUS_COLORS[b.status] || '#FF007F';
              const endTime = b.session_end_time || (() => { const e = startMin + dur; return `${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`; })();
              return (
                <div key={b.id} data-bk="1" onClick={(e) => { e.stopPropagation(); onBookingClick(b); }}
                  style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: '4px', right: '4px', background: `${color}18`, borderLeft: `2px solid ${color}`, borderTop: `0.5px solid ${color}40`, borderRight: `0.5px solid ${color}40`, borderBottom: `0.5px solid ${color}40`, cursor: 'pointer', padding: '3px 6px', overflow: 'hidden', zIndex: 1, opacity: b.status === 'cancelled' ? 0.45 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}2e`}
                  onMouseLeave={e => e.currentTarget.style.background = `${color}18`}
                >
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.session_time}–{endTime}</p>
                  {height >= 36 && <p style={{ fontSize: '11px', color: t.text, fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client_name}</p>}
                  {height >= 56 && b.tattoo_placement && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.tattoo_placement}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Summary */}
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap" style={{ borderTop: `0.5px solid ${t.cardBorder}` }}>
        {dayBk.length === 0
          ? <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>BRAK SESJI — kliknij na oś czasu aby dodać</span>
          : <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>{dayBk.length} {dayBk.length === 1 ? 'SESJA' : 'SESJE'}</span>
        }
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArtistSchedule() {
  const { artist, theme } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'hourly' | 'list'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [artistServices, setArtistServices] = useState([]);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [selectedAvailability, setSelectedAvailability] = useState(null); // { record, dateStr }

  const loadAvailability = useCallback(() => {
    if (!artist?.id) return;
    base44.entities.ArtistAvailability.filter({ artist_id: artist.id }).then(setAvailabilityRecords);
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
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 300)
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [artist?.id]);

  useEffect(() => {
    loadBookings();
    loadAvailability();
    if (artist?.id) {
      base44.entities.Service.filter({ is_active: true }).then(svcs => {
        setArtistServices(svcs.filter(s => !s.artist_ids?.length || s.artist_ids.includes(artist.id)));
      });
    }
  }, [artist?.id]);

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  const dayBookings = bookings
    .filter(b => b.session_date && isSameDay(new Date(b.session_date), selectedDate))
    .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>MÓJ KALENDARZ</p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.4rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Harmonogram</h1>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-oxblood" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Plus size={13} /> NOWA SESJA
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[['month', 'MIESIĘCZNY'], ['hourly', 'GODZINOWY'], ['list', 'LISTA']].map(([mode, lbl]) => (
          <button key={mode} onClick={() => setViewMode(mode)}
            style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 12px', border: `0.5px solid ${viewMode === mode ? '#FF007F' : t.cardBorder}`, color: viewMode === mode ? '#FF007F' : t.muted, background: viewMode === mode ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer', flex: '1 0 auto' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Monthly view */}
      {viewMode === 'month' && (
        <div className="p-4" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <MonthView
            bookings={bookings} selectedDate={selectedDate} onDayClick={handleDayClick}
            viewMonth={viewMonth} setViewMonth={setViewMonth} t={t} theme={theme}
            onBookingClick={setSelectedBooking} onAddBooking={() => setShowNewModal(true)}
            availabilityRecords={availabilityRecords}
            onAvailabilityClick={setSelectedAvailability}
          />
        </div>
      )}

      {/* Hourly day view */}
      {viewMode === 'hourly' && (
        <HourlyDayView
          bookings={bookings}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onBookingClick={setSelectedBooking}
          onNewBookingClick={() => setShowNewModal(true)}
          t={t}
          availabilityRecords={availabilityRecords}
          onAvailabilityClick={setSelectedAvailability}
        />
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {format(selectedDate, 'EEE, d MMM yyyy', { locale: pl }).toUpperCase()}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setSelectedDate(d => subDays(d, 1))} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 10px' }}><ChevronLeft size={14} /></button>
              <button onClick={() => setSelectedDate(new Date())} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 12px', fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DZIŚ</button>
              <button onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ background: 'none', border: `0.5px solid ${t.cardBorder}`, color: t.muted, cursor: 'pointer', padding: '6px 10px' }}><ChevronRight size={14} /></button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}><div className="w-8 h-px mx-auto animate-pulse" style={{ background: '#FF007F' }} /></div>
          ) : dayBookings.length === 0 ? (
            <div className="p-10 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px' }}>BRAK SESJI W TEN DZIEŃ</p>
              <button onClick={() => setShowNewModal(true)} className="btn-oxblood" style={{ fontSize: '10px' }}>+ DODAJ SESJĘ</button>
            </div>
          ) : (
            <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
              {dayBookings.map((b, i) => (
                <div key={b.id} onClick={() => setSelectedBooking(b)}
                  className="p-4 cursor-pointer"
                  style={{ borderBottom: i < dayBookings.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', opacity: b.status === 'cancelled' ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    {b.session_time && (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: STATUS_COLORS[b.status], letterSpacing: '0.05em', flexShrink: 0 }}>
                        {b.session_time}{b.session_end_time ? `–${b.session_end_time}` : ''}
                      </span>
                    )}
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[b.status]}`, color: STATUS_COLORS[b.status], flexShrink: 0 }}>
                      {STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{b.client_name}</p>
                  {b.client_phone && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>{b.client_phone}</p>}
                  {b.tattoo_placement && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>{b.tattoo_placement}{b.tattoo_description ? ` — ${b.tattoo_description}` : ''}</p>}
                  {b.service_name && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', opacity: 0.8, marginTop: '2px' }}>{b.service_name}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {b.estimated_price > 0 && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted }}>{b.estimated_price} zł</span>}
                    {!b.health_form_completed && b.status !== 'cancelled' && (
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', border: '0.5px solid #FF007F', color: '#FF007F' }}>BRAK ANKIETY</span>
                    )}
                  </div>
                </div>
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
            onClose={() => setSelectedBooking(null)}
            onSaved={() => { setSelectedBooking(null); loadBookings(); }}
          />
        )}
        {showNewModal && (
          <BookingModal
            booking={{ session_date: format(selectedDate, 'yyyy-MM-dd') }}
            isNew={true}
            artist={artist}
            artistServices={artistServices}
            theme={theme}
            onClose={() => setShowNewModal(false)}
            onSaved={() => { setShowNewModal(false); loadBookings(); }}
          />
        )}
      </AnimatePresence>

      {selectedAvailability && (
        <AvailabilityEditModal
          record={selectedAvailability.record}
          dateStr={selectedAvailability.dateStr}
          theme={theme}
          onClose={() => setSelectedAvailability(null)}
          onSaved={() => { setSelectedAvailability(null); loadAvailability(); }}
        />
      )}
    </div>
  );
}