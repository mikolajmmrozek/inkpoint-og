import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Check } from 'lucide-react';
import { shopTheme, mono, inputStyle, labelStyle } from './shopTheme';
import { setShopCurrency, money } from '@/lib/shop';
import { invalidateShopSettings } from '@/hooks/useShopSettings';

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'SEK', 'NOK', 'DKK'];

export default function ShopSettingsPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.ShopSettings.filter({ key: 'default' })
      .then(list => setSettings(list[0] || { key: 'default' }))
      .catch(() => setSettings({ key: 'default' }));
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        key: 'default',
        currency: String(settings.currency || 'PLN').toUpperCase(),
        new_badge_days: Math.max(0, Number(settings.new_badge_days ?? 30) || 0),
        product_note: settings.product_note || '',
        contact_email: settings.contact_email || '',
        is_open: settings.is_open !== false,
      };
      if (settings.id) await base44.entities.ShopSettings.update(settings.id, payload);
      else await base44.entities.ShopSettings.create(payload);
      setShopCurrency(payload.currency);
      invalidateShopSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  return (
    <div className="max-w-lg p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
      <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '18px' }}>USTAWIENIA SKLEPU</p>

      <div className="space-y-5">
        <div>
          <label style={labelStyle(t)}>Waluta sklepu</label>
          <select value={settings.currency || 'PLN'} onChange={e => set('currency', e.target.value)} style={{ ...inputStyle(t), colorScheme: theme === 'light' ? 'light' : 'dark' }}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', lineHeight: 1.7 }}>
            Dotyczy wszystkich cen wpisanych ręcznie w sklepie — produktów, wariantów, wielosztuk i form wysyłki. Przykład: {money(199)}.
          </p>
        </div>

        <div style={{ width: '160px' }}>
          <label style={labelStyle(t)}>Znaczek „Nowość” (dni)</label>
          <input type="number" min="0" value={settings.new_badge_days ?? 30} onChange={e => set('new_badge_days', e.target.value)} style={inputStyle(t)} />
          <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', lineHeight: 1.7 }}>
            Ile dni od dodania produktu pokazywać znaczek. 0 = nigdy.
          </p>
        </div>

        <div>
          <label style={labelStyle(t)}>Informacja ogólna przy produktach</label>
          <textarea rows={3} value={settings.product_note || ''} onChange={e => set('product_note', e.target.value)} placeholder="np. Wysyłka w 3-5 dni roboczych. Pakujemy w kopertę." style={{ ...inputStyle(t), resize: 'vertical', border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }} />
          <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', lineHeight: 1.7 }}>
            Ten sam tekst pokazuje się na karcie każdego produktu.
          </p>
        </div>

        <div><label style={labelStyle(t)}>E-mail kontaktowy sklepu</label><input value={settings.contact_email || ''} onChange={e => set('contact_email', e.target.value)} style={inputStyle(t)} /></div>

        <button onClick={() => set('is_open', settings.is_open === false)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: settings.is_open !== false ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '12px', height: '12px', border: `0.5px solid ${settings.is_open !== false ? '#16a34a' : t.border}`, background: settings.is_open !== false ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{settings.is_open !== false && <Check size={9} color="#fff" />}</span>
          Sklep przyjmuje zamówienia
        </button>

        <button onClick={save} disabled={saving} className="btn-oxblood flex items-center gap-2" style={{ padding: '10px 18px' }}>
          {saved ? <><Check size={12} /> ZAPISANO</> : 'ZAPISZ USTAWIENIA'}
        </button>
      </div>
    </div>
  );
}