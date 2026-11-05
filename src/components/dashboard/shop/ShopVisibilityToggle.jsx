import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Eye, EyeOff } from 'lucide-react';
import { shopTheme, mono } from './shopTheme';

export default function ShopVisibilityToggle() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ShopSettings.filter({ key: 'default' })
      .then(list => setSettings(list[0] || { key: 'default' }))
      .catch(() => setSettings({ key: 'default' }));
  }, []);

  const visible = settings ? settings.is_visible !== false : true;

  const toggle = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = !visible;
      if (settings.id) {
        await base44.entities.ShopSettings.update(settings.id, { is_visible: next });
        setSettings(s => ({ ...s, is_visible: next }));
      } else {
        const created = await base44.entities.ShopSettings.create({ key: 'default', is_visible: next });
        setSettings(created);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6"
      style={{
        border: `0.5px solid ${visible ? 'rgba(22,163,74,0.45)' : t.border}`,
        background: visible ? 'rgba(22,163,74,0.06)' : t.panel,
        borderRadius: 'var(--radius)',
      }}
    >
      <div className="min-w-0">
        <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '5px' }}>WIDOCZNOŚĆ SKLEPU</p>
        <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.06em', color: visible ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {visible ? <Eye size={12} /> : <EyeOff size={12} />}
          {visible ? 'SKLEP OPUBLIKOWANY' : 'SKLEP UKRYTY'}
        </p>
        <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.05em', marginTop: '5px', lineHeight: 1.7 }}>
          {visible
            ? 'Zakładka Sklep na stronie i koszyk dla zalogowanych klientów są aktywne.'
            : 'Zakładka Sklep i koszyk są ukryte. Historia zamówień i reklamacje pozostają dostępne w panelu klienta.'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving || !settings}
        className={visible ? 'btn-ghost-parchment' : 'btn-oxblood'}
        style={{ padding: '10px 18px', flexShrink: 0 }}
      >
        {saving ? 'ZAPISYWANIE...' : visible ? 'UKRYJ SKLEP' : 'OPUBLIKUJ SKLEP'}
      </button>
    </div>
  );
}