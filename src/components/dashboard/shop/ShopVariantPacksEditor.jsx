import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { shopTheme, mono } from './shopTheme';
import ShopMultipacksEditor from './ShopMultipacksEditor';
import { money } from '@/lib/shop';

// Wielosztuki per wariant — każdy wariant ma własne pakiety i własną cenę pakietu.
export default function ShopVariantPacksEditor({ theme, variants, onChangeVariantPacks }) {
  const t = shopTheme(theme);
  const [openKey, setOpenKey] = useState(null);
  const list = Array.isArray(variants) ? variants : [];

  return (
    <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
      <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px' }}>WIELOSZTUKI (WARIANTY)</p>
      <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7, marginBottom: '12px' }}>
        Każdy wariant ma własną listę wielosztuk — klient wybierze pakiet dopiero po wybraniu wariantu.
        Cena pakietu liczona jest od ceny tego wariantu. Pusty wariant = sprzedawany tylko pojedynczo.
      </p>

      <div className="space-y-2">
        {list.map(v => {
          const key = v.key;
          const open = openKey === key;
          const packs = Array.isArray(v.multipacks) ? v.multipacks : [];
          const label = (v.options || []).map(o => o.value).join(' / ') || key;
          return (
            <div key={key} style={{ border: `0.5px solid ${open ? 'var(--brand)' : t.border}`, borderRadius: 'var(--radius)' }}>
              <button
                onClick={() => setOpenKey(open ? null : key)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5"
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {open ? <ChevronDown size={12} color="var(--brand)" /> : <ChevronRight size={12} color={t.muted} />}
                  <span style={{ fontSize: '11px', color: open ? 'var(--brand)' : t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </span>
                <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {money(Number(v.price) || 0)} · {packs.length === 0 ? 'bez wielosztuk' : `${packs.length} ${packs.length === 1 ? 'pakiet' : 'pakiety'}`}
                </span>
              </button>
              {open && (
                <div className="px-3 pb-3">
                  <ShopMultipacksEditor
                    theme={theme}
                    packs={packs}
                    onChange={(next) => onChangeVariantPacks(key, next)}
                    basePrice={Number(v.price) || 0}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}