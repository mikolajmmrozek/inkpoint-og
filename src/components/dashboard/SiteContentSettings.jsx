import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, Check } from 'lucide-react';

const ITEMS = [
  { field: 'show_blog', label: 'Blog', desc: 'Zakładka Blog w nawigacji i na stronie.' },
  { field: 'show_faq', label: 'FAQ', desc: 'Najczęstsze pytania dostępne ze strony.' },
  { field: 'show_shop', label: 'Sklep', desc: 'Zakładka Sklep i koszyk dla zalogowanych klientów. Historia zamówień i reklamacje w panelu klienta działają zawsze.' },
  { field: 'show_booking', label: 'Rezerwowanie wizyt', desc: 'Formularz rezerwacji online i przyciski „Umów Sesję".' },
];

export default function SiteContentSettings({ t }) {
  const [record, setRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'content' })
      .then(list => setRecord(list[0] || { key: 'content' }))
      .catch(() => setRecord({ key: 'content' }));
  }, []);

  const isOn = (field) => record?.[field] !== false;

  const toggle = (field) => setRecord(r => ({ ...r, [field]: r?.[field] === false }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        key: 'content',
        show_blog: isOn('show_blog'),
        show_faq: isOn('show_faq'),
        show_shop: isOn('show_shop'),
        show_booking: isOn('show_booking'),
      };
      if (record?.id) await base44.entities.SiteSettings.update(record.id, payload);
      else {
        const created = await base44.entities.SiteSettings.create(payload);
        setRecord(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!record) return <div className="flex justify-center py-16"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  return (
    <div className="max-w-2xl" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '32px', borderRadius: 'var(--radius)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
        ZAWARTOŚĆ STRONY
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', lineHeight: 1.8, marginBottom: '22px' }}>
        Odznaczone sekcje znikają z nawigacji i ze strony — możesz je w każdej chwili przywrócić.
      </p>

      {ITEMS.map(item => {
        const on = isOn(item.field);
        return (
          <button
            key={item.field}
            onClick={() => toggle(item.field)}
            className="flex items-start gap-3 w-full text-left py-4"
            style={{ background: 'none', border: 'none', borderTop: `0.5px solid ${t.border}`, cursor: 'pointer' }}
          >
            <span style={{ width: '14px', height: '14px', marginTop: '2px', flexShrink: 0, border: `0.5px solid ${on ? '#16a34a' : t.border}`, background: on ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {on && <Check size={10} color="#fff" />}
            </span>
            <span className="min-w-0">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: on ? t.text : t.muted }}>
                {on ? <Eye size={11} /> : <EyeOff size={11} />} {item.label} — {on ? 'widoczne' : 'ukryte'}
              </span>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.04em', lineHeight: 1.8, marginTop: '5px' }}>
                {item.desc}
              </span>
            </span>
          </button>
        );
      })}

      <div className="pt-5 mt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <button onClick={save} disabled={saving} className="btn-oxblood">
          {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ ZMIANY'}
        </button>
      </div>
    </div>
  );
}