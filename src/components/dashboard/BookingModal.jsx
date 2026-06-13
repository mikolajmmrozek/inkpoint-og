import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, History, CalendarPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ClientSearch from './ClientSearch';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_DUR = Array.from({ length: 13 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const STATUS_OPTIONS = ['pending','confirmed','completed','cancelled'];

export default function BookingModal({ booking, defaultDate, onClose, onSaved, t }) {
  const isNew = !booking || booking._prefill;
  const [artists, setArtists] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [repeatPrompt, setRepeatPrompt] = useState(null); // { client, lastSession }
  const [manualEndTime, setManualEndTime] = useState(false);
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
        client_first_name: first || '',
        client_last_name: last.join(' ') || '',
        session_end_time: b.session_end_time || calcEndTime(b.session_time, b.session_duration),
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
      session_time: p?.session_time || '',
      session_end_time: '',
      session_duration: p?.session_duration || 0,
      tattoo_description: p?.tattoo_description || '',
      tattoo_placement: p?.tattoo_placement || '',
      notes: '',
      status: 'pending',
      deposit_paid: false,
      estimated_price: p?.estimated_price || '',
      health_form_completed: false,
      service_id: p?.service_id || '',
      service_name: p?.service_name || '',
    };
  };
  const [form, setForm] = useState(() => buildForm(booking));

  // Re-initialize form when booking prop changes (e.g. repeat session selected)
  useEffect(() => {
    setForm(buildForm(booking));
  }, [booking?.service_id, booking?.artist_id, booking?.client_email, booking?.tattoo_placement]);

  useEffect(() => {
    Promise.all([
      base44.entities.Artist.list(),
      base44.entities.Service.filter({ is_active: true }),
    ]).then(([arts, svcs]) => {
      setAllArtists(arts);
      setArtists(arts);
      setServices(svcs.sort((a, b) => (a.order || 999) - (b.order || 999)));
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleService = (serviceId) => {
    if (!serviceId) {
      set('service_id', '');
      set('service_name', '');
      setArtists(allArtists);
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
    // Filter artists
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
      ...(session ? {
        artist_id: session.artist_id || '',
        artist_name: session.artist_name || '',
        tattoo_description: session.tattoo_description || '',
        tattoo_placement: session.tattoo_placement || '',
        estimated_price: session.estimated_price || '',
        service_id: session.service_id || '',
        service_name: session.service_name || '',
      } : {}),
    }));
  };

  const handleClientSelect = (client) => {
    if (client._isNew) {
      setSelectedClient(null);
      const [first, ...last] = client.name.split(' ');
      set('client_first_name', first || '');
      set('client_last_name', last.join(' ') || '');
      set('client_email', '');
      set('client_phone', '');
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
    setSaving(true);
    const fullName = `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();
    const data = { ...form, client_name: fullName, estimated_price: form.estimated_price ? Math.round(Number(form.estimated_price) * 100) / 100 : undefined };
    delete data.client_first_name;
    delete data.client_last_name;

    // Generate unique session_id if new booking
    if (isNew && !data.session_id) {
      const date = new Date(form.session_date).toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      data.session_id = `SES-${date}-${random}`;
    }

    if (isNew) {
      await base44.entities.Booking.create(data);
      // Upsert client in Client database
      let existingClient = selectedClient;

      // If no client was explicitly selected, try to find a match to avoid duplicates
      if (!existingClient && fullName) {
        const allClients = await base44.entities.Client.list('-created_date', 500);
        const email = (form.client_email || '').toLowerCase().trim();
        const phone = (form.client_phone || '').trim();
        const nameLower = fullName.toLowerCase().trim();

        existingClient = allClients.find(c => {
          const cEmail = (c.email || '').toLowerCase().trim();
          const cPhone = (c.phone || '').trim();
          const cName = (c.name || '').toLowerCase().trim();
          // Match by email (if both provided)
          if (email && cEmail && email === cEmail) return true;
          // Match by phone (if both provided)
          if (phone && cPhone && phone === cPhone) return true;
          // Match by name only if the existing client has NO email and NO phone
          if (!cEmail && !cPhone && cName === nameLower) return true;
          return false;
        }) || null;
      }

      if (existingClient?.id) {
        // Existing client — update with any new data and increment session count
        await base44.entities.Client.update(existingClient.id, {
          first_name: form.client_first_name || existingClient.first_name,
          last_name: form.client_last_name || existingClient.last_name,
          name: fullName,
          email: form.client_email || existingClient.email,
          phone: form.client_phone || existingClient.phone,
          total_sessions: (existingClient.total_sessions || 0) + 1,
        });
      } else if (fullName) {
        // Truly new client — create record
        await base44.entities.Client.create({
          first_name: form.client_first_name,
          last_name: form.client_last_name,
          name: fullName,
          email: form.client_email,
          phone: form.client_phone,
          total_sessions: 1,
        });
      }
    } else {
      await base44.entities.Booking.update(booking.id, data);
    }

    setSaving(false);
    onSaved();
  };

  const inp = (field, type = 'text') => ({
    type,
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] || '',
    onChange: e => set(field, e.target.value),
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  return (
    <>
    {/* Repeat session prompt — rendered outside modal to avoid overflow clipping */}
    {repeatPrompt && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A', padding: '36px', maxWidth: '460px', width: '100%' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History size={14} color="#FF007F" />
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>POWRACAJĄCY KLIENT</p>
            </div>
            <button onClick={() => { applyClientToForm(repeatPrompt.client); setRepeatPrompt(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
              <X size={14} />
            </button>
          </div>
          <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', marginBottom: '20px' }}>
            {repeatPrompt.client.name}
          </h3>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>OSTATNIA SESJA</p>
          <div style={{ border: `0.5px solid ${t.border}`, padding: '14px 16px', marginBottom: '20px' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.text, marginBottom: '4px' }}>
              {repeatPrompt.lastSession.session_date}{repeatPrompt.lastSession.artist_name ? ` · ${repeatPrompt.lastSession.artist_name}` : ''}
            </p>
            {repeatPrompt.lastSession.tattoo_placement && (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted }}>
                {repeatPrompt.lastSession.tattoo_placement}{repeatPrompt.lastSession.tattoo_description ? ` — ${repeatPrompt.lastSession.tattoo_description}` : ''}
              </p>
            )}
            {repeatPrompt.lastSession.estimated_price > 0 && (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', marginTop: '4px' }}>{repeatPrompt.lastSession.estimated_price} PLN</p>
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
        className="w-full max-w-2xl max-h-screen overflow-y-auto"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A', padding: '40px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              {isNew ? 'NOWA SESJA' : 'EDYTUJ SESJĘ'}
            </p>
            <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
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
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KLIENT</p>
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
              <div className="mt-3 p-3" style={{ background: 'rgba(255,0,127,0.04)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  ISTNIEJĄCY KLIENT · {selectedClient.total_sessions || 0} SESJI
                </p>
                {selectedClient._lastSession ? (
                  <>
                    <p style={{ fontSize: '12px', color: t.muted, marginBottom: '10px', lineHeight: 1.5 }}>
                      Ostatnia sesja: <strong style={{ color: t.text }}>{selectedClient._lastSession.session_date}</strong>
                      {selectedClient._lastSession.artist_name ? ` · ${selectedClient._lastSession.artist_name}` : ''}
                      {selectedClient._lastSession.tattoo_placement ? ` · ${selectedClient._lastSession.tattoo_placement}` : ''}
                    </p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>
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
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>USŁUGA</p>
            <div>
              {label('Wybierz usługę (opcjonalnie)')}
              <select
                value={form.service_id || ''}
                onChange={e => handleService(e.target.value)}
                style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
              >
                <option value="">Brak / usługa niestandardowa</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.duration_minutes ? ` (${s.duration_minutes} min)` : ''}{s.price_type === 'fixed' && s.price_fixed ? ` — ${s.price_fixed} PLN` : s.price_type === 'range' && s.price_min ? ` — od ${s.price_min} PLN` : ''}
                  </option>
                ))}
              </select>
            </div>
            {form.service_id && (
              <div className="mt-3 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.05)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
                <Zap size={10} color="#FF007F" />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>
                  USŁUGA WYBRANA · CENA I CZAS UZUPEŁNIONE AUTOMATYCZNIE
                </p>
              </div>
            )}
          </div>

          {/* Session */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>SESJA</p>
            <div className="mb-4">
              <div>
                {label('Artysta')}
                <select
                  value={form.artist_id || ''}
                  onChange={e => handleArtist(e.target.value)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  <option value="">Wybierz artystę</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <div>{label('Data *')}<input {...inp('session_date', 'date')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }} /></div>
            </div>
            <div className="grid grid-cols-4 gap-6 mb-4">
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
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TATUAŻ</p>
            <div className="mb-4">{label('Miejsce na ciele')}<input {...inp('tattoo_placement')} /></div>
            <div className="mb-4">{label('Opis projektu')}
              <textarea rows={3} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.tattoo_description || ''} onChange={e => set('tattoo_description', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>{label('Notatki adminów')}
              <textarea rows={2} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            {[['deposit_paid', 'Wpłacony depozyt'], ['health_form_completed', 'Ankieta zdrowotna']].map(([field, lbl]) => (
              <button
                key={field}
                onClick={() => set(field, !form[field])}
                className="flex items-center gap-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form[field] ? '#16a34a' : t.muted }}
              >
                <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form[field] ? '#16a34a' : t.border}`, background: form[field] ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {form[field] && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                </div>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSave} disabled={saving || !form.client_first_name || !form.session_date} className="btn-oxblood flex-1" style={{ opacity: (!form.client_first_name || !form.session_date) ? 0.5 : 1 }}>
            {saving ? 'ZAPISYWANIE...' : isNew ? 'DODAJ REZERWACJĘ' : 'ZAPISZ ZMIANY'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
    </>
  );
}