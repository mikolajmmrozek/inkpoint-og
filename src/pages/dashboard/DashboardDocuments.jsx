import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Trash2, X, Pencil, FileText, Eye, Printer, Share2 } from 'lucide-react';

const INSTRUCTION_TYPES = [
  { key: 'aftercare_tattoo', label: 'Pielęgnacja tatuażu' },
  { key: 'aftercare_piercing', label: 'Pielęgnacja piercingu' },
  { key: 'before_tattoo', label: 'Zalecenia przed tatuażem' },
  { key: 'after_piercing', label: 'Zalecenia po piercingu' },
];

export default function DashboardDocuments() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', modalBg: '#FFFFFF', cardBg: 'rgba(255,0,127,0.02)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', modalBg: '#0A0A0A', cardBg: 'rgba(255,0,127,0.02)' };

  const [instructions, setInstructions] = useState([]);
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // View modal
  const [viewDoc, setViewDoc] = useState(null); // { kind: 'instr'|'terms', data, typeKey? }

  // Edit modal
  const [editingInstr, setEditingInstr] = useState(null);
  const [editingTerms, setEditingTerms] = useState(false);
  const [instrForm, setInstrForm] = useState({ type: '', title: '', content: '' });
  const [termsForm, setTermsForm] = useState({ title: '', content: '' });

  useEffect(() => {
    Promise.all([
      base44.entities.Instruction.list(),
      base44.entities.TermsAndConditions.filter({ key: 'default' }),
    ]).then(([i, t_list]) => {
      setInstructions(i);
      setTerms(t_list[0] || null);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveInstr = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const existingRecord = instructions.find(i => i.id === editingInstr);
      if (existingRecord) {
        await base44.entities.Instruction.update(existingRecord.id, instrForm);
      } else {
        await base44.entities.Instruction.create(instrForm);
      }
      const updated = await base44.entities.Instruction.list();
      setInstructions(updated);
      setEditingInstr(null);
      setSaveError(null);
      setInstrForm({ type: '', title: '', content: '' });
      setViewDoc(null);
    } catch (err) {
      setSaveError(err?.message || 'Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstr = async (id) => {
    if (!window.confirm('Usunąć dokument?')) return;
    await base44.entities.Instruction.delete(id);
    setInstructions(i => i.filter(x => x.id !== id));
    setViewDoc(null);
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (terms?.id) {
        await base44.entities.TermsAndConditions.update(terms.id, { ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
        const updated = { ...terms, ...termsForm, last_updated: new Date().toISOString().split('T')[0] };
        setTerms(updated);
      } else {
        const created = await base44.entities.TermsAndConditions.create({ key: 'default', ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
        setTerms(created);
      }
      setEditingTerms(false);
      setSaveError(null);
      setViewDoc(null);
    } catch (err) {
      setSaveError(err?.message || 'Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const mono = { fontFamily: 'JetBrains Mono' };
  const display = { fontFamily: 'Bebas Neue, system-ui', fontWeight: 400 };
  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '10px 0',
    fontSize: '14px',
    color: t.text,
    outline: 'none',
    fontFamily: 'Inter',
    width: '100%',
  };

  const handlePrint = (docData, label) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${label}</title><style>body{font-family:Inter,sans-serif;padding:40px;max-width:800px;margin:0 auto}h1{font-size:28px;margin-bottom:8px}pre{white-space:pre-wrap;font-size:14px;line-height:1.8}</style></head><body><h1>${docData?.title || label}</h1><hr/><pre>${(docData?.content || '').replace(/<[^>]+>/g, '')}</pre></body></html>`);
    w.document.close();
    w.print();
  };

  const handleShare = (docData, label) => {
    const text = `${docData?.title || label}\n\n${(docData?.content || '').replace(/<[^>]+>/g, '')}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Treść dokumentu skopiowana do schowka');
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert('Treść dokumentu skopiowana do schowka');
    });
  };

  // ── Document card ──────────────────────────────────────────────────────
  const DocCard = ({ label, title, content, onView, onEdit, onDelete, onPrint, onShare }) => (
    <div style={{ border: `0.5px solid ${t.border}`, padding: '16px 20px', background: t.cardBg }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={14} style={{ color: content ? t.fuchsia : t.muted, flexShrink: 0 }} />
          <div className="min-w-0">
            <p style={{ ...display, fontSize: '1.1rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>{label}</p>
            {title && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '3px' }}>{title}</p>}
            {!content && <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '3px', letterSpacing: '0.08em' }}>BRAK TREŚCI</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {content && (
            <>
              <button onClick={onView} title="Podgląd" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '6px' }}>
                <Eye size={14} />
              </button>
              <button onClick={onPrint} title="Drukuj PDF" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '6px' }}>
                <Printer size={14} />
              </button>
              <button onClick={onShare} title="Udostępnij" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '6px' }}>
                <Share2 size={14} />
              </button>
            </>
          )}
          <button onClick={onEdit} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fuchsia, padding: '6px' }}>
            <Pencil size={14} />
          </button>
          {onDelete && content && (
            <button onClick={onDelete} title="Usuń" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '6px' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── View modal ─────────────────────────────────────────────────────────
  const ViewModal = () => {
    if (!viewDoc) return null;
    const isInstr = viewDoc.kind === 'instr';
    const docData = isInstr ? viewDoc.data : terms;
    const label = isInstr ? (INSTRUCTION_TYPES.find(x => x.key === viewDoc.typeKey)?.label || 'Dokument') : 'Regulamin Studia';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setViewDoc(null)}>
        <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
            <div>
              <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
                DOKUMENT STUDIA
              </p>
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{label}</h3>
            </div>
            <button onClick={() => setViewDoc(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6 flex-1">
            {docData?.title && (
              <p style={{ ...mono, fontSize: '11px', color: t.fuchsia, letterSpacing: '0.1em', marginBottom: '12px' }}>{docData.title}</p>
            )}
            {docData?.last_updated && (
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginBottom: '16px' }}>
                Ostatnia aktualizacja: {docData.last_updated}
              </p>
            )}
            {docData?.content ? (
              <div
                style={{ color: t.text, fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: docData.content }}
              />
            ) : (
              <p style={{ color: t.muted, fontSize: '13px', fontStyle: 'italic' }}>Brak treści.</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 p-6" style={{ borderTop: `0.5px solid ${t.border}`, flexShrink: 0 }}>
            <button
              onClick={() => {
                if (isInstr) {
                  setInstrForm(docData || { type: viewDoc.typeKey, title: '', content: '' });
                  setEditingInstr(docData?.id || viewDoc.typeKey);
                } else {
                  setTermsForm(terms || { title: '', content: '' });
                  setEditingTerms(true);
                }
                setViewDoc(null);
              }}
              className="flex items-center gap-2 btn-oxblood"
              style={{ padding: '10px 20px' }}
            >
              <Pencil size={12} /> EDYTUJ
            </button>
            <button
              onClick={() => handlePrint(docData, label)}
              className="flex items-center gap-2"
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
            >
              <Printer size={12} /> DRUKUJ
            </button>
            <button
              onClick={() => handleShare(docData, label)}
              className="flex items-center gap-2"
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
            >
              <Share2 size={12} /> UDOSTĘPNIJ
            </button>
            {isInstr && docData?.id && (
              <button
                onClick={() => handleDeleteInstr(docData.id)}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
              >
                <Trash2 size={12} /> USUŃ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <p style={{ ...mono, fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>ZAWARTOŚĆ STUDIA</p>
        <h2 style={{ ...display, fontSize: '2.5rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Dokumenty</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Zalecenia / Instrukcje */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Zalecenia i Instrukcje</h3>
              <button
                onClick={() => { setEditingInstr('new'); setInstrForm({ type: '', title: '', content: '' }); setSaveError(null); }}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}
              >
                <Plus size={12} /> DODAJ NOWY
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INSTRUCTION_TYPES.map(type => {
                const instr = instructions.find(i => i.type === type.key);
                return (
                  <DocCard
                    key={type.key}
                    label={type.label}
                    title={instr?.title}
                    content={instr?.content}
                    onView={() => setViewDoc({ kind: 'instr', data: instr, typeKey: type.key })}
                    onEdit={() => { setInstrForm(instr || { type: type.key, title: '', content: '' }); setEditingInstr(instr?.id || type.key); setSaveError(null); }}
                    onDelete={instr ? () => handleDeleteInstr(instr.id) : null}
                    onPrint={() => handlePrint(instr, type.label)}
                    onShare={() => handleShare(instr, type.label)}
                  />
                );
              })}
            </div>
          </div>

          {/* Regulamin */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
            <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', marginBottom: '16px' }}>Regulamin Studia</h3>
            <DocCard
              label="Regulamin Studia"
              title={terms?.title}
              content={terms?.content}
              onView={() => setViewDoc({ kind: 'terms' })}
              onEdit={() => { setTermsForm(terms || { title: '', content: '' }); setEditingTerms(true); setSaveError(null); }}
              onPrint={() => handlePrint(terms, 'Regulamin Studia')}
              onShare={() => handleShare(terms, 'Regulamin Studia')}
            />
          </div>
        </div>
      )}

      {/* View modal */}
      <ViewModal />

      {/* Modal edycji instrukcji */}
      {editingInstr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => { setEditingInstr(null); setSaveError(null); }}>
          <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6" style={{ borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>
                {editingInstr === 'new' ? 'Nowa instrukcja' : 'Edytuj instrukcję'}
              </h3>
              <button onClick={() => { setEditingInstr(null); setSaveError(null); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-6">
              {editingInstr === 'new' && (
                <div>
                  <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Typ *</label>
                  <select
                    value={instrForm.type}
                    onChange={e => setInstrForm({ ...instrForm, type: e.target.value })}
                    style={{ ...inputStyle, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                  >
                    <option value="">Wybierz typ</option>
                    {INSTRUCTION_TYPES.map(tp => <option key={tp.key} value={tp.key}>{tp.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input type="text" value={instrForm.title} onChange={e => setInstrForm({ ...instrForm, title: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść</label>
                <textarea rows={12} value={instrForm.content} onChange={e => setInstrForm({ ...instrForm, content: e.target.value })} style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }} />
              </div>
            </div>

            <div className="p-6 space-y-3" style={{ borderTop: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              {saveError && <p style={{ ...mono, fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {saveError}</p>}
              <div className="flex gap-4">
                <button onClick={handleSaveInstr} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '12px', opacity: saving ? 0.5 : 1 }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
                <button onClick={() => { setEditingInstr(null); setSaveError(null); }} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji regulaminu */}
      {editingTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => { setEditingTerms(false); setSaveError(null); }}>
          <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6" style={{ borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Edytuj Regulamin</h3>
              <button onClick={() => { setEditingTerms(false); setSaveError(null); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-6">
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input type="text" value={termsForm.title} onChange={e => setTermsForm({ ...termsForm, title: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść (HTML lub tekst)</label>
                <textarea rows={15} value={termsForm.content} onChange={e => setTermsForm({ ...termsForm, content: e.target.value })} style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }} />
              </div>
            </div>

            <div className="p-6 space-y-3" style={{ borderTop: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              {saveError && <p style={{ ...mono, fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {saveError}</p>}
              <div className="flex gap-4">
                <button onClick={handleSaveTerms} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '12px', opacity: saving ? 0.5 : 1 }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
                <button onClick={() => { setEditingTerms(false); setSaveError(null); }} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}