import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, History, CalendarPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ClientSearch from './ClientSearch';
import ReferenceImagesUpload from './ReferenceImagesUpload';
import { findTimeOffConflict, findDoubleBookingConflict } from '@/lib/bookingConflicts';
import BookingConflictModal from '@/components/booking/BookingConflictModal';
import { recomputeClientTotalSessions } from '@/lib/clientStats';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_DUR = Array.from({ length: 13 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const STATUS_OPTIONS = ['pending','confirmed','completed','cancelled'];

const getDefaultSessionTime = () => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const roundedM = Math.round(m / 15) * 15;
  if (roundedM >= 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
};

export default function BookingModal({ booking, defaultDate, onClose, onSaved, t, lockArtistId }) {
  const isNew = !booking || booking._prefill;
  const [artists, setArtists] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [services, setServices] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [repeatPrompt, setRepeatPrompt] = useState(null); // { client, lastSession }
  const [manualEndTime, setManualEndTime] = useState(false);
  const [conflict, setConflict] = useState(null);
  const calcEndTime = (startTime, durationMinutes) => {
    if (!startTime || !durationMinutes) return '';
    const [h, m] = startTime.split(':').map(Number);
    const endTotal = h * 60 + m + durationMinutes;
    return `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
  };

  const buildForm = (b) => {
    if (b && !b._prefill) {
      const [first, ...last] = (b.client_name || '').split(' ');
      return {
        ...b,
        client_name: b.client_name || '',
        client_first_name: first || '',
        client_last_name: last.join(' ') || '',
        client_email: b.client_email || '',
        client_phone: b.client_phone || '',
        session_end_time: b.session_end_time || calcEndTime(b.session_time, b.session_duration),
        admin_notes: b.admin_notes || '',
        client_notes: '',
        deposit_amount: b.deposit_amount || 0,
        reference_images: b.reference_images || [],
      };
    }
    const p = b?._prefill ? b : null;
    // Split client_name into first/last if provided via prefill
    const [prefillFirst, ...prefillLast] = (p?.client_name || '').split(' ');
    return {
      client_name: '',
      client_first_name: p?.client_first_name || prefillFirst || '',
      client_last_name: p?.client_last_name || prefillLast.join(' ') || '',
      client_email: p?.client_email || '',
      client_phone: p?.client_phone || '',
      artist_id: p?.artist_id || '',
      artist_name: p?.artist_name || '',
      session_date: p?.session_date || defaultDate || '',
      session_time: p?.session_time || getDefaultSessionTime(),
      session_end_time: '',
      session_duration: p?.session_duration || 0,
      tattoo_description: p?.tattoo_description || '',
      tattoo_placement: p?.tattoo_placement || '',
      notes: '',
      admin_notes: '',
      client_notes: '',
      status: 'confirmed',
      deposit_amount: p?.deposit_amount || 0,
      estimated_price: p?.estimated_price || '',
      health_form_completed: false,
      service_id: p?.service_id || '',
      service_name: p?.service_name || '',
      reference_images: [],
      source: 'dashboard',
    };
  };
  const [form, setForm] = useState(() => buildForm(booking));

  // Re-initialize form when booking prop changes (e.g. editing a different booking)
  useEffect(() => {
    setForm(buildForm(booking));
  }, [booking?.id, booking?._prefill]);

  useEffect(() => {
    Promise.all([
      base44.entities.Artist.list(),
      base44.entities.Service.filter({ is_active: true }),
    ]).then(([arts, svcs]) => {
      setAllArtists(arts);
      // When artist is locked (artist role), restrict the dropdown to the session owner only
      if (lockArtistId) {
        const me = arts.find(a => a.id === lockArtistId);
        setArtists(me ? [me] : arts);
        if (me) setForm(f => ({ ...f, artist_id: me.id, artist_name: me.name }));
      } else {
        setArtists(arts);
      }
      const sorted = svcs.sort((a, b) => (a.order || 999) - (b.order || 999));
      setAllServices(sorted);
      setServices(sorted);
      // If editing existing booking with a service, pre-select the category
      if (booking && !booking._prefill && booking.service_id) {
        const svc = sorted.find(s => s.id === booking.service_id);
        if (svc?.category) setSelectedCategory(svc.category);
        if (svc?.name) setServiceQuery(svc.name);
      }
    }).catch(() => {});
  }, []);

  // Load client notes when editing an existing booking (fetch Client by email)
  useEffect(() => {
    if (!isNew && form.client_email) {
      const email = form.client_email.toLowerCase().trim();
      base44.entities.Client.filter({}, '-created_date', 500)
        .then(clients => {
          const match = clients.find(c => (c.email || '').toLowerCase().trim() === email);
          if (match) {
            setForm(f => ({
              ...f,
              client_notes: match.notes || f.client_notes || '',
              client_first_name: f.client_first_name || match.first_name || '',
              client_last_name: f.client_last_name || match.last_name || '',
              client_phone: f.client_phone || match.phone || '',
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    // Clear selected service when category changes
    set('service_id', '');
    set('service_name', '');
    setServiceQuery('');
    // When artist is locked, keep the locked artist regardless of category
    if (lockArtistId) return;
    // Narrow artists to those who perform at least one service in this category
    if (!cat) {
      setArtists(allArtists);
    } else {
      const artistIdsInCat = new Set(
        allServices
          .filter(s => s.category === cat && s.artist_ids && s.artist_ids.length > 0)
          .flatMap(s => s.artist_ids)
      );
      setArtists(artistIdsInCat.size > 0 ? allArtists.filter(a => artistIdsInCat.has(a.id)) : allArtists);
      // If the currently selected artist isn't in the narrowed list, clear it
      if (form.artist_id && artistIdsInCat.size > 0 && !artistIdsInCat.has(form.artist_id)) {
        set('artist_id', '');
        set('artist_name', '');
      }
    }
  };

  const filteredServices = allServices.filter(s => {
    if (selectedCategory && s.category !== selectedCategory) return false;
    // When an artist is selected, show only services they can perform (or services with no artist restriction)
    if (form.artist_id && s.artist_ids && s.artist_ids.length > 0 && !s.artist_ids.includes(form.artist_id)) return false;
    return true;
  });

  const handleService = (serviceId, nameTxt) => {
    if (!serviceId) {
      set('service_id', '');
      set('service_name', '');
      setServiceQuery('');
      if (!lockArtistId) setArtists(allArtists);
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    set('service_id', serviceId);
    set('service_name', svc.name);
    // Prefill price
    if (svc.price_type === 'fixed' && svc.price_fixed) {
      set('estimated_price', svc.price_fixed);
    } else if (svc.price_type === 'range' && svc.price_min) {
      set('estimated_price', svc.price_min);
    }
    // Prefill duration → calculate end time from start
    if (svc.duration_minutes) {
      setForm(f => {
        const dur = Number(svc.duration_minutes);
        let endTime = '';
        if (f.session_time) {
          const [h, m] = f.session_time.split(':').map(Number);
          const total = h * 60 + m + dur;
          endTime = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
        }
        return { ...f, service_id: serviceId, service_name: svc.name, session_duration: dur, ...(endTime ? { session_end_time: endTime } : {}) };
      });
    }
    // Keep category in sync with the selected service (bidirectional filtering)
    if (svc.category) setSelectedCategory(svc.category);
    // Filter artists (skip when artist is locked to the session owner)
    if (lockArtistId) return;
    if (svc.artist_ids && svc.artist_ids.length > 0) {
      setArtists(allArtists.filter(a => svc.artist_ids.includes(a.id)));
    } else {
      setArtists(allArtists);
    }
  };

  const handleArtist = (id) => {
    const a = artists.find(x => x.id === id);
    set('artist_id', id);
    set('artist_name', a?.name || '');
    // If the currently selected service is not available for this artist, clear it
    if (form.service_id) {
      const svc = allServices.find(s => s.id === form.service_id);
      if (svc?.artist_ids && svc.artist_ids.length > 0 && !svc.artist_ids.includes(id)) {
        set('service_id', '');
        set('service_name', '');
        setServiceQuery('');
      }
    }
  };

  const applyClientToForm = (client, session = null) => {
    // Store client WITHOUT _lastSession to avoid re-rendering the repeat prompt panel
    const { _lastSession, ...clientWithoutSession } = client;
    setSelectedClient(clientWithoutSession);
    setForm(f => ({
      ...f,
      client_first_name: client.first_name || '',
      client_last_name: client.last_name || '',
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_notes: client.notes || '',
      ...(session ? {
        artist_id: session.artist_id || '',
        artist_name: session.artist_name || '',
        tattoo_description: session.tattoo_description || '',
        tattoo_placement: session.tattoo_placement || '',
        estimated_price: session.estimated_price || '',
        service_id: session.service_id || '',
        service_name: session.service_name || '',
        session_duration: session.session_duration || 0,
      } : {}),
    }));
  };

  const handleClientSelect = (client) => {
    if (client._isNew) {
      setSelectedClient(null);
      const [first, ...last] = client.name.split(' ');
      setForm(f => ({
        ...f,
        client_first_name: first || '',
        client_last_name: last.join(' ') || '',
        client_email: '',
        client_phone: '',
        client_notes: '',
      }));
    } else if (client._lastSession) {
      // Always show repeat prompt when last session exists
      setRepeatPrompt({ client, lastSession: client._lastSession });
      // Also prefill basic client data immediately
      setForm(f => ({
        ...f,
        client_first_name: client.first_name || '',
        client_last_name: client.last_name || '',
        client_email: client.email || '',
        client_phone: client.phone || '',
      }));
    } else {
      applyClientToForm(client);
    }
  };

  const handleSave = async () => {
    // Check for conflicts (time off + double booking) before saving
    if (form.artist_id && form.session_date && form.session_time) {
      try {
        const [availRecords, dayBookings] = await Promise.all([
          base44.entities.ArtistAvailability.filter({ artist_id: form.artist_id }, '-date', 500),
          base44.entities.Booking.filter({ artist_id: form.artist_id, session_date: form.session_date }, '-created_date', 100),
        ]);
        const timeOff = findTimeOffConflict(availRecords, form.session_date, form.session_time, form.session_end_time);
        const doubleBooking = findDoubleBookingConflict(dayBookings, form.session_date, form.session_time, form.session_end_time, booking?.id);
        if (timeOff || doubleBooking) {
          setConflict({ timeOff, doubleBooking });
          return;
        }
      } catch (e) {}
    }
    doSave();
  };

  const doSave = async () => {
    setSaving(true);
    const fullName = `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();
    const { client_notes, ...rest } = form;
    const depNum = Math.round((Number(form.deposit_amount) || 0) * 100) / 100;
    const data = { ...rest, deposit_amount: depNum, deposit_paid: depNum > 0, client_name: fullName, estimated_price: form.estimated_price ? Math.round(Number(form.estimated_price) * 100) / 100 : undefined };
    delete data.client_first_name;
    delete data.client_last_name;
    let savedBookingId = booking?.id;

    // Generate unique session_id if new booking
    if (isNew && !data.session_id) {
      const date = new Date(form.session_date).toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      data.session_id = `SES-${date}-${random}`;
    }

    if (isNew) {
      const created = await base44.entities.Booking.create(data);
      savedBookingId = created?.id;
      // Upsert client in Client database
      let existingClient = selectedClient;

      // If no client was explicitly selected, try to find a match to avoid duplicates
      if (!existingClient && fullName) {
        const allClients = await base44.entities.Client.list('-created_date', 500);
        const email = (form.client_email || '').toLowerCase().trim();
        const normalizePhone = (p) => (p || '').replace(/\D/g, '');
        const phone = normalizePhone(form.client_phone);
        const nameLower = fullName.toLowerCase().trim();

        existingClient = allClients.find(c => {
          const cEmail = (c.email || '').toLowerCase().trim();
          const cPhone = normalizePhone(c.phone);
          const cName = (c.name || '').toLowerCase().trim();
          // Match by email (if both provided)
          if (email && cEmail && email === cEmail) return true;
          // Match by phone (if both provided and non-empty after normalization)
          if (phone && cPhone && phone === cPhone) return true;
          // Match by name if no conflicting data (different email or phone)
          if (cName && cName === nameLower) {
            // Conflicting email? (both have email but they differ)
            if (email && cEmail && email !== cEmail) return false;
            // Conflicting phone? (both have phone but they differ)
            if (phone && cPhone && phone !== cPhone) return false;
            return true;
          }
          return false;
        }) || null;
      }

      if (existingClient?.id) {
        // Existing client — update with any new data, increment session count, and save client notes
        await base44.entities.Client.update(existingClient.id, {
          first_name: form.client_first_name || existingClient.first_name,
          last_name: form.client_last_name || existingClient.last_name,
          name: fullName,
          email: form.client_email || existingClient.email,
          phone: form.client_phone || existingClient.phone,
          notes: client_notes || existingClient.notes || '',
        });
      } else if (fullName) {
        // Truly new client — create record with client notes
        await base44.entities.Client.create({
          first_name: form.client_first_name,
          last_name: form.client_last_name,
          name: fullName,
          email: form.client_email,
          phone: form.client_phone,
          notes: client_notes || '',
        });
      }
    } else {
      await base44.entities.Booking.update(booking.id, data);
      // Update client notes on the Client entity when editing
      if (form.client_email) {
        const email = form.client_email.toLowerCase().trim();
        try {
          const allClients = await base44.entities.Client.list('-created_date', 500);
          const clientMatch = allClients.find(c => (c.email || '').toLowerCase().trim() === email);
          if (clientMatch) {
            await base44.entities.Client.update(clientMatch.id, {
              notes: client_notes || clientMatch.notes || '',
            });
          }
        } catch (e) {
          console.error('Failed to update client notes:', e);
        }
      }
    }

    // Recompute client's completed session count (excludes cancelled).
    // Call even when email is empty — falls back to client_name.
    if (form.client_email || form.client_name) recomputeClientTotalSessions(form.client_email, form.client_name).catch(() => {});
    setSaving(false);
    onSaved();
    // Auto-sync to Google Calendar (silent — no error if not connected)
    if (savedBookingId) {
      base44.functions.invoke('manageGoogleCalendar', { action: 'sync_one', booking_id: savedBookingId }).catch(() => {});
    }
  };

  const inp = (field, type = 'text') => ({
    type,
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] || '',
    onChange: e => set(field, e.target.value),
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</label>
  );

  return (
    <>
    {/* Repeat session prompt — rendered outside modal to avoid overflow clipping */}
    {repeatPrompt && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A', padding: '36px', maxWidth: '460px', width: '100%' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History size={14} color="var(--brand)" />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>POWRACAJĄCY KLIENT</p>
            </div>
            <button onClick={() => { applyClientToForm(repeatPrompt.client); setRepeatPrompt(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
              <X size={14} />
            </button>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', marginBottom: '20px' }}>
            {repeatPrompt.client.name}
          </h3>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>OSTATNIA SESJA</p>
          <div style={{ border: `0.5px solid ${t.border}`, padding: '14px 16px', marginBottom: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text, marginBottom: '4px' }}>
              {repeatPrompt.lastSession.session_date}{repeatPrompt.lastSession.artist_name ? ` · ${repeatPrompt.lastSession.artist_name}` : ''}
            </p>
            {repeatPrompt.lastSession.tattoo_placement && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>
                {repeatPrompt.lastSession.tattoo_placement}{repeatPrompt.lastSession.tattoo_description ? ` — ${repeatPrompt.lastSession.tattoo_description}` : ''}
              </p>
            )}
            {repeatPrompt.lastSession.estimated_price > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', marginTop: '4px' }}>{repeatPrompt.lastSession.estimated_price} PLN</p>
            )}
          </div>
          <p style={{ fontSize: '13px', color: t.muted, marginBottom: '20px', lineHeight: 1.6 }}>
            Czy chcesz umówić ponownie z danymi z ostatniej sesji (artysta, opis, cena)?
          </p>
          <div className="flex gap-3">
            <button className="btn-oxblood flex-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => { applyClientToForm(repeatPrompt.client, repeatPrompt.lastSession); setRepeatPrompt(null); }}>
              <CalendarPlus size={13} /> TAK, POWTÓRZ SESJĘ
            </button>
            <button className="btn-ghost-parchment" style={{ flex: 1 }}
              onClick={() => { applyClientToForm(repeatPrompt.client); setRepeatPrompt(null); }}>
              NIE, NOWA SESJA
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-screen overflow-y-auto p-5 sm:p-10"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              {isNew ? 'NOWA SESJA' : 'EDYTUJ SESJĘ'}
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
              {isNew ? 'Dodaj rezerwację' : form.client_name}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Client */}
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KLIENT</p>
            {isNew && (
              <div className="mb-4">
                {label('Szukaj istniejącego klienta')}
                <ClientSearch value={form.client_name ? { name: form.client_name } : null} onSelect={handleClientSelect} t={t} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-6 mt-2">
              <div>{label('Imię *')}<input {...inp('client_first_name')} /></div>
              <div>{label('Nazwisko *')}<input {...inp('client_last_name')} /></div>
            </div>
            <div className="mt-4">{label('Email')}<input {...inp('client_email', 'email')} /></div>
            <div className="mt-4">{label('Telefon')}<input {...inp('client_phone')} /></div>
            {selectedClient && (
              <div className="mt-3 p-3" style={{ background: 'rgb(var(--brand-rgb) /0.04)', border: '0.5px solid rgb(var(--brand-rgb) /0.2)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  ISTNIEJĄCY KLIENT · {selectedClient.total_sessions || 0} SESJI
                </p>
                {selectedClient._lastSession ? (
                  <>
                    <p style={{ fontSize: '12px', color: t.muted, marginBottom: '10px', lineHeight: 1.5 }}>
                      Ostatnia sesja: <strong style={{ color: t.text }}>{selectedClient._lastSession.session_date}</strong>
                      {selectedClient._lastSession.artist_name ? ` · ${selectedClient._lastSession.artist_name}` : ''}
                      {selectedClient._lastSession.tattoo_placement ? ` · ${selectedClient._lastSession.tattoo_placement}` : ''}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Zaczytać dane z poprzedniej sesji?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyClientToForm(selectedClient, selectedClient._lastSession)}
                        className="btn-oxblood"
                        style={{ padding: '7px 14px', fontSize: '9px' }}
                      >
                        TAK, UMÓW PONOWNIE
                      </button>
                      <button
                        type="button"
                        onClick={() => applyClientToForm(selectedClient)}
                        className="btn-ghost-parchment"
                        style={{ padding: '6px 14px', fontSize: '9px' }}
                      >
                        NIE, NOWA SESJA
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Service */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>USŁUGA</p>
            {/* Category toggles */}
            <div className="mb-4">
              {label('Kategoria')}
              <div className="flex gap-2 flex-wrap mt-1">
                {[['', 'WSZYSTKIE'], ['tattoo', 'TATTOO'], ['piercing', 'PIERCING'], ['studio', 'STUDIO']]
                  .filter(([val]) => !lockArtistId || val === '' || allServices.some(s => s.category === val && (!s.artist_ids || s.artist_ids.length === 0 || s.artist_ids.includes(lockArtistId))))
                  .map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleCategoryChange(val)}
                    style={{
                      border: `0.5px solid ${selectedCategory === val ? 'var(--brand)' : t.border}`,
                      color: selectedCategory === val ? 'var(--brand)' : t.muted,
                      background: selectedCategory === val ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                      padding: '6px 12px', cursor: 'pointer',
                    }}
                  >{lbl}</button>
                ))}
              </div>
            </div>
            {/* Artist — right below categories */}
            <div className="mb-4 mt-4">
              {label('Artysta')}
              <select
                value={form.artist_id || ''}
                onChange={e => handleArtist(e.target.value)}
                disabled={!!lockArtistId}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark', cursor: lockArtistId ? 'not-allowed' : 'pointer' }}
              >
                {!lockArtistId && <option value="">Wybierz artystę</option>}
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              {label('Wybierz usługę (opcjonalnie)')}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Wpisz nazwę usługi..."
                  value={serviceQuery}
                  onChange={e => {
                    setServiceQuery(e.target.value);
                    setShowServiceSuggestions(true);
                    if (!e.target.value) handleService('');
                  }}
                  onFocus={() => setShowServiceSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 150)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: form.service_id ? 'var(--brand)' : t.border }}
                />
                {serviceQuery && (
                  <button
                    type="button"
                    onClick={() => handleService('')}
                    style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {showServiceSuggestions && (() => {
                const q = serviceQuery.toLowerCase();
                const matches = filteredServices.filter(s => !q || s.name.toLowerCase().includes(q));
                if (!matches.length) return null;
                return (
                  <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#111111', border: `0.5px solid ${t.border}`, maxHeight: '220px', overflowY: 'auto' }}>
                    {matches.map(s => {
                      const priceStr = s.price_type === 'fixed' && s.price_fixed ? ` — ${s.price_fixed} PLN` : s.price_type === 'range' && s.price_min ? ` — od ${s.price_min} PLN` : '';
                      const durStr = s.duration_minutes ? ` (${s.duration_minutes} min)` : '';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            setServiceQuery(s.name);
                            setShowServiceSuggestions(false);
                            handleService(s.id, s.name);
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
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>
                  USŁUGA WYBRANA · CENA I CZAS UZUPEŁNIONE AUTOMATYCZNIE
                </p>
              </div>
            )}
          </div>

          {/* Session */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>SESJA</p>
            <div className="mb-4">
              <div>{label('Data *')}<input {...inp('session_date', 'date')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 items-end">
              <div>
                {label('Godz. start')}
                <select
                  value={form.session_time?.split(':')[0] || '00'}
                  onChange={e => {
                    setForm(f => {
                      const newStartH = parseInt(e.target.value);
                      const startM = parseInt(f.session_time?.split(':')[1] || '0');
                      const newStart = `${e.target.value}:${f.session_time?.split(':')[1] || '00'}`;
                      const dur = f.session_duration || 0;
                      // Shift end time by same duration (locked block)
                      const newEndTotal = newStartH * 60 + startM + dur;
                      const newEnd = `${String(Math.floor(newEndTotal / 60)).padStart(2, '0')}:${String(newEndTotal % 60).padStart(2, '0')}`;
                      return { ...f, session_time: newStart, session_end_time: dur > 0 ? newEnd : f.session_end_time };
                    });
                  }}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                {label('min start')}
                <select
                  value={form.session_time?.split(':')[1] || '00'}
                  onChange={e => {
                    setForm(f => {
                      const startH = parseInt(f.session_time?.split(':')[0] || '0');
                      const newStartM = parseInt(e.target.value);
                      const newStart = `${f.session_time?.split(':')[0] || '00'}:${e.target.value}`;
                      const dur = f.session_duration || 0;
                      // Shift end time by same duration (locked block)
                      const newEndTotal = startH * 60 + newStartM + dur;
                      const newEnd = `${String(Math.floor(newEndTotal / 60)).padStart(2, '0')}:${String(newEndTotal % 60).padStart(2, '0')}`;
                      return { ...f, session_time: newStart, session_end_time: dur > 0 ? newEnd : f.session_end_time };
                    });
                  }}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                {label('Godz. koniec')}
                <select
                  value={form.session_end_time?.split(':')[0] || '00'}
                  onChange={e => {
                    setManualEndTime(true);
                    setForm(f => {
                      const newEnd = `${e.target.value}:${f.session_end_time?.split(':')[1] || '00'}`;
                      const startH = parseInt(f.session_time?.split(':')[0] || '0');
                      const startM = parseInt(f.session_time?.split(':')[1] || '0');
                      const endH = parseInt(e.target.value);
                      const endM = parseInt(f.session_end_time?.split(':')[1] || '0');
                      const dur = (endH * 60 + endM) - (startH * 60 + startM);
                      return { ...f, session_end_time: newEnd, ...(dur > 0 ? { session_duration: dur } : {}) };
                    });
                  }}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                {label('min koniec')}
                <select
                  value={form.session_end_time?.split(':')[1] || '00'}
                  onChange={e => {
                    setManualEndTime(true);
                    setForm(f => {
                      const newEnd = `${f.session_end_time?.split(':')[0] || '00'}:${e.target.value}`;
                      const startH = parseInt(f.session_time?.split(':')[0] || '0');
                      const startM = parseInt(f.session_time?.split(':')[1] || '0');
                      const endH = parseInt(f.session_end_time?.split(':')[0] || '0');
                      const endM = parseInt(e.target.value);
                      const dur = (endH * 60 + endM) - (startH * 60 + startM);
                      return { ...f, session_end_time: newEnd, ...(dur > 0 ? { session_duration: dur } : {}) };
                    });
                  }}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              {label('Cena (PLN)')}<input {...inp('estimated_price', 'number')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} />
            </div>
            <div className="mt-4">
              {label('Status')}
              <select
                value={form.status || 'pending'}
                onChange={e => set('status', e.target.value)}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Tattoo */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TATUAŻ</p>
            <div className="mb-4">{label('Miejsce na ciele')}<input {...inp('tattoo_placement')} /></div>
            <div className="mb-4">{label('Opis projektu')}
              <textarea rows={3} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.tattoo_description || ''} onChange={e => set('tattoo_description', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            {/* Reference images */}
            <div className="mb-4">
              {label('Zdjęcia referencyjne')}
              <ReferenceImagesUpload
                images={form.reference_images || []}
                onChange={(imgs) => set('reference_images', imgs)}
                t={t}
              />
            </div>
            {/* Notatki o kliencie — persistent, stored on Client entity */}
            <div className="mb-4">
              {label('Notatki o kliencie (widoczne przy każdej sesji)')}
              <textarea rows={2} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.client_notes || ''} onChange={e => set('client_notes', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} placeholder="Np. spóźnia się, alergia na lateks..." />
            </div>
            {/* Notatki od klienta — read-only, from online form */}
            {form.notes ? (
              <div className="mb-4">
                {label('Notatki od klienta (z formularza)')}
                <p style={{ padding: '10px 0', fontSize: '13px', color: t.muted, fontFamily: 'var(--font-body)', borderBottom: `0.5px solid ${t.border}`, lineHeight: 1.5 }}>{form.notes}</p>
              </div>
            ) : null}
            {/* Notatki admina — session-specific */}
            <div>
              {label('Notatki admina (tylko dla tej sesji)')}
              <textarea rows={2} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.admin_notes || ''} onChange={e => set('admin_notes', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} placeholder="Notatki wewnętrzne dla tej sesji..." />
            </div>
          </div>

          {/* Zaliczka + Flags */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <div className="mb-6" style={{ maxWidth: '200px' }}>
              {label('Zaliczka (PLN)')}
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deposit_amount || 0}
                onChange={e => set('deposit_amount', e.target.value)}
                onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderBottomColor = t.border}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
              />
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => set('health_form_completed', !form.health_form_completed)}
                className="flex items-center gap-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.health_form_completed ? '#16a34a' : t.muted }}
              >
                <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.health_form_completed ? '#16a34a' : t.border}`, background: form.health_form_completed ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {form.health_form_completed && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                </div>
                Ankieta zdrowotna
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={() => {
            if (saving) return;
            if (!form.client_first_name) { alert('Brak imienia klienta — uzupełnij, aby zapisać.'); return; }
            if (!form.session_date) { alert('Brak daty sesji — uzupełnij, aby zapisać.'); return; }
            handleSave();
          }} className="btn-oxblood flex-1" style={{ opacity: (saving || !form.client_first_name || !form.session_date) ? 0.5 : 1 }}>
            {saving ? 'ZAPISYWANIE...' : isNew ? 'DODAJ REZERWACJĘ' : 'ZAPISZ ZMIANY'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>

    {conflict && (
      <BookingConflictModal
        conflicts={conflict}
        theme={t.bg === '#FFFFFF' ? 'light' : 'dark'}
        onConfirm={() => { setConflict(null); doSave(); }}
        onCancel={() => setConflict(null)}
      />
    )}
    </>
  );
}