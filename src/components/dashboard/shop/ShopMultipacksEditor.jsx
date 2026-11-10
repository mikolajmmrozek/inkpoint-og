import { Plus, Trash2 } from 'lucide-react';
import { shopTheme, mono, inputStyle, labelStyle } from './shopTheme';
import { money, packPrice } from '@/lib/shop';

// Edycja wielosztuk (pakietów): liczba sztuk w pakiecie, nazwa i sposób ceny.
// Pakiety są opcjonalne — pusta lista = produkt sprzedawany tylko pojedynczo.
export default function ShopMultipacksEditor({ theme, packs, onChange, basePrice }) {
  const t = shopTheme(theme);
  const list = Array.isArray(packs) ? packs : [];

  const update = (i, field, value) => onChange(list.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  const addPack = () => onChange([...list, { units: (Number(list[list.length - 1]?.units) || 1) + 1, label: '', pricing: 'percent', price: 0, discount_percent: 10 }]);
  const removePack = (i) => onChange(list.filter((_, idx) => idx !== i));

  const chip = (active) => ({
    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
    color: active ? 'var(--brand)' : t.muted,
    background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
    ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '6px 11px', cursor: 'pointer', borderRadius: 'var(--radius)',
  });

  return (
    <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
      <div className="flex items-center justify-between mb-2">
        <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>WIELOSZTUKI</p>
        <button onClick={addPack} className="flex items-center gap-1.5" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Plus size={11} /> DODAJ PAKIET
        </button>
      </div>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7, marginBottom: '12px' }}>
        Opcjonalne — np. „1 szt.” albo „2 szt. w komplecie”. Pakiet zjada tyle sztuk ze stanu, ile ma w środku.
        Cena pakietu liczona jest od ceny wybranej sztuki (wariantu): procent zniżki albo kwota wpisana ręcznie.
      </p>

      {list.length === 0 && (
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
          Brak wielosztuk — produkt sprzedawany jest tylko pojedynczo.
        </p>
      )}

      <div className="space-y-4">
        {list.map((p, i) => {
          const preview = packPrice(basePrice, p);
          const units = Math.max(1, Number(p.units) || 1);
          return (
            <div key={i} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label style={labelStyle(t)}>Sztuk w pakiecie</label>
                  <input type="number" min="2" value={p.units ?? 2} onChange={e => update(i, 'units', e.target.value)} style={inputStyle(t)} />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label style={labelStyle(t)}>Nazwa dla klienta</label>
                  <input value={p.label || ''} onChange={e => update(i, 'label', e.target.value)} placeholder={`${Number(p.units) || 2} szt. w komplecie`} style={inputStyle(t)} />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => removePack(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '8px 4px' }} title="Usuń pakiet"><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {[{ id: 'percent', label: '% zniżki' }, { id: 'manual', label: 'Kwota ręczna' }].map(m => (
                  <button key={m.id} onClick={() => update(i, 'pricing', m.id)} style={chip((p.pricing || 'percent') === m.id)}>{m.label}</button>
                ))}
                {(p.pricing || 'percent') === 'percent' ? (
                  <div style={{ width: '110px' }}>
                    <input type="number" min="0" max="100" value={p.discount_percent ?? 0} onChange={e => update(i, 'discount_percent', e.target.value)} placeholder="np. 15" style={inputStyle(t)} />
                  </div>
                ) : (
                  <div style={{ width: '130px' }}>
                    <input type="number" min="0" value={p.price ?? 0} onChange={e => update(i, 'price', e.target.value)} placeholder="np. 199" style={inputStyle(t)} />
                  </div>
                )}
                <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
                  CENA PAKIETU: <span style={{ color: t.text }}>{money(preview)}</span>
                  {preview > 0 ? ` (${money(preview / units)} / szt.)` : ''}
                  {basePrice > 0 ? ` · pojedynczo ${money(basePrice)}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}