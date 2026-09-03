import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { X } from 'lucide-react';
import ThemeSettings from '@/components/dashboard/ThemeSettings';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  color: '#F5F0EB',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const DEFAULTS = {
  hero: {
    key: 'hero',
    hero_tagline: 'ROMANS\nTATTOO',
    hero_subtext: 'Studio tatuażu i piercingu w Wolsztynie.\nSztuka trwała — precyzyjna — Twoja.',
    hero_video_url: '',
  },
  about: {
    key: 'about',
    about_heading: 'Sztuka, która',
    about_highlight_word: 'POZOSTAJE',
    about_paragraph_1: 'Romans Tattoo to studio tatuażu i piercingu w Wolsztynie, gdzie precyzja spotyka pasję. Nasi artyści łączą doświadczenie z nieustannym dążeniem do perfekcji, tworząc dzieła dopasowane do każdego klienta.',
    about_paragraph_2: 'Każda sesja zaczyna się od rozmowy. Słuchamy, projektujemy, tworzymy.',
    about_image_url: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=85',
    about_stats_number: '4+',
    about_stats_text: 'W WOLSZTYNIE',
  },
  contact: {
    key: 'contact',
    contact_email: 'kontakt@romanstattoo.pl',
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
  },
  branding: {
    key: 'branding',
    site_logo_url: '',
    app_icon_url: '',
    app_description: 'Romans Tattoo — Studio tatuażu i piercingu w Wolsztynie',
  },
};

