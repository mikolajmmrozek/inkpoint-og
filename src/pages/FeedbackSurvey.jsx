import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import PageLayout from '../components/layout/PageLayout';

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
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
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
            <span style={{ color: (hovered || value) >= star ? '#FF007F' : 'rgba(245,240,235,0.2)' }}>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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

export default function FeedbackSurvey() {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking_id');

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [booking, setBooking] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
    base44.entities.FeedbackSurveyConfig.filter({ key: 'default' })
      .then(res => { if (res.length > 0) setConfig({ ...DEFAULT_CONFIG, ...res[0] }); })
      .catch(() => {});

    if (bookingId) {
      base44.entities.Booking.get(bookingId)
        .then(b => {
          setBooking(b);
          setForm(f => ({ ...f, client_name: b.client_name || '', client_email: b.client_email || '' }));
        })
        .catch(() => {});
    }
  }, []);

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
    await base44.entities.Feedback.create({
      ...form,
      booking_id: bookingId || '',
      artist_id: booking?.artist_id || '',
      artist_name: booking?.artist_name || '',
      client_email: form.client_email || booking?.client_email || '',
      is_published: false,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <PageLayout noFooter>
        <div className="min-h-screen flex items-center justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
            <div className="text-5xl mb-8">★★★★★</div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>DZIĘKUJEMY</p>
            <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em' }}>
              {config.thank_you_text}
            </h2>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout noFooter>
      <div className="pt-32 pb-20 px-8 md:px-16 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ANKIETA SATYSFAKCJI
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: 'clamp(3rem, 7vw, 5rem)', fontWeight: 400, lineHeight: 0.9, color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '24px' }}>
            Twoja Opinia
          </h1>
          {booking && (
            <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '14px', marginBottom: '8px' }}>
              Sesja z <span style={{ color: '#FF007F' }}>{booking.artist_name}</span> · {booking.session_date}
            </p>
          )}
          <p style={{ color: 'rgba(245,240,235,0.4)', fontSize: '14px', lineHeight: 1.7, marginBottom: '48px' }}>
            {config.intro_text}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="mb-8">
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Imię *
              </label>
              <input
                required
                style={inputStyle}
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                onBlur={e => e.target.style.borderBottomColor = '#262626'}
              />
            </div>

            <div style={{ height: '0.5px', background: 'rgba(255,0,127,0.2)', margin: '32px 0' }} />

            <StarRating value={form.rating_overall} onChange={v => setForm(f => ({ ...f, rating_overall: v }))} label={config.question_overall + ' *'} />
            <StarRating value={form.rating_artist} onChange={v => setForm(f => ({ ...f, rating_artist: v }))} label={config.question_artist + ' *'} />
            {config.show_rating_studio && <StarRating value={form.rating_studio} onChange={v => setForm(f => ({ ...f, rating_studio: v }))} label={config.question_studio} />}
            {config.show_rating_cleanliness && <StarRating value={form.rating_cleanliness} onChange={v => setForm(f => ({ ...f, rating_cleanliness: v }))} label={config.question_cleanliness} />}
            {config.show_rating_value && <StarRating value={form.rating_value} onChange={v => setForm(f => ({ ...f, rating_value: v }))} label={config.question_value} />}

            <div style={{ height: '0.5px', background: 'rgba(255,0,127,0.2)', margin: '32px 0' }} />

            {/* Short review */}
            <div className="mb-6">
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                {config.question_short_review} *
              </label>
              <textarea
                required
                rows={3}
                maxLength={200}
                style={{ ...inputStyle, resize: 'none' }}
                value={form.short_review}
                onChange={e => setForm(f => ({ ...f, short_review: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                onBlur={e => e.target.style.borderBottomColor = '#262626'}
              />
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', marginTop: '4px' }}>
                {form.short_review.length}/200
              </p>
            </div>

            {/* Full review */}
            <div className="mb-6">
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                {config.question_full_review}
              </label>
              <textarea
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
                value={form.full_review}
                onChange={e => setForm(f => ({ ...f, full_review: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                onBlur={e => e.target.style.borderBottomColor = '#262626'}
              />
            </div>

            {/* Photo upload */}
            {config.show_photo_upload && (
              <div className="mb-8">
                <label style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
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
        </motion.div>
      </div>
    </PageLayout>
  );
}