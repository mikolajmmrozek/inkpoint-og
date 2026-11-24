import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { slugify } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };

export default function EventCategoriesModal({ categories, theme, onClose, onReload }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', field: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', field: 'rgba(255,255,255,0.04)' };

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
    padding: '8px 10px', fontSize: '13px', outline: 'none', borderRadius: 'var(--radius)',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '24px' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>KATEGORIE</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em', color: t.title, marginTop: '3px' }}>Wydarzenia</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        <div className="flex gap-2 mb-5">
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
      </motion.div>
    </div>
  );
}