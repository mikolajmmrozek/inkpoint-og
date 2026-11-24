import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { slugify } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };

// Lista kategorii ofert z dodawaniem i usuwaniem — używana w ustawieniach ofert.
export default function EventCategoriesPanel({ categories, theme, onReload }) {
  const t = theme === 'light'
    ? { border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', field: '#FAFAFA' }
    : { border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', field: 'rgba(255,255,255,0.04)' };

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await base44.entities.EventCategory.create({ name: name.trim(), slug: slugify(name), order: (categories.length + 1) * 10 });
      setName('');
      onReload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Usunąć kategorię „${category.name}”? Wydarzenia pozostaną bez kategorii.`)) return;
    await base44.entities.EventCategory.delete(category.id);
    onReload();
  };

  const input = {
    width: '100%', background: t.field, border: `0.5px solid ${t.border}`, color: t.text,
    padding: '8px 10px', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', borderRadius: 'var(--radius)',
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input style={input} placeholder="Nazwa kategorii" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={add} disabled={busy} className="btn-oxblood" style={{ fontSize: '9px', padding: '8px 12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} DODAJ
        </button>
      </div>

      {error && <p style={{ ...mono, fontSize: '9px', color: '#ef4444', marginBottom: '10px' }}>{error}</p>}

      <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {categories.length === 0 ? (
          <p style={{ ...mono, fontSize: '9px', color: t.muted, padding: '16px' }}>Brak kategorii.</p>
        ) : categories.map((c, i) => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: i === 0 ? 'none' : `0.5px solid ${t.border}` }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: t.text }}>{c.name}</span>
            <button onClick={() => remove(c)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}