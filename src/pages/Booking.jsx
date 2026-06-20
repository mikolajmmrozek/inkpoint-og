import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const STEPS = ['Artysta', 'Szczegóły', 'Termin', 'Potwierdzenie'];

const PLACEHOLDER_ARTISTS = [
  { id: '1', name: 'Aleksandra Wiśniewska', specialty: ['Blackwork', 'Fine Line'] },
  { id: '2', name: 'Marcin Kowalski', specialty: ['Realism', 'Portrait'] },
  { id: '3', name: 'Zuzanna Karpińska', specialty: ['Neo-Traditional', 'Color'] },
];

const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  color: '#F5F0EB',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

export default function Booking() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedArtistId = urlParams.get('artist_id') || '';
  const preselectedArtistName = urlParams.get('artist_name') || '';

  const [step, setStep] = useState(preselectedArtistId ? 1 : 0);
  const [artists, setArtists] = useState(PLACEHOLDER_ARTISTS);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    artist_id: preselectedArtistId, artist_name: preselectedArtistName,
    client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
    tattoo_description: '', tattoo_placement: '',
    session_date: '', session_time: '',
    notes: '',
  });

  useEffect(() => {
    base44.entities.Artist.filter({ is_active: true })
      .then(res => { if (res.length > 0) setArtists(res); })
      .catch(() => {});
  }, []);

  const update = (key, value) => setData(d => ({ ...d, [key]: value }));

  const canNext = () => {
    if (step === 0) return !!data.artist_id;
    if (step === 1) return !!(data.client_first_name && data.client_last_name && data.client_email && data.tattoo_description && data.tattoo_placement);
    if (step === 2) return !!(data.session_date && data.session_time);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const fullName = `${data.client_first_name} ${data.client_last_name}`.trim();
    const bookingData = { ...data, client_name: fullName, status: 'pending', health_form_completed: false };
    delete bookingData.client_first_name;
    delete bookingData.client_last_name;
    const booking = await base44.entities.Booking.create(bookingData);
    // Send confirmation email via backend function (Resend)
    try {
      await base44.functions.invoke('sendBookingConfirmationEmail', { bookingId: booking.id });
    } catch (e) {
      console.warn('Email send failed:', e);
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-lg"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8" style={{ border: '0.5px solid #FF007F' }}>
            <Check size={24} color="#FF007F" />
          </div>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 700, color: '#F5F0EB' }}>
            Rezerwacja potwierdzona
          </h2>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '15px' }}>
            Wysłaliśmy potwierdzenie na adres <strong style={{ color: '#F5F0EB' }}>{data.client_email}</strong>. W mailu znajdziesz link do ankiety zdrowotnej, którą prosimy wypełnić przed sesją.
          </p>
          <p className="mt-4 text-sm" style={{ color: 'rgba(245,240,235,0.3)', fontSize: '13px' }}>
            Sesja: {data.session_date} o {data.session_time} | {data.artist_name}
          </p>
        </motion.div>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout>
      <div className="min-h-screen pt-32 pb-20 px-8 md:px-16 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16">
          <p className="text-micro text-oxblood mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em' }}>
            UMÓW SESJĘ
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700, lineHeight: 0.9, color: '#F5F0EB' }}>
            Rezerwacja
          </h1>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex items-center gap-0 mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${i <= step ? 'bg-oxblood' : 'bg-steel'}`} style={{ background: i <= step ? '#FF007F' : '#262626' }} />
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px transition-all duration-700" style={{ background: i < step ? '#FF007F' : '#262626', height: '0.5px' }} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <p key={s} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: i === step ? '#FF007F' : 'rgba(245,240,235,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {s}
              </p>
            ))}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Step 0: Artysta */}
            {step === 0 && (
              <div className="space-y-4">
                <p className="mb-8" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '15px' }}>
                  Wybierz artystę, z którym chcesz się umówić.
                </p>
                {artists.map(artist => (
                  <button
                    key={artist.id}
                    onClick={() => update('artist_id', artist.id) || update('artist_name', artist.name)}
                    className="w-full text-left p-6 transition-all duration-300"
                    style={{
                      border: data.artist_id === artist.id ? '0.5px solid #FF007F' : '0.5px solid #262626',
                      background: data.artist_id === artist.id ? 'rgba(139,26,26,0.08)' : 'transparent',
                    }}
                    onClick={() => { update('artist_id', artist.id); update('artist_name', artist.name); }}
                  >
                    <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.4rem', fontWeight: 600, color: '#F5F0EB' }}>
                      {artist.name}
                    </h3>
                    <div className="flex flex-wrap gap-0 mt-2">
                      {(artist.specialty || []).map((s, idx, arr) => (
                        <span key={s} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em' }}>
                          {s}{idx < arr.length - 1 ? <span style={{ color: 'rgba(255,0,127,0.35)', margin: '0 5px' }}>/</span> : ''}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: Szczegóły */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Imię *
                    </label>
                    <input required style={inputStyle} value={data.client_first_name} onChange={e => update('client_first_name', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Nazwisko *
                    </label>
                    <input required style={inputStyle} value={data.client_last_name} onChange={e => update('client_last_name', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Email *
                    </label>
                    <input required type="email" style={inputStyle} value={data.client_email} onChange={e => update('client_email', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Telefon
                  </label>
                  <input style={inputStyle} value={data.client_phone} onChange={e => update('client_phone', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Miejsce na ciele *
                  </label>
                  <input required style={inputStyle} value={data.tattoo_placement} onChange={e => update('tattoo_placement', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Opis projektu / pomysłu *
                  </label>
                  <textarea required rows={4} style={{ ...inputStyle, resize: 'none' }} value={data.tattoo_description} onChange={e => update('tattoo_description', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Dodatkowe uwagi
                  </label>
                  <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={data.notes} onChange={e => update('notes', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
              </div>
            )}

            {/* Step 2: Termin */}
            {step === 2 && (
              <div className="space-y-10">
                <div>
                  <label className="text-micro block mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Data sesji *
                  </label>
                  <input
                    type="date"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    value={data.session_date}
                    onChange={e => update('session_date', e.target.value)}
                    onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                    onBlur={e => e.target.style.borderBottomColor = '#262626'}
                  />
                </div>
                <div>
                  <label className="text-micro block mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Godzina *
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        onClick={() => update('session_time', time)}
                        className="py-3 transition-all duration-200"
                        style={{
                          border: data.session_time === time ? '0.5px solid #FF007F' : '0.5px solid #262626',
                          background: data.session_time === time ? 'rgba(139,26,26,0.08)' : 'transparent',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                          color: data.session_time === time ? '#FF007F' : 'rgba(245,240,235,0.5)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Potwierdzenie */}
            {step === 3 && (
              <div className="space-y-6">
                <p className="mb-8" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '15px' }}>
                  Sprawdź szczegóły przed wysłaniem.
                </p>
                {[
                   ['Artysta', data.artist_name],
                   ['Imię i Nazwisko', `${data.client_first_name} ${data.client_last_name}`],
                  ['Email', data.client_email],
                  ['Telefon', data.client_phone || '—'],
                  ['Termin', `${data.session_date} o ${data.session_time}`],
                  ['Miejsce na ciele', data.tattoo_placement],
                  ['Opis', data.tattoo_description],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4 pb-4" style={{ borderBottom: '0.5px solid #262626' }}>
                    <p className="w-36 flex-shrink-0" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: '2px' }}>
                      {label}
                    </p>
                    <p style={{ color: '#F5F0EB', fontSize: '14px' }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12 pt-8" style={{ borderTop: '0.5px solid #262626' }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost-parchment">
              WSTECZ
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="btn-oxblood"
              style={{ opacity: canNext() ? 1 : 0.4 }}
            >
              DALEJ
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-oxblood animate-pulse-oxblood"
            >
              {submitting ? 'WYSYŁANIE...' : 'POTWIERDŹ REZERWACJĘ'}
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}