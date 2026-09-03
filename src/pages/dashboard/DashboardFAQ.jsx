import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { useTheme } from './Dashboard';
import { base44 } from '@/api/base44Client';

export default function DashboardFAQ() {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // { id?, question, answer, order }
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // faq item to delete

  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.45)' : 'rgba(245,240,235,0.45)';
  const inputBg = theme === 'light' ? '#F5F5F5' : '#111111';

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: () => base44.entities.FAQ.list('order', 100),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.FAQ.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faq'] }); setShowForm(false); setEditing(null); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FAQ.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faq'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.FAQ.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq'] }),
  });

  const handleSave = () => {
    if (!editing?.question || !editing?.answer) return;
    if (editing.id) {
      updateMut.mutate({ id: editing.id, data: { question: editing.question, answer: editing.answer, order: editing.order ?? 0 } });
    } else {
      createMut.mutate({ question: editing.question, answer: editing.answer, order: faqs.length });
    }
  };

  const openNew = () => {
    setEditing({ question: '', answer: '', order: faqs.length });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing({ ...item });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const inputStyle = { background: inputBg, border: `0.5px solid ${border}`, color: textColor, fontFamily: 'var(--font-body)', fontSize: '14px', padding: '10px 14px', width: '100%', outline: 'none', borderRadius: 'var(--radius)' };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="flex items-center gap-2 btn-oxblood"
          style={{ padding: '8px 16px' }}
        >
          <Plus size={13} /> DODAJ PYTANIE
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg p-8 relative" style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 'var(--radius)' }}>
            <button onClick={closeForm} className="absolute top-4 right-4" style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedColor }}>
              <X size={18} />
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '20px' }}>
              {editing?.id ? 'EDYTUJ PYTANIE' : 'NOWE PYTANIE'}
            </p>

            <div className="space-y-4">
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: mutedColor, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Pytanie</label>
                <input
                  value={editing?.question || ''}
                  onChange={e => setEditing(prev => ({ ...prev, question: e.target.value }))}
                  style={inputStyle}
                  placeholder="Wpisz pytanie..."
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: mutedColor, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Odpowiedź</label>
                <textarea
                  value={editing?.answer || ''}
                  onChange={e => setEditing(prev => ({ ...prev, answer: e.target.value }))}
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Wpisz odpowiedź..."
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: mutedColor, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Kolejność</label>
                <input
                  type="number"
                  value={editing?.order ?? 0}
                  onChange={e => setEditing(prev => ({ ...prev, order: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: '100px' }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="flex items-center gap-2 px-5 py-2"
                style={{ background: 'var(--brand)', color: '#F5F0EB', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', opacity: (createMut.isPending || updateMut.isPending) ? 0.6 : 1 }}
              >
                <Save size={13} /> Zapisz
              </button>
              <button onClick={closeForm} className="px-5 py-2" style={{ background: 'transparent', border: `0.5px solid ${border}`, color: mutedColor, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title="Usuń pytanie"
        message={`Czy na pewno chcesz usunąć pytanie "${deleteConfirm?.question}"?`}
        onConfirm={() => { deleteMut.mutate(deleteConfirm.id); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-20" style={{ border: `0.5px solid ${border}` }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: mutedColor, letterSpacing: '0.1em' }}>BRAK PYTAŃ — DODAJ PIERWSZE</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((item, i) => (
            <div key={item.id} className="flex items-start gap-4 p-5" style={{ border: `0.5px solid ${border}`, background: bg, borderRadius: 'var(--radius)' }}>
              <GripVertical size={14} style={{ color: mutedColor, marginTop: '3px', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: textColor, letterSpacing: '0.04em', fontWeight: 400 }}>{item.question}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: mutedColor, marginTop: '4px', lineHeight: 1.6 }} className="line-clamp-2">{item.answer}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 py-1"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: mutedColor, border: `0.5px solid ${border}`, background: 'transparent', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  Edytuj
                </button>
                <button
                  onClick={() => setDeleteConfirm(item)}
                  className="p-1"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brand)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}