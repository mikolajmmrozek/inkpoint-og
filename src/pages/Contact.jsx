import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { MapPin, Phone, Clock, Instagram, Facebook, Youtube } from 'lucide-react';

const TikTokIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
  </svg>
);

const DEFAULTS = {
  contact_address_street: 'ul. Wschowska 30',
  contact_address_city: '64-200 Wolsztyn',
  contact_phone: '881717880',
  contact_hours: 'Pon–Sob — umów się\nprzez Instagram',
  contact_instagram: '@tattoo.romans',
  contact_instagram_url: 'https://www.instagram.com/tattoo.romans',
  contact_facebook: 'Romans Tattoo',
  contact_facebook_url: 'https://www.facebook.com/romanstattoo',
  contact_google_maps_url: '',
  contact_youtube: '',
  contact_youtube_url: '',
  contact_tiktok: '',
  contact_tiktok_url: '',
  };

export default function Contact() {
  const [contactData, setContactData] = useState(DEFAULTS);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'contact' })
      .then(res => {
        if (res.length > 0) {
          setContactData({ ...DEFAULTS, ...res[0] });
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await base44.entities.ContactMessage.create(form);
    setSent(true);
    setSending(false);
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '0.5px solid hsl(var(--input-border))',
    color: 'hsl(var(--foreground))',
    padding: '12px 0',
    fontSize: '15px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    transition: 'border-color 0.3s',
  };

  return (
    <PageLayout>
      <div className="pt-40 pb-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>
            NAPISZ DO NAS
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 9vw, 8rem)', fontWeight: 400, lineHeight: 0.9, color: 'hsl(var(--foreground))', letterSpacing: '0.04em' }}>
            Kontakt
          </h1>
        </motion.div>
      </div>

      <div className="px-8 md:px-16 pb-32">
        <div className="grid lg:grid-cols-2 gap-24">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {sent ? (
              <div className="py-16">
                <div className="w-8 h-px mb-8" style={{ background: 'var(--brand)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.04em' }}>
                  Wiadomość wysłana
                </h3>
                <p className="mt-4 text-sm" style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '14px' }}>
                  Odpiszemy w ciągu 24 godzin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.75)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Imię i Nazwisko *
                    </label>
                    <input
                      required
                      style={inputStyle}
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                      onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--input-border))'}
                    />
                  </div>
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.75)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      style={inputStyle}
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                      onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--input-border))'}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.75)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Telefon
                  </label>
                  <input
                    style={inputStyle}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                    onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--input-border))'}
                  />
                </div>

                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.75)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Temat
                  </label>
                  <input
                    style={inputStyle}
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                    onBlur={e => e.target.style.borderBottomColor = 'hsl(var(--input-border))'}
                  />
                </div>

                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.75)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Wiadomość *
                  </label>
                  <textarea
                    required
                    rows={5}
                    style={{ background: 'rgb(var(--foreground-rgb) / 0.04)', border: '0.5px solid hsl(var(--input-border))', borderRadius: '2px', padding: '12px', color: 'hsl(var(--foreground))', fontSize: '15px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', resize: 'none', transition: 'border-color 0.3s' }}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                    onBlur={e => e.target.style.borderColor = 'hsl(var(--input-border))'}
                  />
                </div>

                <button type="submit" disabled={sending} className="btn-oxblood w-full">
                  {sending ? 'WYSYŁANIE...' : 'WYŚLIJ WIADOMOŚĆ'}
                </button>
              </form>
            )}
          </motion.div>

          {/* Info + Map */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-12"
          >
            {/* Map placeholder */}
            <div className="aspect-video overflow-hidden relative" style={{ border: '0.5px solid hsl(var(--border))' }}>
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2449!2d16.117!3d51.869!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0!2s${encodeURIComponent(contactData.contact_address_street + ', ' + contactData.contact_address_city)}!5e0!3m2!1spl!2spl!4v1700000000000`}
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(0.9) hue-rotate(300deg) saturate(1.2)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa studia"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-8">
              {[
                { icon: MapPin, label: 'ADRES', value: `${contactData.contact_address_street}\n${contactData.contact_address_city}`, link: `https://www.google.com/maps/search/${encodeURIComponent(contactData.contact_address_street + ' ' + contactData.contact_address_city)}` },
                { icon: Phone, label: 'TELEFON', value: contactData.contact_phone, link: null },
                { icon: Instagram, label: 'INSTAGRAM', value: contactData.contact_instagram, link: contactData.contact_instagram_url },
                { icon: Facebook, label: 'FACEBOOK', value: contactData.contact_facebook, link: contactData.contact_facebook_url },
                ...(contactData.contact_youtube_url ? [{ icon: Youtube, label: 'YOUTUBE', value: contactData.contact_youtube || 'YouTube', link: contactData.contact_youtube_url }] : []),
                ...(contactData.contact_tiktok_url ? [{ icon: TikTokIcon, label: 'TIKTOK', value: contactData.contact_tiktok || 'TikTok', link: contactData.contact_tiktok_url }] : []),
                { icon: Clock, label: 'GODZINY', value: contactData.contact_hours, link: null },
              ].map(({ icon: Icon, label, value, link }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={12} color="var(--brand)" />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      {label}
                    </p>
                  </div>
                  {label === 'TELEFON' ? (
                    <a href={`tel:${value}`} style={{ color: 'rgb(var(--foreground-rgb) / 0.6)', fontSize: '13px', lineHeight: 1.7, textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' }}>
                      {value}
                    </a>
                  ) : link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--foreground-rgb) / 0.6)', fontSize: '13px', lineHeight: 1.7, textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' }}>
                      {value}
                    </a>
                  ) : (
                    <p style={{ color: 'rgb(var(--foreground-rgb) / 0.6)', fontSize: '13px', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                      {value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}