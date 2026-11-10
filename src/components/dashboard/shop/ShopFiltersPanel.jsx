import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

const GROUPS = [
  {
    id: 'piercing',
    label: 'Przekłucia',
    facets: [
      { id: 'placement', label: 'MIEJSCE PRZEKŁUCIA', hint: 'np. Ucho, Nos, Pępek, Sutki', placeholder: 'np. Ucho' },
      { id: 'type', label: 'RODZAJ PRZEKŁUCIA', hint: 'np. Lobe, Helix, Septum', placeholder: 'np. Lobe' },
    ],
  },
  {
    id: 'clothing',
    label: 'Ubrania',
    facets: [
      { id: 'category', label: 'RODZAJ UBRANIA', hint: 'np. Spodnie, Koszulki, Bluzy, Bluzy z kapturem, Akcesoria', placeholder: 'np. Koszulki' },
    ],
  },
];

export default function ShopFiltersPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState('piercing');
  const [drafts, setDrafts] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteFor, setDeleteFor] = useState(null);

  const load = () => base44.entities.ShopPiercingOption.list('order', 300)
    .then(setOptions)
    .catch(() => setOptions([]))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const groupOf = (o) => (o.filter_group === 'clothing' ? 'clothing' : 'piercing');

  const add = async (facetId) => {
    const name = (drafts[facetId] || '').trim();
    if (!name) { alert('Podaj nazwę.'); return; }
    await base44.entities.ShopPiercingOption.create({ filter_group: group, kind: facetId, name, order: 999, is_active: true });
    setDrafts(d => ({ ...d, [facetId]: '' }));
    load();
  };

  const saveEdit = async (option) => {
    const name = (editValue || '').trim();
    if (!name) { alert('Podaj nazwę.'); return; }
    await base44.entities.ShopPiercingOption.update(option.id, { name });
    setEditingId(null);
    setEditValue('');
    load();
  };

  const toggleActive = async (option) => {
    await base44.entities.ShopPiercingOption.update(option.id, { is_active: option.is_active === false });
    load();
  };

  const remove = async (id) => {
    await base44.entities.ShopPiercingOption.delete(id);
    setDeleteFor(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  const activeGroup = GROUPS.find(g => g.id === group);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {GROUPS.map(g => {
          const active = group === g.id;
          return (
            <button key={g.id} onClick={() => setGroup(g.id)}
              style={{ border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
              {g.label}
            </button>
          );
        })}
      </div>

      <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px' }}>PARAMETRY FILTRÓW — {activeGroup.label.toUpperCase()}</p>
      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.8, marginBottom: '22px' }}>
        Te opcje pojawiają się przy dodawaniu i edycji produktu oraz jako filtry w sklepie — tylko w kategoriach, którym w edycji kategorii ustawisz odpowiednią grupę filtrów.
      </p>

      <div className={`grid grid-cols-1 ${activeGroup.facets.length > 1 ? 'md:grid-cols-2' : ''} gap-6`}>
        {activeGroup.facets.map(facet => {
          const items = options.filter(o => groupOf(o) === group && o.kind === facet.id);
          return (
            <div key={facet.id} className="p-5" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
              <p style={{ ...display, fontSize: '1.25rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>{facet.label}</p>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', marginBottom: '16px' }}>{facet.hint}</p>

              <div className="flex items-end gap-2 mb-5">
                <div className="flex-1">
                  <input
                    value={drafts[facet.id] || ''}
                    onChange={e => setDrafts(d => ({ ...d, [facet.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') add(facet.id); }}
                    placeholder={facet.placeholder}
                    style={inputStyle(t)}
                  />
                </div>
                <button onClick={() => add(facet.id)} className="btn-oxblood flex items-center gap-1.5" style={{ padding: '8px 12px', flexShrink: 0 }}>
                  <Plus size={12} /> DODAJ
                </button>
              </div>

              {items.length === 0 ? (
                <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>BRAK OPCJI</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map(o => {
                    const editing = editingId === o.id;
                    return (
                      <div key={o.id} className="flex items-center gap-2 px-2 py-1.5" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', opacity: o.is_active === false ? 0.55 : 1 }}>
                        {editing ? (
                          <>
                            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(o); }} style={{ ...inputStyle(t), fontSize: '12px' }} />
                            <button onClick={() => saveEdit(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '2px' }}><Check size={13} /></button>
                            <button onClick={() => { setEditingId(null); setEditValue(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '2px' }}><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 truncate" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: t.text }}>{o.name}</span>
                            <button onClick={() => toggleActive(o)} title={o.is_active === false ? 'Włącz' : 'Wyłącz'}
                              style={{ ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${o.is_active === false ? t.border : 'var(--brand)'}`, color: o.is_active === false ? t.muted : 'var(--brand)', padding: '3px 6px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                              {o.is_active === false ? 'OFF' : 'ON'}
                            </button>
                            <button onClick={() => { setEditingId(o.id); setEditValue(o.name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '2px' }}><Pencil size={12} /></button>
                            <button onClick={() => setDeleteFor(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '2px' }}><Trash2 size={12} /></button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteFor}
        title="Usuń opcję"
        message={`Czy na pewno usunąć „${deleteFor?.name}"? Zniknie z filtrów i z edycji produktów.`}
        onConfirm={() => remove(deleteFor.id)}
        onCancel={() => setDeleteFor(null)}
        theme={theme}
      />
    </div>
  );
}