import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { FileText, Pencil, X, Upload, Trash2, Download, Check } from 'lucide-react';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';
import { SHOP_DOCS } from '@/lib/shop';

export default function ShopDocumentsSection() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    base44.entities.TermsAndConditions.filter({ key: { $in: SHOP_DOCS.map(d => d.key) } })
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const open = (docKey) => {
    const existing = docs.find(d => d.key === docKey);
    setEditing(docKey);
    setForm(existing
      ? { ...existing }
      : { key: docKey, title: SHOP_DOCS.find(d => d.key === docKey)?.label || '', content: '', file_url: '' });
  };

  const upload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Dodaj plik PDF.'); return; }
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      setForm(f => ({ ...f, file_url: res.file_url }));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        key: form.key,
        title: form.title || SHOP_DOCS.find(d => d.key === form.key)?.label || 'Dokument',
        content: form.content || '',
        file_url: form.file_url || '',
        last_updated: new Date().toISOString().split('T')[0],
      };
      if (form.id) await base44.entities.TermsAndConditions.update(form.id, payload);
      else await base44.entities.TermsAndConditions.create(payload);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const removePdf = async () => {
    if (!form.id) { setForm(f => ({ ...f, file_url: '' })); return; }
    await base44.entities.TermsAndConditions.update(form.id, { file_url: '' });
    setForm(f => ({ ...f, file_url: '' }));
    load();
  };

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius)' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Dokumenty sklepu</h3>
      </div>
      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginBottom: '20px', lineHeight: 1.7 }}>
        Opis dokumentu oraz opcjonalny plik PDF do pobrania. Puste pozycje możesz uzupełnić później.
      </p>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHOP_DOCS.map(item => {
            const doc = docs.find(d => d.key === item.key);
            const filled = doc && (doc.content || doc.file_url);
            return (
              <div key={item.key} style={{ border: `0.5px solid ${t.border}`, padding: '14px 16px', background: t.panel, borderRadius: 'var(--radius)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={13} color={filled ? 'var(--brand)' : t.muted} />
                      <p style={{ ...display, fontSize: '1.05rem', color: t.title, letterSpacing: '0.03em', lineHeight: 1.15 }}>{item.label}</p>
                    </div>
                    <p style={{ ...mono, fontSize: '8px', color: filled ? 'var(--brand)' : t.muted, letterSpacing: '0.1em', marginTop: '6px' }}>
                      {doc?.file_url ? 'PDF DODANY' : 'BRAK PDF'}
                      {doc?.last_updated ? ` · ${doc.last_updated}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc?.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Pobierz PDF" style={{ color: t.muted, padding: '4px' }}><Download size={13} /></a>
                    )}
                    <button onClick={() => open(item.key)} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><Pencil size={13} /></button>
                  </div>
                </div>
                {doc?.content && (
                  <p style={{ fontSize: '11px', color: t.muted, marginTop: '8px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.content}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h3 style={{ ...display, fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em' }}>
                {SHOP_DOCS.find(d => d.key === editing)?.label}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={17} /></button>
            </div>

            <div className="space-y-5">
              <div><label style={labelStyle(t)}>Tytuł</label><input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle(t)} /></div>
              <div><label style={labelStyle(t)}>Opis / treść</label><textarea rows={8} value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Krótki opis dokumentu lub pełna treść (HTML/tekst)" style={{ ...inputStyle(t), resize: 'vertical', border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }} /></div>
              <div>
                <label style={labelStyle(t)}>Plik PDF</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <label style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 14px', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={12} /> {uploading ? 'WYSYŁANIE...' : 'WYBIERZ PDF'}
                    <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} />
                  </label>
                  {form.file_url && (
                    <div className="flex items-center gap-2">
                      <a href={form.file_url} target="_blank" rel="noopener noreferrer" style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.06em' }}>PODGLĄD PDF</a>
                      <button onClick={removePdf} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-7 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={save} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ padding: '11px' }}>
                {saving ? 'ZAPISYWANIE...' : <><Check size={12} /> ZAPISZ</>}
              </button>
              <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}