import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2 } from 'lucide-react';
import { money } from '@/lib/shop';

const input = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '7px 0',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  width: '100%',
};

export default function SettlementExtraServices({ value = [], onChange, t, theme }) {
  const [services, setServices] = useState([]);
  const [pick, setPick] = useState('');

  useEffect(() => {
    base44.entities.Service.filter({ is_active: true }, 'order', 200)
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  const add = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    const price = Number(service.price_type === 'fixed' ? service.price_fixed : service.price_min) || 0;
    onChange([...value, {
      service_id: service.id,
      name: service.name,
      category: service.category || '',
      price,
      artist_id: '',
      artist_name: '',
    }]);
    setPick('');
  };

  const update = (index, patch) => onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>USŁUGI DODATKOWE W TEJ SESJI</p>

      <select
        value={pick}
        onChange={(e) => add(e.target.value)}
        style={{ ...input, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark', marginBottom: '10px' }}
      >
        <option value="">+ Dodaj usługę wykonaną w tym czasie</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name}{s.category ? ` · ${s.category}` : ''}</option>
        ))}
      </select>

      {value.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
          Brak usług dodatkowych. Dodana usługa zostaje przy tym samym kliencie i terminie — bez nowej rezerwacji i bez konfliktu w kalendarzu.
        </p>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          {value.map((item, i) => (
            <div key={`${item.service_id}-${i}`} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '12px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                {item.category && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px' }}>{item.category}</p>}
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => update(i, { price: Number(e.target.value) || 0 })}
                style={{ ...input, color: '#16a34a', borderBottomColor: t.border, width: '80px', textAlign: 'right' }}
              />
              <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Usługi dodatkowe razem</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.text, fontWeight: 600 }}>{money(value.reduce((s, x) => s + (Number(x.price) || 0), 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}