import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import SessionDatePicker from '@/components/booking/SessionDatePicker';
import { Check, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Logowanie', 'Artysta', 'Usługa', 'Szczegóły', 'Termin', 'Potwierdzenie'];

const PLACEHOLDER_ARTISTS = [
  { id: '1', name: 'Aleksandra Wiśniewska', specialty: ['Blackwork', 'Fine Line'] },
  { id: '2', name: 'Marcin Kowalski', specialty: ['Realism', 'Portrait'] },
  { id: '3', name: 'Zuzanna Karpińska', specialty: ['Neo-Traditional', 'Color'] },
];

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid hsl(var(--border))',
  color: 'hsl(var(--foreground))',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

export default function Booking() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedArtistId = urlParams.get('artist_id') || '';
  const preselectedArtistName = urlParams.get('artist_name') || '';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(0);
  const [artists, setArtists] = useState([]);
  const [services, setServices] = useState([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [data, setData] = useState({
    client_first_name: '', client_last_name: '', client_email: '', client_phone: '',
    artist_id: preselectedArtistId, artist_name: preselectedArtistName,
    service_id: '', service_name: '',
    tattoo_description: '', tattoo_placement: '',
    session_date: '', session_time: '',
    notes: '',
    reference_images: [],
  });

  // Check auth
  useEffect(() => {
    base44.auth.me()
      .then(user => {
        if (user) {
          setIsLoggedIn(true);
          setData(d => ({ ...d, client_first_name: user.full_name?.split(' ')[0] || '', client_last_name: user.full_name?.split(' ').slice(1).join(' ') || '', client_email: user.email || '' }));
          setStep(preselectedArtistId ? 2 : 1);
        } else {
          setIsLoggedIn(false);
          setStep(0);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setStep(0);
      })
      .finally(() => setCheckingAuth(false));
  }, [preselectedArtistId]);

  // Load artists & services
  useEffect(() => {
    Promise.all([
      base44.entities.Artist.filter({ is_active: true }).catch(() => PLACEHOLDER_ARTISTS),
      base44.entities.Service.filter({ is_active: true }).catch(() => []),
    ])
      .then(([resArtists, resServices]) => {
        setArtists(resArtists.length > 0 ? resArtists : PLACEHOLDER_ARTISTS);
        setServices(resServices);
      })
      .finally(() => setArtistsLoading(false));
  }, []);

  const update = (key, value) => setData(d => ({ ...d, [key]: value }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = 10 - data.reference_images.length;
    if (files.length > remaining) {
      alert(`Możesz przesłać maksymalnie ${remaining} zdjęć`);
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }).then(res => res.file_url))
      );
      update('reference_images', [...data.reference_images, ...uploadedUrls]);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Błąd przy przesyłaniu zdjęć');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (idx) => {
    update('reference_images', data.reference_images.filter((_, i) => i !== idx));
  };

  const getVisibleServices = () => {
    return services.filter(s => {
      // Empty artist_ids = service for everyone; otherwise must include selected artist.
      if (s.artist_ids?.length > 0 && !s.artist_ids.includes(data.artist_id)) return false;
      if (s.visibility === 'hidden') return false;
      if (s.visibility === 'members_only' && !isLoggedIn) return false;
      // Per-artist hide: if the selected artist is in hidden_from_clients, the client can't book.
      if (s.hidden_from_clients?.includes(data.artist_id)) return false;
      return true;
    });
  };

  const canNext = () => {
    if (step === 0) return !!(data.client_first_name && data.client_last_name && data.client_email);
    if (step === 1) return !!data.artist_id;
    if (step === 2) return !!data.service_id;
    if (step === 3) return !!(data.tattoo_description && data.tattoo_placement);
    if (step === 4) return !!(data.session_date && data.session_time);
    return true;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleNext = () => {
    setStep(s => s + 1);
    setTimeout(scrollToTop, 50);
  };

  const handleBack = () => {
    setStep(s => s - 1);
    setTimeout(scrollToTop, 50);
  };

  const handleSubmit = async () => {
    scrollToTop();
    setSubmitting(true);
    // Sprawdź czy klient nie jest zablokowany (cisza — bez info o blokadzie)
    try {
      const existing = await base44.entities.Client.filter({ email: data.client_email }, '-created_date', 1);
      if (existing[0]?.is_blocked) {
        setSubmitting(false);
        alert('Nie udało się utworzyć rezerwacji. Spróbuj ponownie później.');
        return;
      }
    } catch (e) {}
    const fullName = `${data.client_first_name} ${data.client_last_name}`.trim();
    const bookingData = { ...data, client_name: fullName, status: 'pending', health_form_completed: false, source: 'online_form' };
    delete bookingData.client_first_name;
    delete bookingData.client_last_name;
    try {
      const booking = await base44.entities.Booking.create(bookingData);
      // Confirmation email is sent by the "Potwierdzenie rezerwacji — email" workflow
      // on every booking creation — no need to invoke it inline (would duplicate).
      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      console.error('Booking error:', err);
      alert('Błąd przy tworzeniu rezerwacji');
      setSubmitting(false);
    }
  };

  if (checkingAuth) return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    </PageLayout>
  );

  if (submitted) return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center px-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="text-center max-w-lg">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8" style={{ border: '0.5px solid var(--brand)' }}>
            <Check size={24} color="var(--brand)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
            Przetwarzamy Twoje zgłoszenie
          </h2>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '15px' }}>
            Zgłoszenie wysłane. Otrzymasz od nas potwierdzenie terminu najszybciej jak to możliwe. Skontaktujemy się z Tobą w sprawie szczegółów.
          </p>
          <p className="mt-4 text-sm" style={{ color: 'rgb(var(--foreground-rgb) / 0.3)', fontSize: '13px' }}>
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
          <p className="text-micro text-oxblood mb-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>
            UMÓW SESJĘ
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700, lineHeight: 0.9, color: 'hsl(var(--foreground))' }}>
            Rezerwacja
          </h1>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex items-center gap-0 mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500" style={{ background: i <= step ? 'var(--brand)' : 'hsl(var(--border))' }} />
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px transition-all duration-700" style={{ background: i < step ? 'var(--brand)' : 'hsl(var(--border))', height: '0.5px' }} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between flex-wrap">
            {STEPS.map((s, i) => (
              <p key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: i === step ? 'var(--brand)' : 'rgb(var(--foreground-rgb) / 0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {s}
              </p>
            ))}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>

            {/* Step 0: Login/Guest */}
            {step === 0 && !isLoggedIn && (
              <div className="space-y-8">
                <p style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '15px' }}>
                  {isLoggedIn ? 'Zalogowany' : 'Kontynuuj jako gość lub zaloguj się na konto.'}
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3 px-6 transition-all duration-300"
                    style={{ border: '0.5px solid var(--brand)', background: 'transparent', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Zaloguj się
                  </button>
                  <p style={{ textAlign: 'center', color: 'rgb(var(--foreground-rgb) / 0.3)', fontSize: '12px' }}>LUB KONTYNUUJ JAKO GOŚĆ</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        Imię *
                      </label>
                      <input required style={inputStyle} value={data.client_first_name} onChange={e => update('client_first_name', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                    </div>
                    <div>
                      <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        Nazwisko *
                      </label>
                      <input required style={inputStyle} value={data.client_last_name} onChange={e => update('client_last_name', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        Email *
                      </label>
                      <input required type="email" style={inputStyle} value={data.client_email} onChange={e => update('client_email', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        Telefon
                      </label>
                      <input style={inputStyle} value={data.client_phone} onChange={e => update('client_phone', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Artist selection */}
            {step === 1 && (
              <div className="space-y-4">
                <p style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '15px', marginBottom: '8px' }}>
                  Wybierz artystę.
                </p>
                {artistsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
                  </div>
                ) : artists
                  .filter(a => a.bookable_online !== false)
                  .map(artist => (
                  <button
                    key={artist.id}
                    onClick={() => { update('artist_id', artist.id); update('artist_name', artist.name); }}
                    className="w-full text-left p-6 transition-all duration-300"
                    style={{
                      border: data.artist_id === artist.id ? '0.5px solid var(--brand)' : '0.5px solid hsl(var(--border))',
                      background: data.artist_id === artist.id ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                    }}
                  >
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      {artist.name}
                    </h3>
                    <div className="flex flex-wrap gap-0 mt-2">
                      {(artist.specialty || []).map((s, idx, arr) => (
                        <span key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em' }}>
                          {s}{idx < arr.length - 1 ? <span style={{ color: 'rgb(var(--brand-rgb) /0.35)', margin: '0 5px' }}>/</span> : ''}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Service selection */}
            {step === 2 && (
              <div className="space-y-4">
                <p style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '15px', marginBottom: '8px' }}>
                  Wybierz usługę dla {data.artist_name}.
                </p>
                {getVisibleServices().length === 0 ? (
                  <p style={{ color: 'rgb(var(--foreground-rgb) / 0.3)', fontSize: '14px' }}>
                    Brak dostępnych usług dla tego artysty.
                  </p>
                ) : (
                  getVisibleServices().map(service => (
                    <button
                      key={service.id}
                      onClick={() => { update('service_id', service.id); update('service_name', service.name); }}
                      className="w-full text-left p-6 transition-all duration-300"
                      style={{
                        border: data.service_id === service.id ? '0.5px solid var(--brand)' : '0.5px solid hsl(var(--border))',
                        background: data.service_id === service.id ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                      }}
                    >
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {service.name}
                      </h3>
                      {service.short_description && (
                        <p style={{ fontSize: '13px', color: 'rgb(var(--foreground-rgb) / 0.5)', marginTop: '4px' }}>
                          {service.short_description}
                        </p>
                      )}
                      <div className="flex justify-between mt-3" style={{ fontSize: '12px', color: 'rgb(var(--foreground-rgb) / 0.4)' }}>
                        <span>{service.duration_minutes} min</span>
                        <span>
                          {service.price_type === 'fixed' ? `${service.price_fixed} PLN` : `${service.price_min} - ${service.price_max} PLN`}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Miejsce na ciele *
                  </label>
                  <input required style={inputStyle} value={data.tattoo_placement} onChange={e => update('tattoo_placement', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Opis projektu / pomysłu *
                  </label>
                  <textarea required rows={4} style={{ ...inputStyle, resize: 'none' }} value={data.tattoo_description} onChange={e => update('tattoo_description', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Dodatkowe uwagi
                  </label>
                  <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={data.notes} onChange={e => update('notes', e.target.value)} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--border))'} />
                </div>
                <div>
                  <label className="text-micro block mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Przeslij nam swoje pomysly / inspiracje ({data.reference_images.length}/10)
                  </label>
                  <p style={{ fontSize: '12px', color: 'rgb(var(--foreground-rgb) / 0.3)', marginBottom: '12px' }}>
                    Możesz wysłać miejsce na którym miałby się znaleźć tatuaż, inspiracje, zdjęcia do poprawy lub zakrycia.
                  </p>
                  <label className="flex items-center justify-center py-6 border-dashed" style={{ borderWidth: '1px', borderColor: 'hsl(var(--border))', cursor: data.reference_images.length >= 10 ? 'not-allowed' : 'pointer', opacity: data.reference_images.length >= 10 ? 0.5 : 1 }}>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={data.reference_images.length >= 10 || uploadingImage} style={{ display: 'none' }} />
                    <div className="text-center">
                      <Upload size={20} color="var(--brand)" style={{ marginBottom: '6px', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {uploadingImage ? 'Wczytywanie...' : 'Kliknij aby wybrać zdjęcia'}
                      </span>
                    </div>
                  </label>
                  {data.reference_images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {data.reference_images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt={`ref-${idx}`} className="w-full h-24 object-cover" style={{ border: '0.5px solid hsl(var(--border))' }} />
                          <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity" style={{ border: '0.5px solid var(--brand)' }}>
                            <X size={14} color="var(--brand)" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Termin */}
            {step === 4 && (
              <SessionDatePicker
                artistId={data.artist_id}
                serviceId={data.service_id}
                selectedDate={data.session_date}
                selectedTime={data.session_time}
                onDateChange={val => update('session_date', val)}
                onTimeChange={val => update('session_time', val)}
              />
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div className="space-y-6">
                <p style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '15px', marginBottom: '8px' }}>
                  Sprawdź szczegóły przed wysłaniem.
                </p>
                {[
                  ['Artysta', data.artist_name],
                  ['Usługa', data.service_name],
                  ['Imię i Nazwisko', `${data.client_first_name} ${data.client_last_name}`],
                  ['Email', data.client_email],
                  ['Telefon', data.client_phone || '—'],
                  ['Termin', `${data.session_date} o ${data.session_time}`],
                  ['Miejsce na ciele', data.tattoo_placement],
                  ['Opis', data.tattoo_description],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4 pb-4" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
                    <p className="w-36 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: '2px' }}>
                      {label}
                    </p>
                    <p style={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12 pt-8" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
          {step > 0 ? (
            <button onClick={handleBack} className="btn-ghost-parchment">
              WSTECZ
            </button>
          ) : <div />}

          {step < 5 ? (
            <button onClick={handleNext} disabled={!canNext()} className="btn-oxblood" style={{ opacity: canNext() ? 1 : 0.4 }}>
              DALEJ
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-oxblood animate-pulse-oxblood">
              {submitting ? 'WYSYŁANIE...' : 'WYŚLIJ ZGŁOSZENIE'}
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}