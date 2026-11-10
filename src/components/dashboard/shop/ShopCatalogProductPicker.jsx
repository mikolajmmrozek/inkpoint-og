import { useState } from 'react';
import { Check } from 'lucide-react';
import { mono, inputStyle } from './shopTheme';

export default function ShopCatalogProductPicker({ products, isMember, onToggle, t }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = q ? products.filter(p => (p.name || '').toLowerCase().includes(q)) : products;

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Szukaj produktu..."
        style={inputStyle(t)}
      />
      <div className="mt-2 max-h-64 overflow-y-auto pr-1">
        {list.length === 0 && (
          <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', padding: '8px 0' }}>BRAK PRODUKTÓW</p>
        )}
        {list.map(p => {
          const active = isMember(p);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p)}
              className="flex items-center gap-2 w-full text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', color: active ? 'var(--brand)' : t.text, fontSize: '12px' }}
            >
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, background: active ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <Check size={9} color="#fff" />}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              {p.is_active === false && (
                <span style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.08em', flexShrink: 0 }}>UKRYTY</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}