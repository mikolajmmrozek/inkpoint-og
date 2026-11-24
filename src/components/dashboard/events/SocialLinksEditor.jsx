import { useState } from 'react';
import { Plus, X } from 'lucide-react';

export const SOCIAL_KINDS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'website', label: 'Strona www' },
];

const label = (key) => SOCIAL_KINDS.find(k => k.key === key)?.label || key;

// Edytor linków social mediów: linki dodajemy z listy, pole na adres pojawia się po wyborze.
export default function SocialLinksEditor({ links, onChange, t, inputStyle, mono }) {
  const [picking, setPicking] = useState(false);
  const available = SOCIAL_KINDS.filter(k => !links.some(l => l.kind === k.key));

  return (
    <div>
      {links.map(link => (
        <div key={link.kind} className="flex items-center gap-2 mb-2">
          <span style={{ ...mono, fontSize: '8px', color: t.muted, width: 74, flexShrink: 0 }}>{label(link.kind)}</span>
          <input
            style={inputStyle}
            placeholder="Wklej link"
            value={link.value}
            onChange={e => onChange(links.map(l => (l.kind === link.kind ? { ...l, value: e.target.value } : l)))}
          />
          <button
            onClick={() => onChange(links.filter(l => l.kind !== link.kind))}
            style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', display: 'flex' }}
          >
            <X size={11} />
          </button>
        </div>
      ))}

      {available.length > 0 && (picking ? (
        <div className="flex flex-wrap gap-2">
          {available.map(kind => (
            <button
              key={kind.key}
              onClick={() => { onChange([...links, { kind: kind.key, value: '' }]); setPicking(false); }}
              style={{ ...mono, fontSize: '8px', padding: '5px 10px', border: `0.5px solid ${t.border}`, color: t.text, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}
            >
              {kind.label}
            </button>
          ))}
          <button
            onClick={() => setPicking(false)}
            style={{ ...mono, fontSize: '8px', padding: '5px 10px', border: 'none', color: t.muted, background: 'transparent', cursor: 'pointer' }}
          >
            Anuluj
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          style={{ ...mono, fontSize: '8px', padding: '5px 10px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: 'var(--radius)' }}
        >
          <Plus size={10} /> Dodaj social media
        </button>
      ))}
    </div>
  );
}