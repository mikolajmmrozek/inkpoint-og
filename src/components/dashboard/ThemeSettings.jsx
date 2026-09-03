import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useThemeSettings } from '@/lib/ThemeProvider';
import { FONT_PACKAGES, PRESET_COLORS, DEFAULT_THEME } from '@/lib/themeConfig';
import { Sun, Moon, Check, Type, Palette } from 'lucide-react';
import StyleOptionsSection from '@/components/dashboard/StyleOptionsSection';

export default function ThemeSettings({ t }) {
  const { refreshTheme } = useThemeSettings();
  const [form, setForm] = useState(DEFAULT_THEME);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customColor, setCustomColor] = useState('#FF007F');

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'theme' })
      .then(data => {
        if (data.length > 0) {
          const merged = { ...DEFAULT_THEME, ...data[0] };
          setForm(merged);
          setRecordId(data[0].id);
          setCustomColor(merged.primary_color);
        }
      })
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = { key: 'theme', ...form };
      if (recordId) {
        await base44.entities.SiteSettings.update(recordId, dataToSave);
      } else {
        const rec = await base44.entities.SiteSettings.create(dataToSave);
        setRecordId(rec.id);
      }
      refreshTheme();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const label = (text) => (
    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  return (
    <div className="max-w-2xl space-y-10" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '40px' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>
          MOTYW STRONY I PANELU
        </p>

        {/* Site theme: dark/light */}
        <div className="mb-8">
          {label('Motyw strony (jasny / ciemny)')}
          <div className="flex gap-3">
            {[
              { val: 'dark', label: 'Ciemny', icon: Moon },
              { val: 'light', label: 'Jasny', icon: Sun },
            ].map(opt => {
              const Icon = opt.icon;
              const active = form.theme_mode === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => set('theme_mode', opt.val)}
                  className="flex items-center gap-2 px-6 py-3 transition-all"
                  style={{
                    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
                    color: active ? 'var(--brand)' : t.muted,
                    background: active ? 'rgba(var(--brand-rgb), 0.08)' : 'transparent',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>
            Ciemny motyw = jasne czcionki, jasny motyw = ciemne czcionki. Panel i ankiety mają własny przełącznik jasny/ciemny.
          </p>
        </div>

        {/* Primary color */}
        <div className="mb-8">
          {label('Kolor wiodący')}
          <div className="grid grid-cols-6 gap-3 mb-4">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => { set('primary_color', color); setCustomColor(color); }}
                className="flex items-center justify-center transition-all hover:scale-110"
                style={{
                  width: '100%', aspectRatio: '1', background: color,
                  border: form.primary_color.toUpperCase() === color.toUpperCase() ? '2px solid #F5F0EB' : '0.5px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer', borderRadius: '2px',
                }}
                title={color}
              >
                {form.primary_color.toUpperCase() === color.toUpperCase() && <Check size={14} color="#fff" />}
              </button>
            ))}
          </div>

          {/* Custom color picker + hex input */}
          <div className="flex items-center gap-4 flex-wrap">
            <div style={{ position: 'relative' }}>
              <input
                type="color"
                value={customColor}
                onChange={e => { setCustomColor(e.target.value); set('primary_color', e.target.value); }}
                style={{ width: '48px', height: '48px', border: `0.5px solid ${t.border}`, background: 'none', cursor: 'pointer', padding: '2px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>HEX</span>
              <input
                type="text"
                value={form.primary_color}
                onChange={e => {
                  const val = e.target.value;
                  set('primary_color', val);
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) setCustomColor(val);
                }}
                placeholder="#FF007F"
                style={{
                  width: '100px', background: 'transparent', border: `0.5px solid ${t.border}`,
                  padding: '10px 12px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-mono)', outline: 'none', letterSpacing: '0.05em',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = t.border}
              />
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 ml-2">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Podgląd:</span>
              <button className="btn-oxblood" style={{ padding: '8px 18px', fontSize: '9px' }}>PRZYCISK</button>
            </div>
          </div>
        </div>

        {/* Font package */}
        <div>
          {label('Pakiet czcionek (strona + panel)')}
          <div className="space-y-3">
            {Object.entries(FONT_PACKAGES).map(([key, pkg]) => {
              const active = form.font_package === key;
              return (
                <button
                  key={key}
                  onClick={() => set('font_package', key)}
                  className="w-full text-left p-4 transition-all"
                  style={{
                    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
                    background: active ? 'rgba(var(--brand-rgb), 0.05)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Type size={12} color={active ? 'var(--brand)' : t.muted} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: active ? 'var(--brand)' : t.text, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {pkg.label}
                      </span>
                    </div>
                    {active && <Check size={14} color="var(--brand)" />}
                  </div>
                  <p style={{ fontSize: '11px', color: t.muted, marginBottom: '8px' }}>{pkg.description}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: pkg.display, fontSize: '22px', color: t.text, letterSpacing: '0.03em' }}>Nagłówek</span>
                    <span style={{ fontFamily: pkg.body, fontSize: '13px', color: t.muted }}>Tekst główny</span>
                    <span style={{ fontFamily: pkg.mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ETYKIETA</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <StyleOptionsSection form={form} set={set} t={t} />
      </div>

      <div className="pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <button onClick={handleSave} disabled={saving} className="btn-oxblood">
          {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ MOTYW'}
        </button>
      </div>
    </div>
  );
}