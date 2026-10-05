import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { Calendar, Clock, TrendingUp, X, ChevronLeft, ChevronRight, Search, Zap, Wallet, Phone, Mail, QrCode, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isPast, parseISO, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';
import SettlementModal from '@/components/dashboard/SettlementModal';
import TodayOverview from '@/components/dashboard/TodayOverview';
import { openHealthFormQRPage } from '@/lib/qrPage';
import ClientSearch from '@/components/dashboard/ClientSearch';
import ArtistSessionRow from '@/components/artist/ArtistSessionRow';
import { buildHealthFormStatusMap } from '@/lib/healthFormStatus';
import { pluralSesji } from '@/utils';

const PAYMENT_METHOD_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };
const PAYMENT_METHOD_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };

const STATUS_COLORS = {
  pending: 'var(--brand)',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};
const STATUS_LABELS = { pending: 'Oczekuje', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

const getDefaultSessionTime = () => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const roundedM = Math.round(m / 15) * 15;
  if (roundedM >= 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
};

// ── Booking Detail / View Modal ──────────────────────────────────────────────
function BookingModal({ booking, isNew, artist, artistServices, theme, user, onClose, onSaved }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', inputBorder: '#CCCCCC' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', inputBorder: '#262626' };

  const buildForm = (b) => {
    if (b && !b._prefill) {
      const [first, ...last] = (b.client_name || '').split(' ');
      return {
        ...b,
        client_first_name: b.client_first_name || first || '',
        client_last_name: b.client_last_name || last.join(' ') || '',
      };
    }
    return {
      client_name: '', client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
      session_date: b?.session_date || format(new Date(), 'yyyy-MM-dd'),
      session_time: b?.session_time || getDefaultSessionTime(), session_end_time: '', session_duration: 0,
      tattoo_description: '', tattoo_placement: '', estimated_price: '',
      service_id: '', service_name: '', notes: '', status: 'confirmed', deposit_paid: false,
      artist_id: artist.id, artist_name: artist.name,
      source: 'dashboard',
    };
  };

  const [form, setForm] = useState(() => buildForm(booking));
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [settlingBooking, setSettlingBooking] = useState(null);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(buildForm(booking));
  }, [booking?.id]);

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

  const handleSave = async () => {
    setSaving(true);
    const fullName = `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim() || form.client_name;
    const data = { ...form, client_name: fullName };
    try {
      await base44.entities.Booking.update(booking.id, data);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const inp = (field, type = 'text') => ({
    type,
    value: form[field] || '',
    onChange: e => set(field, e.target.value),
    style: { background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)' },
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.inputBorder,
  });

  const label = txt => (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{txt}</label>
  );

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      await base44.entities.Booking.update(booking.id, { status: 'cancelled' });
      onSaved();
      return;
    }
    await base44.entities.Booking.update(booking.id, { status: newStatus });
    setForm(f => ({ ...f, status: newStatus }));
    onSaved();
  };

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
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>{!editing ? 'PODGLĄD SESJI' : 'EDYTUJ SESJĘ'}</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>
              {form.client_name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>EDYTUJ</button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
          </div>
        </div>

        {/* View mode */}
        {!editing && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', border: `0.5px solid ${STATUS_COLORS[form.status]}`, color: STATUS_COLORS[form.status] }}>
                {STATUS_LABELS[form.status]}
              </span>
              {form.deposit_paid && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ DEPOZYT</span>}
              {!form.health_form_completed && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', padding: '3px 8px', border: '0.5px solid var(--brand)', color: 'var(--brand)' }}>BRAK ANKIETY</span>}
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

          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="space-y-6">
            {/* Client */}
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KLIENT</p>
              <div className="mb-4">
                {label('Szukaj klienta z bazy')}
                <ClientSearch value={form.client_name ? { name: form.client_name } : null} onSelect={(client) => {
                  set('client_first_name', client.first_name || '');
                  set('client_last_name', client.last_name || '');
                  set('client_email', client.email || '');
                  set('client_phone', client.phone || '');
                }} t={t} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>{label('Imię *')}<input {...inp('client_first_name')} /></div>
                <div>{label('Nazwisko *')}<input {...inp('client_last_name')} /></div>
              </div>
              <div className="mt-4">{label('Email')}<input {...inp('client_email', 'email')} /></div>
              <div className="mt-4">{label('Telefon')}<input {...inp('client_phone')} /></div>
            </div>

            {/* Service */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>USŁUGA</p>
              <div style={{ position: 'relative' }}>
                {label('Wybierz usługę (opcjonalnie)')}
                <input
                  type="text"
                  placeholder="Wpisz nazwę usługi..."
                  value={form.service_name || ''}
                  onChange={e => {
                    set('service_name', e.target.value);
                    setShowServiceSuggestions(true);
                  }}
                  onFocus={() => setShowServiceSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 150)}
                  style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${form.service_id ? 'var(--brand)' : t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)' }}
                />
                {showServiceSuggestions && (() => {
                  const q = (form.service_name || '').toLowerCase();
                  const filtered = artistServices.filter(s => !q || s.name.toLowerCase().includes(q));
                  if (!filtered.length) return null;
                  return (
                    <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: t.bg, border: `0.5px solid ${t.border}`, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                      {filtered.map(s => {
                        const priceStr = s.price_type === 'fixed' && s.price_fixed ? ` — ${s.price_fixed} PLN` : s.price_type === 'range' && s.price_min ? ` — od ${s.price_min} PLN` : '';
                        const durStr = s.duration_minutes ? ` (${s.duration_minutes} min)` : '';
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={() => {
                              set('service_id', s.id);
                              set('service_name', s.name);
                              if (s.price_type === 'fixed' && s.price_fixed) set('estimated_price', s.price_fixed);
                              else if (s.price_type === 'range' && s.price_min) set('estimated_price', s.price_min);
                              if (s.duration_minutes) set('session_duration', s.duration_minutes);
                              setShowServiceSuggestions(false);
                            }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', color: t.text, fontFamily: 'var(--font-body)', fontSize: '13px' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span>{s.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginLeft: '8px' }}>{durStr}{priceStr}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              {form.service_id && (
                <div className="mt-3 px-3 py-2 flex items-center gap-2" style={{ background: 'rgb(var(--brand-rgb) /0.05)', border: '0.5px solid rgb(var(--brand-rgb) /0.2)' }}>
                  <Zap size={10} color="var(--brand)" />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>USŁUGA WYBRANA · CENA I CZAS UZUPEŁNIONE</p>
                </div>
              )}
            </div>

            {/* Session */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TERMIN</p>
              <div className="mb-4">{label('Data *')}<input {...inp('session_date', 'date')} style={{ ...inp('session_date', 'date').style, colorScheme: theme === 'light' ? 'light' : 'dark' }} /></div>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>{label('Godzina start')}<input {...inp('session_time')} /></div>
                <div>{label('Godzina koniec')}<input {...inp('session_end_time')} /></div>
              </div>
              <div className="mb-4">{label('Cena (PLN)')}<input {...inp('estimated_price', 'number')} /></div>
              <div>{label('Status')}
                <select value={form.status || 'pending'} onChange={e => set('status', e.target.value)} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Tattoo */}
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TATUAŻ</p>
              <div className="mb-4">{label('Miejsce na ciele')}<input {...inp('tattoo_placement')} /></div>
              <div className="mb-4">{label('Opis projektu')}
                <textarea rows={3} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', resize: 'none' }} value={form.tattoo_description || ''} onChange={e => set('tattoo_description', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.inputBorder} />
              </div>
              <div>{label('Notatki adminów')}
                <textarea rows={2} style={{ background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`, color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', resize: 'none' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.inputBorder} />
              </div>
            </div>

            {/* Flags */}
            <div className="flex gap-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              {[['deposit_paid', 'Wpłacony depozyt'], ['health_form_completed', 'Ankieta zdrowotna']].map(([field, lbl]) => (
                <button key={field} onClick={() => set(field, !form[field])} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form[field] ? '#16a34a' : t.muted }}>
                  <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form[field] ? '#16a34a' : t.border}`, background: form[field] ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form[field] && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                  </div>
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={() => {
                if (saving) return;
                if (!form.client_first_name) { alert('Brak imienia klienta — uzupełnij, aby zapisać.'); return; }
                handleSave();
              }} className="btn-oxblood flex-1" style={{ opacity: (saving || !form.client_first_name) ? 0.5 : 1 }}>
                {saving ? 'ZAPISYWANIE...' : 'ZAPISZ ZMIANY'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost-parchment">ANULUJ</button>
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
    </div>
  );
}

export default function ArtistHome() {
  const { artist, theme } = useOutletContext();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [settlingBooking, setSettlingBooking] = useState(null);
  const [artistServices, setArtistServices] = useState([]);
  const [healthStatusMap, setHealthStatusMap] = useState({});

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', value: '#111111', rowHover: 'rgba(0,0,0,0.03)', rowBorder: '#E5E5E5', border: '#E5E5E5' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', value: '#F5F0EB', rowHover: 'rgba(255,255,255,0.04)', rowBorder: '#262626', border: '#262626' };

  useEffect(() => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100)
      .then(setBookings)
      .finally(() => setLoading(false));
    setTimeout(() => {
      base44.entities.Service.filter({ is_active: true }).then(svcs => {
        setArtistServices(svcs.filter(s => !s.artist_ids?.length || s.artist_ids.includes(artist.id)));
      });
    }, 800);
    base44.entities.HealthForm.list('-created_date', 300)
      .then(forms => setHealthStatusMap(buildHealthFormStatusMap(forms)))
      .catch(() => {});
  }, [artist?.id]);

  // Realtime — nadchodzące sesje i statystyki odświeżają się na żywo
  useRealtimeSync('Booking', () => {
    if (!artist?.id) return;
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100).then(setBookings);
  }, [artist?.id]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const upcoming = bookings.filter(b => b.session_date >= todayStr && (b.status === 'pending' || b.status === 'confirmed'));
  const overdue = bookings.filter(b => b.session_date < todayStr && (b.status === 'pending' || b.status === 'confirmed'));
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonth = bookings.filter(b => b.session_date?.startsWith(monthPrefix) && b.status === 'completed');
  const cut = artist.artist_cut_percent || 60;
  const revenue = thisMonth.reduce((sum, b) => sum + ((b.estimated_price || 0) * cut / 100), 0);
  // Prognoza: wszystkie zapisane sesje w tym miesiącu (bez anulowanych) minus to, co już zarobione
  const bookedThisMonth = bookings.filter(b => b.session_date?.startsWith(monthPrefix) && b.status !== 'cancelled');
  const projected = bookedThisMonth.reduce((sum, b) => sum + (b.estimated_price || 0), 0) * cut / 100;
  const forecast = Math.round(projected - revenue);

  const KPI = [
    { label: 'Nadchodzące sesje', value: upcoming.length, icon: Calendar, link: '/artist/schedule' },
    { label: 'Sesje w tym miesiącu', value: thisMonth.length, icon: TrendingUp, link: '/artist/stats' },
    { label: 'Mój zarobek (mies.)', value: `${Math.round(revenue)} zł`, sub: `Prognoza: +${forecast} zł`, icon: Clock, link: '/artist/stats' },
  ];

  // All active sessions sorted ascending, max 10 upcoming
  const sortedUpcoming = [...upcoming].sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '') || (a.session_time || '').localeCompare(b.session_time || '')).slice(0, 10);

  // Group by date
  const groupByDate = (list) => {
    const groups = {};
    list.forEach(b => {
      const d = b.session_date || 'brak';
      if (!groups[d]) groups[d] = [];
      groups[d].push(b);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const overdueGroups = groupByDate(overdue.sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '')));
  const upcomingGroups = groupByDate(sortedUpcoming);

  const todayBookings = bookings.filter(b => b.session_date === todayStr && b.status !== 'cancelled')
    .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''));
  const todayLabel = format(new Date(), 'EEEE, d MMMM', { locale: pl }).toUpperCase();

  const handleSettled = (updated) => {
    setSettlingBooking(null);
    base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100).then(setBookings);
    if (updated?.id) {
      base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: updated.id }).catch(() => {});
    }
  };

  const formatDayHeader = (dateStr) => {
    if (!dateStr || dateStr === 'brak') return 'BRAK DATY';
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return `DZIŚ — ${format(d, 'EEEE, d MMMM', { locale: pl }).toUpperCase()}`;
      return format(d, 'EEEE, d MMMM yyyy', { locale: pl }).toUpperCase();
    } catch { return dateStr; }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Cześć, {artist.name?.split(' ')[0]}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {KPI.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={kpi.link} className="block p-6 h-full" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)' }}>
                <Icon size={16} color="var(--brand)" className="mb-4" />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.value, lineHeight: 1, letterSpacing: '0.04em' }}>
                  {loading ? '—' : kpi.value}
                </p>
                {kpi.sub && !loading && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '6px' }}>{kpi.sub}</p>
                )}
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>{kpi.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Rozliczenie dnia — under monthly earnings */}
      <TodayOverview
        bookings={bookings}
        t={t}
        theme={theme}
        artists={[artist]}
        onBookingUpdate={handleSettled}
        variant="artist"
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>NADCHODZĄCE SESJE</p>
          <Link to="/artist/schedule" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>WSZYSTKIE →</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: 'var(--brand)' }} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue */}
            {overdueGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand)' }}>DO ROZLICZENIA / PRZETERMINOWANE</p>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgb(var(--brand-rgb) /0.3)' }} />
                </div>
                {overdueGroups.map(([date, items]) => (
                  <div key={date} className="mb-3">
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', opacity: 0.7 }}>{formatDayHeader(date)}</p>
                    <div style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.4)', background: t.cardBg, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      {items.map((b, i) => (
                        <ArtistSessionRow key={b.id} booking={b} healthStatusMap={healthStatusMap} t={t} isLast={i === items.length - 1} onClick={() => setSelectedBooking(b)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Today — always show */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#16a34a' }}>DZIŚ — {todayLabel}</p>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(22,163,74,0.3)' }} />
              </div>
              {todayBookings.length === 0 ? (
                <div className="py-5 text-center" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK UMÓWIONYCH SESJI DZIŚ</p>
                </div>
              ) : (
                <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  {todayBookings.map((b, i) => (
                    <ArtistSessionRow key={b.id} booking={b} healthStatusMap={healthStatusMap} t={t} isLast={i === todayBookings.length - 1} onClick={() => setSelectedBooking(b)} />
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming (excluding today) */}
            {upcomingGroups.filter(([d]) => d !== todayStr).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.muted }}>{formatDayHeader(date)}</p>
                  <div style={{ flex: 1, height: '0.5px', background: t.cardBorder }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>{items.length} {pluralSesji(items.length)}</span>
                </div>
                <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  {items.map((b, i) => (
                    <ArtistSessionRow key={b.id} booking={b} healthStatusMap={healthStatusMap} t={t} isLast={i === items.length - 1} onClick={() => setSelectedBooking(b)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <BookingModal
            booking={selectedBooking}
            isNew={false}
            artist={artist}
            artistServices={artistServices}
            theme={theme}
            user={user}
            onClose={() => setSelectedBooking(null)}
            onSaved={() => {
              base44.entities.Booking.filter({ artist_id: artist.id }, '-session_date', 100).then(setBookings);
              setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>

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
    </div>
  );
}