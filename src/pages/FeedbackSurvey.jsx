import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import PageLayout from '../components/layout/PageLayout';
import { LogIn, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

const DEFAULT_CONFIG = {
  intro_text: 'Twoja opinia jest dla nas bardzo ważna. Zajmie to tylko chwilę.',
  thank_you_text: 'Dziękujemy! Twoja opinia wkrótce się pojawi.',
  question_overall: 'Jak oceniasz ogólnie całą wizytę?',
  question_artist: 'Jak oceniasz pracę artysty?',
  question_studio: 'Jak oceniasz atmosferę i obsługę studia?',
  question_cleanliness: 'Jak oceniasz czystość i sterylność?',
  question_value: 'Jak oceniasz stosunek jakości do ceny?',
  question_short_review: 'Napisz krótką opinię (będzie widoczna publicznie)',
  question_full_review: 'Chcesz dodać coś więcej? (opcjonalne)',
  show_rating_studio: true,
  show_rating_cleanliness: true,
  show_rating_value: true,
  show_photo_upload: true,
};

function StarRating({ value, onChange, label }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="mb-6">
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
        {label}
      </p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '28px', transition: 'transform 0.15s', transform: (hovered || value) >= star ? 'scale(1.1)' : 'scale(1)' }}
          >
            <span style={{ color: (hovered || value) >= star ? 'var(--brand)' : 'rgb(var(--foreground-rgb) / 0.25)' }}>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  background: 'rgb(var(--foreground-rgb) / 0.04)',
  border: '0.5px solid hsl(var(--input-border))',
  borderRadius: '2px',
  color: 'hsl(var(--foreground))',
  padding: '12px',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

