import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, X, Trash2, RefreshCw, Check } from 'lucide-react';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';

export default function ShopShippingEditor({ shippingForm, onClose, onSaved }) {
  const { theme } = useTheme();
  const t = shopTheme(theme);

  const [form, setForm] = useState(() => ({
    name: '',
    info: '',
    cost: 0,
    international: false,
    international_variants: [],
    order: 999,
    is_active: true,
    ...(shippingForm || {}),
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setVariant = (i, field, value) =>
    set('international_variants', (form.international_variants || []).map((v, idx) => idx === i ? { ...v, [field]: value } : v));

  const save = async () => {
    if (!form.name.trim()) { alert('Podaj nazwę formy wysyłki.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        info: form.info || '',
        cost: Math.max(0, Number(form.cost) || 0),
        international: !!form.international,
        international_variants: form.international
          ? (form.international_variants || [])
            .map(v => ({ label: (v.label || '').trim(), cost: Math.max(0, Number(v.cost) || 0) }))
            .filter(v => v.label)
          : [],
        order: Number(form.order) || 999,
        is_active: form.is_active !== false,
      };
      if (shippingForm?.id) await base44.entities.ShippingForm.update(shippingForm.id, payload);
      else await base44.entities.ShippingForm.create(payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '5px' }}>{shippingForm?.id ? 'EDYCJA FORMY' : 'NOWA FORMA WYSYŁKI'}</p>
            <h3 style={{ ...display, fontSize: '1.7rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{form.name || 'Forma wysyłki'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div><label style={labelStyle(t)}>Nazwa *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="np. Paczkomat InPost" style={inputStyle(t)} /></div>
          <div><label style={labelStyle(t)}>Informacja (pakowanie, czas dostawy)</label><input value={form.info || ''} onChange={e => set('info', e.target.value)} placeholder="np. Pakowanie 50 zł · odbiór w studio" style={inputStyle(t)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label style={labelStyle(t)}>Koszt krajowy (PLN)</label><input type="number" value={form.cost ?? 0} onChange={e => set('cost', e.target.value)} style={inputStyle(t)} /></div>
            <div><label style={labelStyle(t)}>Kolejność</label><input type="number" value={form.order ?? 999} onChange={e => set('order', e.target.value)} style={inputStyle(t)} /></div>
          </div>

          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px' }}>
            <button onClick={() => set('international', !form.international)} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.international ? '#16a34a' : t.muted }}>
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.international ? '#16a34a' : t.border}`, background: form.international ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.international && <Check size={9} color="#fff" />}</span>
              Wysyłka zagraniczna
            </button>

            {form.international && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>WARIANTY CENY ZAGRANICZNEJ</p>
                  <button onClick={() => set('international_variants', [...(form.international_variants || []), { label: '', cost: 0 }])} className="flex items-center gap-1.5" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Plus size={11} /> DODAJ STREFĘ
                  </button>
                </div>
                {(form.international_variants || []).length === 0 ? (
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
                    Dodaj strefy i ich ceny, np. „Europa" 60 zł, „Świat" 90 zł. Pojawią się u klienta jako osobne opcje dostawy.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(form.international_variants || []).map((v, i) => (
                      <div key={i} className="flex items-end gap-3">
                        <div className="flex-1"><label style={labelStyle(t)}>Strefa</label><input value={v.label || ''} onChange={e => setVariant(i, 'label', e.target.value)} placeholder="np. Europa" style={inputStyle(t)} /></div>
                        <div style={{ width: '120px' }}><label style={labelStyle(t)}>Koszt (PLN)</label><input type="number" value={v.cost ?? 0} onChange={e => setVariant(i, 'cost', e.target.value)} style={inputStyle(t)} /></div>
                        <button onClick={() => set('international_variants', (form.international_variants || []).filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '10px 4px' }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => set('is_active', !form.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active !== false ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active !== false ? '#16a34a' : t.border}`, background: form.is_active !== false ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_active !== false && <Check size={9} color="#fff" />}</span>
            Forma aktywna
          </button>
        </div>

        <div className="flex gap-3 p-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={save} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ padding: '11px' }}>
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} {saving ? 'ZAPISYWANIE...' : 'ZAPISZ FORMĘ'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </div>
    </div>
  );
}