export default function DashboardSettings() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)' };

  const [activeTab, setActiveTab] = useState('hero');
  const [form, setForm] = useState(DEFAULTS.hero);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadTab = (tabKey) => {
    setActiveTab(tabKey);
    base44.entities.SiteSettings.filter({ key: tabKey })
      .then(data => {
        if (data.length > 0) {
          setForm({ ...DEFAULTS[tabKey], ...data[0] });
          setRecordId(data[0].id);
        } else {
          setForm(DEFAULTS[tabKey]);
          setRecordId(null);
        }
      });
  };

  useEffect(() => {
    loadTab('hero');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = { ...DEFAULTS[activeTab], ...form };
      if (recordId) {
        await base44.entities.SiteSettings.update(recordId, dataToSave);
      } else {
        const rec = await base44.entities.SiteSettings.create(dataToSave);
        setRecordId(rec.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, hero_video_url: file_url }));
    setUploading(false);
  };

  const inp = (field) => ({
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['hero', 'about', 'contact', 'branding', 'theme'].map(tab => (
          <button
            key={tab}
            onClick={() => tab === 'theme' ? setActiveTab('theme') : loadTab(tab)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 16px',
              border: `0.5px solid ${activeTab === tab ? t.fuchsia : t.border}`,
              color: activeTab === tab ? t.fuchsia : t.muted,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {tab === 'hero' ? 'Strona Główna — Hero' : tab === 'about' ? 'Strona Główna — O Studiu' : tab === 'contact' ? 'Strona Kontaktu' : tab === 'branding' ? 'Branding' : 'Motyw i Czcionki'}
          </button>
        ))}
      </div>

      {activeTab === 'theme' ? (
        <ThemeSettings t={t} />
      ) : (
      <div className="max-w-2xl space-y-10" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '40px' }}>
        {activeTab === 'hero' && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
            SEKCJA HERO — WIDEO
          </p>

          {/* Video upload */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Wideo tła (zapętlone)
            </label>
            {form.hero_video_url && (
              <video src={form.hero_video_url} controls className="w-full max-h-40 mb-3" style={{ background: '#000' }} />
            )}
            <div className="flex gap-3 items-center flex-wrap">
              <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                {uploading ? 'PRZESYŁANIE...' : form.hero_video_url ? 'ZMIEŃ WIDEO' : 'DODAJ WIDEO'}
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              </label>
              {form.hero_video_url && (
                <button
                  onClick={() => setForm(f => ({ ...f, hero_video_url: '' }))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  USUŃ WIDEO
                </button>
              )}
            </div>
            <p className="mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Bez wideo wyświetli się gradientowe tło. Zalecane: mp4, krótka pętla 5–15s.
            </p>
          </div>

          {/* Tagline */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Nagłówek (każda linia = nowy wiersz)
            </label>
            <textarea
              rows={3}
              {...inp('hero_tagline')}
              style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none', fontSize: '18px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}
              onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
            <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Np. "ROMANS\nTATTOO" — ostatnie 3 znaki drugiej linii będą w kolorze fuchsia.
            </p>
          </div>

          {/* Subtext */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Podnagłówek (każda linia = nowy wiersz)
            </label>
            <textarea rows={3} {...inp('hero_subtext')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none', lineHeight: 1.8 }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
          </div>
        </div>
        )}

        {activeTab === 'about' && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
            SEKCJA O STUDIU
          </p>

          {/* Heading */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Nagłówek główny
            </label>
            <input {...inp('about_heading')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
          </div>

          {/* Highlight word */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Słowo do wyróżnienia (w kolorze fuchsia)
            </label>
            <input {...inp('about_highlight_word')} style={{ ...inputStyle, color: t.fuchsia, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
          </div>

          {/* Paragraphs */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Pierwszy akapit
            </label>
            <textarea rows={4} {...inp('about_paragraph_1')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
          </div>

          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Drugi akapit
            </label>
            <textarea rows={3} {...inp('about_paragraph_2')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
          </div>

          {/* Image upload */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Zdjęcie sekcji
            </label>
            {form.about_image_url && (
              <img src={form.about_image_url} alt="" className="w-full max-h-40 mb-3 object-cover" style={{ filter: 'brightness(0.6)' }} />
            )}
            <div className="flex gap-3 items-center flex-wrap">
              <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                {uploading ? 'PRZESYŁANIE...' : 'ZMIEŃ ZDJĘCIE'}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploading(true);
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  setForm(f => ({ ...f, about_image_url: file_url }));
                  setUploading(false);
                }} className="hidden" />
              </label>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Liczba w badżu (np. 4+)
              </label>
              <input {...inp('about_stats_number')} style={{ ...inputStyle, color: t.fuchsia, borderBottomColor: t.border, fontSize: '18px' }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Opis badżu (np. W WOLSZTYNIE)
              </label>
              <input {...inp('about_stats_text')} style={{ ...inputStyle, color: t.muted, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>
        </div>
        )}

        {activeTab === 'contact' && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
            DANE KONTAKTOWE
          </p>

          {/* Email */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Email kontaktowy
            </label>
            <input {...inp('contact_email')} type="email" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Będzie używany w formularzach kontaktowych i wiadomościach e-mail
            </p>
          </div>

          {/* Address */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Ulica
              </label>
              <input {...inp('contact_address_street')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Miasto i kod
              </label>
              <input {...inp('contact_address_city')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          {/* Contact info */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Telefon
              </label>
              <input {...inp('contact_phone')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Godziny (każda linia = nowy wiersz)
              </label>
              <textarea rows={2} {...inp('contact_hours')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          {/* Social */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Instagram nazwa
              </label>
              <input {...inp('contact_instagram')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Instagram URL
              </label>
              <input {...inp('contact_instagram_url')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Facebook nazwa
              </label>
              <input {...inp('contact_facebook')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Facebook URL
              </label>
              <input {...inp('contact_facebook_url')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          {/* YouTube */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                YouTube nazwa
              </label>
              <input {...inp('contact_youtube')} placeholder="np. Romans Tattoo" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                YouTube URL
              </label>
              <input {...inp('contact_youtube_url')} placeholder="https://www.youtube.com/@..." style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          {/* TikTok */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                TikTok nazwa
              </label>
              <input {...inp('contact_tiktok')} placeholder="np. @tattoo.romans" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
            <div>
              <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                TikTok URL
              </label>
              <input {...inp('contact_tiktok_url')} placeholder="https://www.tiktok.com/@..." style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            </div>
          </div>

          {/* Google Maps */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Link do wizytówki Google Maps
            </label>
            <input {...inp('contact_google_maps_url')} placeholder="https://www.google.com/maps/place/..." style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            <p className="mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Skopiuj adres URL z wizytówki Google Twojej firmy z google.com/maps
            </p>
          </div>
        </div>
        )}

        {activeTab === 'branding' && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
            BRANDING I WYGLĄD
          </p>

          {/* Logo */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Logo strony
            </label>
            {form.site_logo_url && (
              <img src={form.site_logo_url} alt="Logo" className="max-h-20 mb-3 object-contain" />
            )}
            <div className="flex gap-3 items-center flex-wrap">
              <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                {uploading ? 'PRZESYŁANIE...' : form.site_logo_url ? 'ZMIEŃ LOGO' : 'DODAJ LOGO'}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploading(true);
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  setForm(f => ({ ...f, site_logo_url: file_url }));
                  setUploading(false);
                }} className="hidden" />
              </label>
              {form.site_logo_url && (
                <button
                  onClick={() => setForm(f => ({ ...f, site_logo_url: '' }))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  USUŃ LOGO
                </button>
              )}
            </div>
          </div>

          {/* App Icon */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Ikona aplikacji
            </label>
            {form.app_icon_url && (
              <img src={form.app_icon_url} alt="Ikona" className="w-20 h-20 mb-3 object-contain border border-solid" style={{ borderColor: t.border }} />
            )}
            <div className="flex gap-3 items-center flex-wrap">
              <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                {uploading ? 'PRZESYŁANIE...' : form.app_icon_url ? 'ZMIEŃ IKONĘ' : 'DODAJ IKONĘ'}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploading(true);
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  setForm(f => ({ ...f, app_icon_url: file_url }));
                  setUploading(false);
                }} className="hidden" />
              </label>
              {form.app_icon_url && (
                <button
                  onClick={() => setForm(f => ({ ...f, app_icon_url: '' }))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  USUŃ IKONĘ
                </button>
              )}
            </div>
          </div>

          {/* App Description */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Opis aplikacji
            </label>
            <textarea rows={2} {...inp('app_description')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
            <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Wyświetlany w meta tagach i opisie aplikacji
            </p>
          </div>
        </div>
        )}

        <div className="pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSave} disabled={saving} className="btn-oxblood">
            {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ ZMIANY'}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}