export default function FeedbackSurvey() {
  const params = new URLSearchParams(window.location.search);
  const bookingIdParam = params.get('booking_id');

  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [booking, setBooking] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [denyReason, setDenyReason] = useState(null);
  const [form, setForm] = useState({
    client_name: '',
    rating_overall: 0,
    rating_artist: 0,
    rating_studio: 0,
    rating_cleanliness: 0,
    rating_value: 0,
    short_review: '',
    full_review: '',
    tattoo_photo_url: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      base44.entities.FeedbackSurveyConfig.filter({ key: 'default' })
        .then(res => { if (mounted && res.length > 0) setConfig({ ...DEFAULT_CONFIG, ...res[0] }); })
        .catch(() => {});

      const ok = await base44.auth.isAuthenticated().catch(() => false);
      if (!ok) { if (mounted) setAuthChecking(false); return; }
      const me = await base44.auth.me().catch(() => null);
      if (!mounted) return;
      setUser(me);
      setAuthChecking(false);

      if (!me?.email) { setLoadingBookings(false); return; }

      try {
        const all = await base44.entities.Booking.filter({ client_email: me.email, status: 'completed' }, '-session_date', 100);
        if (!mounted) return;
        setCompletedBookings(all);
        if (bookingIdParam) {
          const match = all.find(b => b.id === bookingIdParam);
          if (!match) {
            setDenyReason('Ta sesja nie należy do Twojego konta lub nie jest ukończona. Wybierz sesję z listy poniżej.');
            setSelectedBookingId('');
          } else {
            setSelectedBookingId(bookingIdParam);
          }
        }
      } catch (_) {}
      if (mounted) setLoadingBookings(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedBookingId) { setBooking(null); setExistingFeedback(null); return; }
    setLoadingBooking(true);
    setExistingFeedback(null);
    base44.entities.Booking.get(selectedBookingId)
      .then(async (b) => {
        setBooking(b);
        setForm(f => ({ ...f, client_name: b.client_name || user?.full_name || '' }));
        try {
          const existing = await base44.entities.Feedback.filter({ booking_id: selectedBookingId }, '-created_date', 1);
          setExistingFeedback(existing[0] || null);
        } catch (_) {}
      })
      .catch(() => {})
      .finally(() => setLoadingBooking(false));
  }, [selectedBookingId]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, tattoo_photo_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!booking) return;
    await base44.entities.Feedback.create({
      ...form,
      booking_id: booking.id,
      artist_id: booking.artist_id || '',
      artist_name: booking.artist_name || '',
      client_email: user?.email || booking.client_email || '',
      is_published: false,
    });
    setSubmitted(true);
  };

  if (authChecking) {
    return (
      <PageLayout noFooter>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout noFooter>
        <div className="pt-32 pb-20 px-8 max-w-md mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <LogIn size={28} color="var(--brand)" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.04em', marginBottom: '16px' }}>Wymagane logowanie</h1>
            <p style={{ color: 'rgb(var(--foreground-rgb) / 0.65)', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px' }}>
              Aby wystawić opinię, zaloguj się na swoje konto. Opinie zbieramy wyłącznie od zweryfikowanych klientów po ukończonej sesji.
            </p>
            <button
              onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}
              className="btn-oxblood"
              style={{ fontSize: '11px' }}
            >
              ZALOGUJ SIĘ
            </button>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  if (submitted) {
    return (
      <PageLayout noFooter>
        <div className="min-h-screen flex flex-col items-center justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md flex-1 flex items-center justify-center">
            <div>
              <div className="text-5xl mb-8">★★★★★</div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>DZIĘKUJEMY</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 1, letterSpacing: '0.04em' }}>
                {config.thank_you_text}
              </h2>
              <a href="/" style={{ display: 'inline-block', marginTop: '32px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', textDecoration: 'none', padding: '12px 28px', border: '0.5px solid var(--brand)' }} onMouseEnter={e => { e.target.style.background = 'var(--brand)'; e.target.style.color = 'hsl(var(--background))'; }} onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--brand)'; }}>
                POWRÓT NA STRONĘ GŁÓWNĄ
              </a>
            </div>
          </motion.div>
          <div style={{ paddingBottom: '40px', textAlign: 'center' }}>
            <a href="/panel" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.5)', textDecoration: 'none', letterSpacing: '0.08em' }} onMouseEnter={e => e.target.style.color = 'rgb(var(--foreground-rgb) / 0.8)'} onMouseLeave={e => e.target.style.color = 'rgb(var(--foreground-rgb) / 0.5)'}>
              MÓJ PANEL
            </a>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loadingBookings) {
    return (
      <PageLayout noFooter>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
        </div>
      </PageLayout>
    );
  }

  if (completedBookings.length === 0) {
    return (
      <PageLayout noFooter>
        <div className="pt-32 pb-20 px-8 max-w-md mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <AlertCircle size={28} color="var(--brand)" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.04em', marginBottom: '16px' }}>Brak sesji do oceny</h1>
            <p style={{ color: 'rgb(var(--foreground-rgb) / 0.65)', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px' }}>
              Opinie mogą wystawiać wyłącznie zweryfikowani klienci po ukończonej sesji. Nie masz jeszcze ukończonych sesji, które mógłbyś ocenić.
            </p>
            <a href="/panel" className="btn-ghost-parchment" style={{ fontSize: '10px', textDecoration: 'none' }}>MÓJ PANEL</a>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout noFooter>
      <div className="pt-32 pb-20 px-8 md:px-16 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ANKIETA SATYSFAKCJI
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 5rem)', fontWeight: 400, lineHeight: 0.9, color: 'hsl(var(--foreground))', letterSpacing: '0.04em', marginBottom: '16px' }}>
            Twoja Opinia
          </h1>

          <div className="mb-6 flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(22,163,74,0.08)', border: '0.5px solid rgba(22,163,74,0.35)' }}>
            <ShieldCheck size={13} color="#16a34a" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Zweryfikowany klient</p>
          </div>

          <p style={{ color: 'rgb(var(--foreground-rgb) / 0.65)', fontSize: '14px', lineHeight: 1.7, marginBottom: '32px' }}>
            {config.intro_text}
          </p>

          {/* Session selector */}
          <div className="mb-8">
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Wybierz sesję do oceny *
            </label>
            <select
              value={selectedBookingId}
              onChange={e => setSelectedBookingId(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' }}
            >
              <option value="">— wybierz sesję —</option>
              {completedBookings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.session_date} · {b.artist_name}{b.service_name ? ` · ${b.service_name}` : ''}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
                </option>
              ))}
            </select>
            {denyReason && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', marginTop: '8px', letterSpacing: '0.06em' }}>⚠ {denyReason}</p>
            )}
          </div>

          {selectedBookingId && loadingBooking && (
            <div className="mb-8"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
          )}

          {selectedBookingId && booking && existingFeedback && (
            <div className="mb-8 px-4 py-4" style={{ border: '0.5px solid rgba(22,163,74,0.4)', background: 'rgba(22,163,74,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} color="#16a34a" />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Opinia już wystawiona</p>
              </div>
              <p style={{ color: 'hsl(var(--foreground))', fontSize: '14px', lineHeight: 1.6 }}>"{existingFeedback.short_review}"</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.5)', marginTop: '6px' }}>
                Ocena ogólna: {existingFeedback.rating_overall}★ · {new Date(existingFeedback.created_date).toLocaleDateString('pl-PL')}
              </p>
            </div>
          )}

          {selectedBookingId && booking && !existingFeedback && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div style={{ height: '0.5px', background: 'rgb(var(--brand-rgb) /0.2)', margin: '8px 0 32px' }} />

              {/* Session summary */}
              <div className="mb-6 px-3 py-2" style={{ border: '0.5px solid hsl(var(--input-border))', background: 'rgb(var(--foreground-rgb) / 0.03)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Ocenasz sesję</p>
                <p style={{ color: 'hsl(var(--foreground))', fontSize: '14px' }}>
                  {booking.session_date} · <span style={{ color: 'var(--brand)' }}>{booking.artist_name}</span>{booking.service_name ? ` · ${booking.service_name}` : ''}{booking.tattoo_placement ? ` · ${booking.tattoo_placement}` : ''}
                </p>
              </div>

              {/* Name */}
              <div className="mb-8">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Imię *
                </label>
                <input
                  required
                  style={inputStyle}
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                />
              </div>

              <div style={{ height: '0.5px', background: 'rgb(var(--brand-rgb) /0.2)', margin: '32px 0' }} />

              <StarRating value={form.rating_overall} onChange={v => setForm(f => ({ ...f, rating_overall: v }))} label={config.question_overall + ' *'} />
              <StarRating value={form.rating_artist} onChange={v => setForm(f => ({ ...f, rating_artist: v }))} label={config.question_artist + ' *'} />
              {config.show_rating_studio && <StarRating value={form.rating_studio} onChange={v => setForm(f => ({ ...f, rating_studio: v }))} label={config.question_studio} />}
              {config.show_rating_cleanliness && <StarRating value={form.rating_cleanliness} onChange={v => setForm(f => ({ ...f, rating_cleanliness: v }))} label={config.question_cleanliness} />}
              {config.show_rating_value && <StarRating value={form.rating_value} onChange={v => setForm(f => ({ ...f, rating_value: v }))} label={config.question_value} />}

              <div style={{ height: '0.5px', background: 'rgb(var(--brand-rgb) /0.2)', margin: '32px 0' }} />

              {/* Short review */}
              <div className="mb-6">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  {config.question_short_review} *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={200}
                  style={{ ...inputStyle, resize: 'none' }}
                  value={form.short_review}
                  onChange={e => setForm(f => ({ ...f, short_review: e.target.value }))}
                />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.5)', marginTop: '4px' }}>
                  {form.short_review.length}/200
                </p>
              </div>

              {/* Full review */}
              <div className="mb-6">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  {config.question_full_review}
                </label>
                <textarea
                  rows={4}
                  style={{ ...inputStyle, resize: 'none' }}
                  value={form.full_review}
                  onChange={e => setForm(f => ({ ...f, full_review: e.target.value }))}
                />
              </div>

              {/* Photo upload */}
              {config.show_photo_upload && (
                <div className="mb-8">
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.65)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                    Zdjęcie tatuażu / piercingu (opcjonalne)
                  </label>
                  {form.tattoo_photo_url && (
                    <img src={form.tattoo_photo_url} alt="" className="w-32 h-32 object-cover mb-4" style={{ filter: 'brightness(0.8)' }} />
                  )}
                  <label className="btn-ghost-parchment inline-block cursor-pointer" style={{ fontSize: '10px', padding: '8px 16px' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'DODAJ ZDJĘCIE'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={!form.rating_overall || !form.rating_artist || !form.short_review}
                className="btn-oxblood w-full"
                style={{ opacity: (!form.rating_overall || !form.rating_artist || !form.short_review) ? 0.5 : 1 }}
              >
                WYŚLIJ OPINIĘ
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </PageLayout>
  );
}