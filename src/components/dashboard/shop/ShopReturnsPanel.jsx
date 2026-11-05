import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { RotateCcw, X, Check } from 'lucide-react';
import { RETURN_STATUS, formatDate } from '@/lib/shop';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';

const STATUSES = ['requested', 'approved', 'rejected', 'received', 'refunded'];

export default function ShopReturnsPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const load = () => base44.entities.ShopReturn.list('-created_date', 200).then(setReturns).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const open = (r) => { setSelected(r); setNote(r.admin_note || ''); };

  const update = async (patch) => {
    const updated = await base44.entities.ShopReturn.update(selected.id, patch);
    setSelected({ ...selected, ...updated });
    load();
  };

  const saveNote = async () => {
    const updated = await base44.entities.ShopReturn.update(selected.id, { admin_note: note });
    setSelected({ ...selected, ...updated });
    load();
  };

  const filtered = filter ? returns.filter(r => r.status === filter) : returns;

  const Badge = ({ info }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: info.color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: info.color }} />{info.label}
    </span>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter('')} style={{ border: `0.5px solid ${filter === '' ? 'var(--brand)' : t.border}`, color: filter === '' ? 'var(--brand)' : t.muted, background: filter === '' ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 13px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>WSZYSTKIE</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ border: `0.5px solid ${filter === s ? 'var(--brand)' : t.border}`, color: filter === s ? 'var(--brand)' : t.muted, background: filter === s ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 13px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
            {RETURN_STATUS[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <RotateCcw size={26} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ZGŁOSZEŃ</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {filtered.map((r, i) => (
            <button key={r.id} onClick={() => open(r)} className="w-full text-left grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 items-center"
              style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="col-span-2 md:col-span-3">
                <p style={{ ...mono, fontSize: '11px', color: t.title, letterSpacing: '0.06em' }}>{r.order_number || '—'}</p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{formatDate(r.created_date)}</p>
              </div>
              <div className="col-span-1 md:col-span-3">
                <p style={{ fontSize: '12px', color: t.text }}>{r.client_name || r.user_email}</p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted }}>{r.kind === 'complaint' ? 'REKLAMACJA' : 'ZWROT'}</p>
              </div>
              <div className="col-span-1 md:col-span-4">
                <p style={{ fontSize: '11px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</p>
              </div>
              <div className="col-span-2 md:col-span-2 flex md:justify-end">
                <Badge info={RETURN_STATUS[r.status] || RETURN_STATUS.requested} />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '5px' }}>{selected.kind === 'complaint' ? 'REKLAMACJA' : 'ZWROT'}</p>
                <h3 style={{ ...display, fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em' }}>{selected.order_number}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
            </div>

            <div className="space-y-5">
              <p style={{ ...mono, fontSize: '9px', color: t.muted }}>{selected.client_name} · {selected.user_email} · {formatDate(selected.created_date)}</p>

              <div>
                <p style={{ ...labelStyle(t) }}>POZYCJE</p>
                <div className="space-y-1">
                  {(selected.items || []).map((i, idx) => (
                    <p key={idx} style={{ fontSize: '12px', color: t.text }}>{i.product_name} · {i.variant_label} · {i.quantity} szt.</p>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ ...labelStyle(t) }}>POWÓD</p>
                <p style={{ fontSize: '12px', color: t.text, lineHeight: 1.6 }}>{selected.reason}</p>
              </div>

              <div>
                <p style={{ ...labelStyle(t) }}>ZMIEŃ STATUS</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter(s => s !== selected.status).map(s => (
                    <button key={s} onClick={() => update({ status: s })} style={{ border: `0.5px solid ${RETURN_STATUS[s].color}`, color: RETURN_STATUS[s].color, background: 'transparent', ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                      {RETURN_STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ ...labelStyle(t) }}>NOTATKA</p>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle(t), resize: 'vertical', border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }} />
                <button onClick={saveNote} className="btn-oxblood mt-3 flex items-center gap-2" style={{ fontSize: '9px', padding: '9px 16px' }}><Check size={11} /> ZAPISZ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}