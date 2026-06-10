import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Trash2, X } from 'lucide-react';

const INSTRUCTION_TYPES = [
  { key: 'aftercare_tattoo', label: 'Pielęgnacja tatuażu' },
  { key: 'aftercare_piercing', label: 'Pielęgnacja piercingu' },
  { key: 'before_tattoo', label: 'Zalecenia przed tatuażem' },
  { key: 'after_piercing', label: 'Zalecenia po piercingu' },
];

export default function DashboardDocuments() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', modalBg: '#0A0A0A' };

  const [instructions, setInstructions] = useState([]);
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
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
      setInstructions(await base44.entities.Instruction.list());
      setEditingInstr(null);
      setInstrForm({ type: '', title: '', content: '' });
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
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (terms?.id) {
        await base44.entities.TermsAndConditions.update(terms.id, { ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
        setTerms({ ...terms, ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
      } else {
        const created = await base44.entities.TermsAndConditions.create({ key: 'default', ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
        setTerms(created);
      }
      setEditingTerms(false);
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
          {/* Zalecenia */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Dokumenty</h3>
              <button onClick={() => { setEditingInstr('new'); setInstrForm({ type: '', title: '', content: '' }); }} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
                <Plus size={12} /> DODAJ
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INSTRUCTION_TYPES.map(type => {
                const instr = instructions.find(i => i.type === type.key);
                return (
                  <div key={type.key} style={{ border: `0.5px solid ${t.border}`, padding: '16px', background: 'rgba(255,0,127,0.02)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p style={{ ...display, fontSize: '1.2rem', color: t.title, letterSpacing: '0.04em' }}>{type.label}</p>
                        {instr?.title && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{instr.title}</p>}
                      </div>
                      {instr && (
                        <button onClick={() => handleDeleteInstr(instr.id)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6, minHeight: '60px', marginBottom: '12px' }}>
                      {instr?.content ? instr.content.substring(0, 120) + (instr.content.length > 120 ? '...' : '') : 'Brak treści'}
                    </p>
                    <button onClick={() => { setEditingInstr(instr?.id || type.key); setInstrForm(instr || { type: type.key, title: '', content: '' }); }} style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>
                      {instr ? 'EDYTUJ' : 'UTWÓRZ'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regulamin */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Regulamin Studia</h3>
              <button onClick={() => { setEditingTerms(true); setTermsForm(terms || { title: '', content: '' }); }} style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
                EDYTUJ
              </button>
            </div>
            <div style={{ border: `0.5px solid ${t.border}`, padding: '16px', background: 'rgba(255,0,127,0.02)' }}>
              <p style={{ ...display, fontSize: '1.2rem', color: t.title, letterSpacing: '0.04em', marginBottom: '8px' }}>
                {terms?.title || 'Regulamin'}
              </p>
              <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>
                {terms?.content ? terms.content.substring(0, 200) + (terms.content.length > 200 ? '...' : '') : 'Brak treści'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji instrukcji */}
      {editingInstr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditingInstr(null)}>
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>
                {editingInstr === 'new' ? 'Nowa instrukcja' : 'Edytuj instrukcję'}
              </h3>
              <button onClick={() => setEditingInstr(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="space-y-6">
              {editingInstr === 'new' && (
                <div>
                  <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Typ *</label>
                  <select
                    value={instrForm.type}
                    onChange={e => setInstrForm({ ...instrForm, type: e.target.value })}
                    style={{ ...inputStyle, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                  >
                    <option value="">Wybierz typ</option>
                    {INSTRUCTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input
                  type="text"
                  value={instrForm.title}
                  onChange={e => setInstrForm({ ...instrForm, title: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść</label>
                <textarea
                  rows={10}
                  value={instrForm.content}
                  onChange={e => setInstrForm({ ...instrForm, content: e.target.value })}
                  style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }}
                />
              </div>

              {saveError && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {saveError}</p>
              )}
              <div className="flex gap-4 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button onClick={handleSaveInstr} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '12px', opacity: saving ? 0.5 : 1 }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
                <button onClick={() => { setEditingInstr(null); setSaveError(null); }} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji regulaminu */}
      {editingTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditingTerms(false)}>
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Edytuj Regulamin</h3>
              <button onClick={() => setEditingTerms(false)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input
                  type="text"
                  value={termsForm.title}
                  onChange={e => setTermsForm({ ...termsForm, title: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść (HTML lub tekst)</label>
                <textarea
                  rows={15}
                  value={termsForm.content}
                  onChange={e => setTermsForm({ ...termsForm, content: e.target.value })}
                  style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }}
                />
              </div>

              {saveError && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>⚠ {saveError}</p>
              )}
              <div className="flex gap-4 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
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