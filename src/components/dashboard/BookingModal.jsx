import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
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
  const isNew = !booking;
  const [artists, setArtists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null); // existing client or null
  const [form, setForm] = useState(booking ? { ...booking } : {
    client_name: '',
    client_first_name: '',
    client_last_name: '',
    client_email: '',
    client_phone: '',
    artist_id: '',
    artist_name: '',
    session_date: defaultDate || '',
    session_time: '',
    session_duration: 2,
    tattoo_description: '',
    tattoo_placement: '',
    notes: '',
    status: 'confirmed',
    deposit_paid: false,
    estimated_price: '',
    health_form_completed: false,
  });

  useEffect(() => {
    base44.entities.Artist.list().then(setArtists).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleArtist = (id) => {
    const a = artists.find(x => x.id === id);
    set('artist_id', id);
    set('artist_name', a?.name || '');
  };

  const handleClientSelect = (client) => {
    if (client._isNew) {
      // New client — prefill name only, user fills in rest
      setSelectedClient(null);
      const [first, ...last] = client.name.split(' ');
      set('client_first_name', first || '');
      set('client_last_name', last.join(' ') || '');
      set('client_email', '');
      set('client_phone', '');
    } else {
      // Existing client — fill all fields
      setSelectedClient(client);
      set('client_first_name', client.first_name || '');
      set('client_last_name', client.last_name || '');
      set('client_email', client.email || '');
      set('client_phone', client.phone || '');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const fullName = `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();
    const data = { ...form, client_name: fullName, estimated_price: form.estimated_price ? Number(form.estimated_price) : undefined };
    delete data.client_first_name;
    delete data.client_last_name;

    if (isNew) {
      await base44.entities.Booking.create(data);
      // Upsert client in Client database
      if (selectedClient?.id) {
        // Existing client — update session count
        await base44.entities.Client.update(selectedClient.id, {
          first_name: form.client_first_name,
          last_name: form.client_last_name,
          name: fullName,
          email: form.client_email,
          phone: form.client_phone,
          total_sessions: (selectedClient.total_sessions || 0) + 1,
        });
      } else if (fullName) {
        // New client — create record
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
              <div className="mt-3 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.05)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF007F', flexShrink: 0 }} />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>
                  ISTNIEJĄCY KLIENT · {selectedClient.total_sessions || 0} POPRZEDNICH SESJI
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
                {label('Godzina')}
                <select
                  value={form.session_time?.split(':')[0] || '00'}
                  onChange={e => set('session_time', `${e.target.value}:${form.session_time?.split(':')[1] || '00'}`)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                {label('Minuty')}
                <select
                  value={form.session_time?.split(':')[1] || '00'}
                  onChange={e => set('session_time', `${form.session_time?.split(':')[0] || '09'}:${e.target.value}`)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                {label('Czas (h)')}
                <select
                  value={Math.floor((form.session_duration || 0) / 60).toString().padStart(2, '0')}
                  onChange={e => set('session_duration', Number(e.target.value) * 60 + (form.session_duration || 0) % 60)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {HOURS_DUR.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                {label('min')}
                <select
                  value={((form.session_duration || 0) % 60).toString().padStart(2, '0')}
                  onChange={e => set('session_duration', Math.floor((form.session_duration || 0) / 60) * 60 + Number(e.target.value))}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>{label('Cena (PLN)')}<input {...inp('estimated_price', 'number')} /></div>
              <div>{label('Status')}
               <select
                 value={form.status || 'pending'}
                  onChange={e => set('status', e.target.value)}
                  style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: t.bg === '#FFFFFF' ? 'light' : 'dark' }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
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
  );
}