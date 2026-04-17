import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
    borderBottom: '0.5px solid #262626',
    color: '#F5F0EB',
    padding: '12px 0',
    fontSize: '15px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.3s',
  };

  return (
    <PageLayout>
      <div className="pt-40 pb-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em' }}>
            NAPISZ DO NAS
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: 'clamp(4rem, 9vw, 8rem)', fontWeight: 400, lineHeight: 0.9, color: '#F5F0EB', letterSpacing: '0.04em' }}>
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
                <div className="w-8 h-px mb-8" style={{ background: '#FF007F' }} />
                <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em' }}>
                  Wiadomość wysłana
                </h3>
                <p className="mt-4 text-sm" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '14px' }}>
                  Odpiszemy w ciągu 24 godzin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Imię i Nazwisko *
                    </label>
                    <input
                      required
                      style={inputStyle}
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                      onBlur={e => e.target.style.borderBottomColor = '#262626'}
                    />
                  </div>
                  <div>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      style={inputStyle}
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                      onBlur={e => e.target.style.borderBottomColor = '#262626'}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Telefon
                  </label>
                  <input
                    style={inputStyle}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                    onBlur={e => e.target.style.borderBottomColor = '#262626'}
                  />
                </div>

                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Temat
                  </label>
                  <input
                    style={inputStyle}
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                    onBlur={e => e.target.style.borderBottomColor = '#262626'}
                  />
                </div>

                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Wiadomość *
                  </label>
                  <textarea
                    required
                    rows={5}
                    style={{ ...inputStyle, resize: 'none' }}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
                    onBlur={e => e.target.style.borderBottomColor = '#262626'}
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
            <div className="aspect-video overflow-hidden relative" style={{ border: '0.5px solid #262626' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2449.123456789!2d16.1174!3d51.8693!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47062f0d7c5c5c5f%3A0x0!2sul.%20Wschowska%2030%2C%2064-200%20Wolsztyn!5e0!3m2!1spl!2spl!4v1700000000000!5m2!1spl!2spl"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(0.9)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa studia"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-8">
              {[
                { icon: MapPin, label: 'ADRES', value: 'ul. Wschowska 30\n64-200 Wolsztyn', link: null },
                { icon: Phone, label: 'TELEFON', value: '881717880', link: null },
                { icon: Instagram, label: 'INSTAGRAM', value: '@tattoo.romans', link: 'https://www.instagram.com/tattoo.romans' },
                { icon: Facebook, label: 'FACEBOOK', value: 'Romans Tattoo', link: 'https://www.facebook.com/romanstattoo' },
                { icon: Clock, label: 'GODZINY', value: 'Pon–Sob — umów się\nprzez Instagram', link: null },
              ].map(({ icon: Icon, label, value, link }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={12} color="#C4196B" />
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      {label}
                    </p>
                  </div>
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,235,0.6)', fontSize: '13px', lineHeight: 1.7, textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' }}>
                      {value}
                    </a>
                  ) : (
                    <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '13px', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
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