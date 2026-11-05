import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, X, Upload, Trash2, Check, Printer, Share2, Pencil } from 'lucide-react';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';
import { SHOP_DOCS } from '@/lib/shop';
import ShopDocumentCard from './ShopDocumentCard';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

const isShopKey = (key) => (key || '').startsWith('shop_');

export default function ShopDocumentsSection() {
  const { theme } = useTheme();
  const t = shopTheme(theme);

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // key dokumentu | 'new'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [viewing, setViewing] = useState(null); // { label, doc }
  const [sharing, setSharing] = useState(null); // { label, doc }
  const [shareEmail, setShareEmail] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = () => base44.entities.TermsAndConditions.list()
    .then(all => setDocs((all || []).filter(d => isShopKey(d.key))))
    .catch(() => {})
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const docOf = (key) => docs.find(d => d.key === key);

  const items = [
    ...SHOP_DOCS.map(d => ({ key: d.key, label: d.label })),
    ...docs
      .filter(d => !SHOP_DOCS.some(s => s.key === d.key))
      .map(d => ({ key: d.key, label: d.title || 'Dokument sklepu' })),
  ];

  const openDoc = (key, label) => {
    const existing = docOf(key);
    setEditing(key);
    setForm(existing ? { ...existing } : { key, title: label || '', content: '', file_url: '' });
  };

  const openNew = () => {
    setEditing('new');
    setForm({ key: '', title: '', content: '', file_url: '' });
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
    if (!form.title?.trim()) { alert('Podaj tytuł dokumentu.'); return; }
    setSaving(true);
    try {
      const payload = {
        key: form.key || `shop_custom_${Date.now()}`,
        title: form.title.trim(),
        content: form.content || '',
        file_url: form.file_url || '',
        last_updated: new Date().toISOString().split('T')[0],
      };
      if (form.id) await base44.entities.TermsAndConditions.update(form.id, payload);
      else await base44.entities.TermsAndConditions.create(payload);
      setEditing(null);
      setViewing(null);
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

  const deleteDoc = async () => {
    if (pendingDelete?.id) {
      await base44.entities.TermsAndConditions.delete(pendingDelete.id);
      setDocs(list => list.filter(d => d.id !== pendingDelete.id));
    }
    setPendingDelete(null);
    setViewing(null);
  };

  const handlePrint = (doc, label) => {
    if (!doc?.content) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${doc.title || label}</title><style>body{font-family:Inter,sans-serif;padding:40px;max-width:800px;margin:0 auto}h1{font-size:26px;margin-bottom:8px}div{white-space:pre-wrap;font-size:14px;line-height:1.8}</style></head><body><h1>${doc.title || label}</h1><hr/><div>${doc.content}</div></body></html>`);
    w.document.close();
    w.print();
  };

  const shareDoc = (doc, label) => {
    setSharing({ doc, label });
    setShareEmail('');
    setShareResult(null);
  };

  const sendShareEmail = async () => {
    if (!shareEmail || !sharing) return;
    setShareSending(true);
    setShareResult(null);
    try {
      const { doc, label } = sharing;
      const plainText = (doc?.content || '').replace(/<[^>]+>/g, '');
      const fileLine = doc?.file_url ? `\n\nPlik PDF: ${doc.file_url}` : '';
      await base44.functions.invoke('sendStudioEmail', {
        to: shareEmail,
        subject: doc?.title || label,
        body: `${doc?.title || label}\n\n${plainText}${fileLine}`,
      });
      setShareResult('ok');
    } catch {
      setShareResult('error');
    } finally {
      setShareSending(false);
    }
  };

  const editingLabel = editing === 'new'
    ? 'Nowy dokument sklepu'
    : (SHOP_DOCS.find(d => d.key === editing)?.label || docOf(editing)?.title || 'Dokument sklepu');

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius)' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Dokumenty sklepu</h3>
        <button
          onClick={openNew}
          className="flex items-center gap-2"
          style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}
        >
          <Plus size={12} /> DODAJ KOLEJNY
        </button>
      </div>
      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginBottom: '20px', lineHeight: 1.7 }}>
        Opis dokumentu oraz opcjonalny plik PDF do pobrania. Puste pozycje możesz uzupełnić później.
      </p>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => {
            const doc = docOf(item.key);
            const label = doc?.title || item.label;
            return (
              <ShopDocumentCard
                key={item.key}
                label={label}
                doc={doc}
                t={t}
                onView={() => setViewing({ label, doc })}
                onPrint={() => handlePrint(doc, label)}
                onShare={() => shareDoc(doc, label)}
                onEdit={() => openDoc(item.key, item.label)}
                onDelete={() => setPendingDelete(doc)}
              />
            );
          })}
        </div>
      )}

      {/* Edycja dokumentu */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h3 style={{ ...display, fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em' }}>{editingLabel}</h3>
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

      {/* Podgląd dokumentu */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', maxHeight: '90vh', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              <div>
                <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>DOKUMENT SKLEPU</p>
                <h3 style={{ ...display, fontSize: '1.7rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{viewing.doc?.title || viewing.label}</h3>
              </div>
              <button onClick={() => setViewing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              {viewing.doc?.last_updated && (
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginBottom: '16px' }}>Ostatnia aktualizacja: {viewing.doc.last_updated}</p>
              )}
              {viewing.doc?.content ? (
                <div style={{ color: t.text, fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: viewing.doc.content }} />
              ) : (
                <p style={{ color: t.muted, fontSize: '13px', fontStyle: 'italic' }}>Brak treści — dostępny jest tylko plik PDF.</p>
              )}
              {viewing.doc?.file_url && (
                <a href={viewing.doc.file_url} target="_blank" rel="noopener noreferrer" style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', display: 'inline-block', marginTop: '18px' }}>OTWÓRZ PLIK PDF</a>
              )}
            </div>
            <div className="flex gap-3 p-6 flex-wrap" style={{ borderTop: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              <button onClick={() => { openDoc(viewing.doc?.key, viewing.label); setViewing(null); }} className="flex items-center gap-2 btn-oxblood" style={{ padding: '10px 20px' }}>
                <Pencil size={12} /> EDYTUJ
              </button>
              <button onClick={() => handlePrint(viewing.doc, viewing.label)} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                <Printer size={12} /> DRUKUJ
              </button>
              <button onClick={() => shareDoc(viewing.doc, viewing.label)} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                <Share2 size={12} /> UDOSTĘPNIJ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Udostępnianie mailem */}
      {sharing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setSharing(null)}>
          <div className="w-full max-w-md flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div>
                <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>WYŚLIJ DOKUMENT</p>
                <h3 style={{ ...display, fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{sharing.label}</h3>
              </div>
              <button onClick={() => setSharing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label style={labelStyle(t)}>Adres e-mail odbiorcy *</label>
                <input type="email" value={shareEmail} onChange={e => { setShareEmail(e.target.value); setShareResult(null); }} placeholder="np. klient@email.pl" style={inputStyle(t)} disabled={shareSending} />
              </div>
              {shareResult === 'ok' && <p style={{ ...mono, fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ Dokument wysłany pomyślnie</p>}
              {shareResult === 'error' && <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ Błąd wysyłki. Sprawdź adres e-mail i spróbuj ponownie.</p>}
              <div className="flex gap-3">
                <button onClick={sendShareEmail} disabled={!shareEmail || shareSending} className="btn-oxblood flex-1" style={{ padding: '12px', opacity: !shareEmail || shareSending ? 0.5 : 1 }}>
                  {shareSending ? 'WYSYŁANIE...' : 'WYŚLIJ MAILEM'}
                </button>
                <button onClick={() => setSharing(null)} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        title="Usuń dokument sklepu"
        message="Czy na pewno chcesz usunąć ten dokument? Tej operacji nie można cofnąć."
        onConfirm={deleteDoc}
        onCancel={() => setPendingDelete(null)}
        theme={theme}
      />
    </div>
  );
}