import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, Loader2 } from 'lucide-react';
import BookingFieldsEditor from './BookingFieldsEditor';
import { normalizeBookingFields } from '@/lib/bookingFields';

const CATEGORIES = [
  { key: 'tattoo', label: 'Tattoo' },
  { key: 'piercing', label: 'Piercing' },
  { key: 'studio', label: 'Studio' },
];

export default function CategoryFieldsModal({ open, onClose, t, onSaved }) {
  const [configs, setConfigs] = useState([]);
  const [active, setActive] = useState('tattoo');
  const [fields, setFields] = useState(() => normalizeBookingFields({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.BookingFieldConfig.list()
      .then((list) => {
        setConfigs(list);
        const current = list.find((c) => c.category === active);
        setFields(normalizeBookingFields(current?.fields || {}));
      })
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false));
  }, [open]);

  const switchCategory = (key) => {
    setActive(key);
    const current = configs.find((c) => c.category === key);
    setFields(normalizeBookingFields(current?.fields || {}));
  };

  const save = async () => {
    setSaving(true);
    try {
      const existing = configs.find((c) => c.category === active);
      if (existing?.id) await base44.entities.BookingFieldConfig.update(existing.id, { category: active, fields });
      else await base44.entities.BookingFieldConfig.create({ category: active, fields });
      const list = await base44.entities.BookingFieldConfig.list();
      setConfigs(list);
      onSaved?.(list);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-8"
        style={{ background: t.modalBg || t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' }}>POLA REZERWACJI</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>Ustawienia kategorii</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.8, marginBottom: '16px' }}>
          To ustawienia domyślne dla wszystkich usług w kategorii. Usługa może je nadpisać indywidualnie.
        </p>

        <div className="flex gap-2 mb-5">
          {CATEGORIES.map((c) => {
            const isActive = active === c.key;
            return (
              <button
                key={c.key}
                onClick={() => switchCategory(c.key)}
                style={{
                  border: `0.5px solid ${isActive ? 'var(--brand)' : t.border}`,
                  color: isActive ? 'var(--brand)' : t.muted,
                  background: isActive ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                  fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '7px 12px', cursor: 'pointer', borderRadius: 'var(--radius)',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
        ) : (
          <BookingFieldsEditor value={fields} onChange={setFields} t={t} />
        )}

        <div className="flex gap-3 mt-7 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={save} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ padding: '10px' }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} ZAPISZ KATEGORIĘ
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </div>
    </div>
  );
}