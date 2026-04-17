import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';

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

const DEFAULTS = {
  key: 'hero',
  hero_tagline: 'ROMANS\nTATTOO',
  hero_subtext: 'Studio tatuażu i piercingu w Wolsztynie.\nSztuka trwała — precyzyjna — Twoja.',
  hero_video_url: '',
};

export default function DashboardSettings() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' };

  const [form, setForm] = useState(DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'hero' })
      .then(data => {
        if (data.length > 0) {
          setForm({ ...DEFAULTS, ...data[0] });
          setRecordId(data[0].id);
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (recordId) {
      await base44.entities.SiteSettings.update(recordId, form);
    } else {
      const rec = await base44.entities.SiteSettings.create(form);
      setRecordId(rec.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          STRONA GŁÓWNA
        </p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Ustawienia
        </h2>
      </div>

      <div className="max-w-2xl space-y-10" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '40px' }}>
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
            SEKCJA HERO — WIDEO
          </p>

          {/* Video upload */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
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
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  USUŃ WIDEO
                </button>
              )}
            </div>
            <p className="mt-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Bez wideo wyświetli się gradientowe tło. Zalecane: mp4, krótka pętla 5–15s.
            </p>
          </div>

          {/* Tagline */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Nagłówek (każda linia = nowy wiersz)
            </label>
            <textarea
              rows={3}
              {...inp('hero_tagline')}
              style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none', fontSize: '18px', fontFamily: 'Bebas Neue, system-ui', letterSpacing: '0.05em' }}
              onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
            <p className="mt-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
              Np. "ROMANS\nTATTOO" — ostatnie 3 znaki drugiej linii będą w kolorze fuchsia.
            </p>
          </div>

          {/* Subtext */}
          <div className="mb-8">
            <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Podnagłówek (każda linia = nowy wiersz)
            </label>
            <textarea rows={3} {...inp('hero_subtext')} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none', lineHeight: 1.8 }} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSave} disabled={saving} className="btn-oxblood">
            {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ ZMIANY'}
          </button>
        </div>
      </div>
    </div>
  );
}