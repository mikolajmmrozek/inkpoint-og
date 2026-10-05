import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Trash2, X, Pencil, FileText, Eye, Printer, Share2, Globe } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

const LANG_OPTIONS = [
  { code: 'pl', label: '🇵🇱 Polski' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'uk', label: '🇺🇦 Українська' },
];

const INSTRUCTION_TYPES = [
  { key: 'aftercare_tattoo', label: 'Pielęgnacja tatuażu' },
  { key: 'aftercare_piercing', label: 'Pielęgnacja piercingu' },
  { key: 'before_tattoo', label: 'Przygotowanie do tatuażu' },
  { key: 'before_piercing', label: 'Przygotowanie do piercingu' },
  { key: 'after_piercing', label: 'Zalecenia po piercingu' },
];

export default function DashboardDocuments() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', modalBg: '#FFFFFF', cardBg: 'rgb(var(--brand-rgb) /0.02)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', modalBg: '#0A0A0A', cardBg: 'rgb(var(--brand-rgb) /0.02)' };

  const [instructions, setInstructions] = useState([]);
  const [terms, setTerms] = useState(null);
  const [cookiesPolicy, setCookiesPolicy] = useState(null);
  const [privacyPolicy, setPrivacyPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // View modal
  const [viewDoc, setViewDoc] = useState(null); // { kind: 'instr'|'terms', data, typeKey? }
  const [viewLang, setViewLang] = useState('pl');
  const [translating, setTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState(null); // { title, content } | null

  // Share modal
  const [shareDoc, setShareDoc] = useState(null); // { docData, label }
  const [shareEmail, setShareEmail] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [shareResult, setShareResult] = useState(null); // 'ok' | 'error'

  // Delete confirm
  const [deleteConfirmInstr, setDeleteConfirmInstr] = useState(null); // instruction id to delete
  const [deleteConfirmTerms, setDeleteConfirmTerms] = useState(false);
  const [deleteConfirmLegal, setDeleteConfirmLegal] = useState(null); // 'cookies' | 'privacy'

  // Edit modal
  const [editingInstr, setEditingInstr] = useState(null);
  const [editingTerms, setEditingTerms] = useState(false);
  const [editingLegal, setEditingLegal] = useState(null); // null | 'cookies' | 'privacy'
  const [instrForm, setInstrForm] = useState({ type: '', title: '', content: '' });
  const [termsForm, setTermsForm] = useState({ title: '', content: '' });
  const [legalForm, setLegalForm] = useState({ title: '', content: '' });

  useEffect(() => {
    Promise.all([
      base44.entities.Instruction.list(),
      base44.entities.TermsAndConditions.filter({ key: 'default' }),
      base44.entities.TermsAndConditions.filter({ key: 'cookies_policy' }),
      base44.entities.TermsAndConditions.filter({ key: 'privacy_policy' }),
    ]).then(([i, t_list, c_list, p_list]) => {
      setInstructions(i);
      setTerms(t_list[0] || null);
      setCookiesPolicy(c_list[0] || null);
      setPrivacyPolicy(p_list[0] || null);
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
    await base44.entities.Instruction.delete(id);
    setInstructions(i => i.filter(x => x.id !== id));
    setDeleteConfirmInstr(null);
    setViewDoc(null);
  };

  const handleDeleteTerms = async () => {
    if (terms?.id) {
      await base44.entities.TermsAndConditions.delete(terms.id);
      setTerms(null);
    }
    setDeleteConfirmTerms(false);
    setViewDoc(null);
  };

  const handleDeleteLegal = async () => {
    const existing = deleteConfirmLegal === 'cookies' ? cookiesPolicy : privacyPolicy;
    if (existing?.id) {
      await base44.entities.TermsAndConditions.delete(existing.id);
      if (deleteConfirmLegal === 'cookies') setCookiesPolicy(null); else setPrivacyPolicy(null);
    }
    setDeleteConfirmLegal(null);
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

  const handleSaveLegal = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const existing = editingLegal === 'cookies' ? cookiesPolicy : privacyPolicy;
      const key = editingLegal === 'cookies' ? 'cookies_policy' : 'privacy_policy';
      if (existing?.id) {
        await base44.entities.TermsAndConditions.update(existing.id, { ...legalForm, last_updated: new Date().toISOString().split('T')[0] });
        const updated = { ...existing, ...legalForm, last_updated: new Date().toISOString().split('T')[0] };
        if (editingLegal === 'cookies') setCookiesPolicy(updated); else setPrivacyPolicy(updated);
      } else {
        const created = await base44.entities.TermsAndConditions.create({ key, ...legalForm, last_updated: new Date().toISOString().split('T')[0] });
        if (editingLegal === 'cookies') setCookiesPolicy(created); else setPrivacyPolicy(created);
      }
      setEditingLegal(null);
      setSaveError(null);
      setViewDoc(null);
    } catch (err) {
      setSaveError(err?.message || 'Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '10px 0',
    fontSize: '14px',
    color: t.text,
    outline: 'none',
    fontFamily: 'var(--font-body)',
    width: '100%',
  };

  const translateDoc = async (docData, kind, lang) => {
    if (lang === 'pl') { setTranslatedContent(null); return; }
    if (!docData?.id) return;
    setTranslating(true);
    try {
      const res = await base44.functions.invoke('translateDocument', {
        entity_type: kind === 'terms' ? 'terms' : 'instruction',
        entity_id: docData.id,
        target_lang: lang,
      });
      setTranslatedContent(res.data);
    } finally {
      setTranslating(false);
    }
  };

  const handlePrint = (docData, label, translated) => {
    const d = translated || docData;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${d?.title || label}</title><style>body{font-family:Inter,sans-serif;padding:40px;max-width:800px;margin:0 auto}h1{font-size:28px;margin-bottom:8px}pre{white-space:pre-wrap;font-size:14px;line-height:1.8}</style></head><body><h1>${d?.title || label}</h1><hr/><div style="font-size:14px;line-height:1.8">${d?.content || ''}</div></body></html>`);
    w.document.close();
    w.print();
  };

  const handleShare = (docData, label) => {
    // Use translated content if available in view modal, otherwise original
    setShareDoc({ docData, label });
    setShareEmail('');
    setShareResult(null);
  };

  const openViewDoc = (doc) => {
    setViewDoc(doc);
    setViewLang('pl');
    setTranslatedContent(null);
  };

  const handleSendShareEmail = async () => {
    if (!shareEmail) return;
    setShareSending(true);
    setShareResult(null);
    try {
      const { docData, label } = shareDoc;
      const plainText = (docData?.content || '').replace(/<[^>]+>/g, '');
      await base44.functions.invoke('sendEmailViaResend', {
        to: shareEmail,
        subject: docData?.title || label,
        body: `${docData?.title || label}\n\n${plainText}`,
      });
      setShareResult('ok');
    } catch {
      setShareResult('error');
    } finally {
      setShareSending(false);
    }
  };

  // ── Document card ──────────────────────────────────────────────────────
  const DocCard = ({ label, title, content, onView, onEdit, onDelete, onPrint, onShare }) => (
    <div style={{ border: `0.5px solid ${t.border}`, padding: '16px 20px', background: t.cardBg, borderRadius: 'var(--radius)' }}>
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
          <button onClick={onView} disabled={!content} title="Podgląd" style={{ background: 'none', border: 'none', cursor: content ? 'pointer' : 'default', color: t.muted, padding: '6px', opacity: content ? 1 : 0.3 }}>
            <Eye size={14} />
          </button>
          <button onClick={onPrint} disabled={!content} title="Drukuj PDF" style={{ background: 'none', border: 'none', cursor: content ? 'pointer' : 'default', color: t.muted, padding: '6px', opacity: content ? 1 : 0.3 }}>
            <Printer size={14} />
          </button>
          <button onClick={onShare} disabled={!content} title="Udostępnij" style={{ background: 'none', border: 'none', cursor: content ? 'pointer' : 'default', color: t.muted, padding: '6px', opacity: content ? 1 : 0.3 }}>
            <Share2 size={14} />
          </button>
          <button onClick={onEdit} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fuchsia, padding: '6px' }}>
            <Pencil size={14} />
          </button>
          {onDelete && (
            <button onClick={() => onDelete()} disabled={!content} title="Usuń" style={{ background: 'none', border: 'none', cursor: content ? 'pointer' : 'default', color: t.muted, padding: '6px', opacity: content ? 1 : 0.3 }}>
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
    const displayData = translatedContent || docData;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => { setViewDoc(null); setTranslatedContent(null); setViewLang('pl'); }}>
        <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
            <div>
              <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                DOKUMENT STUDIA
              </p>
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{label}</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Language selector */}
              <div className="flex items-center gap-1.5" style={{ border: `0.5px solid ${t.border}`, padding: '6px 10px' }}>
                <Globe size={11} color={t.muted} />
                <select
                  value={viewLang}
                  onChange={e => {
                    const lang = e.target.value;
                    setViewLang(lang);
                    translateDoc(docData, viewDoc.kind, lang);
                  }}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', cursor: 'pointer' }}
                >
                  {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <button onClick={() => { setViewDoc(null); setTranslatedContent(null); setViewLang('pl'); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6 flex-1">
            {translating ? (
              <div className="flex items-center gap-3 py-8">
                <div className="w-6 h-px animate-pulse" style={{ background: t.fuchsia }} />
                <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em' }}>TŁUMACZENIE...</p>
              </div>
            ) : (
              <>
                {displayData?.title && (
                  <p style={{ ...mono, fontSize: '11px', color: t.fuchsia, letterSpacing: '0.1em', marginBottom: '12px' }}>{displayData.title}</p>
                )}
                {docData?.last_updated && (
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginBottom: '16px' }}>
                    Ostatnia aktualizacja: {docData.last_updated}
                  </p>
                )}
                {displayData?.content ? (
                  <div
                    style={{ color: t.text, fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: displayData.content }}
                  />
                ) : (
                  <p style={{ color: t.muted, fontSize: '13px', fontStyle: 'italic' }}>Brak treści.</p>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 p-6 flex-wrap" style={{ borderTop: `0.5px solid ${t.border}`, flexShrink: 0 }}>
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
                setTranslatedContent(null);
                setViewLang('pl');
              }}
              className="flex items-center gap-2 btn-oxblood"
              style={{ padding: '10px 20px' }}
            >
              <Pencil size={12} /> EDYTUJ
            </button>
            <button
              onClick={() => handlePrint(docData, label, translatedContent)}
              disabled={translating}
              className="flex items-center gap-2"
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', opacity: translating ? 0.5 : 1 }}
            >
              <Printer size={12} /> DRUKUJ
            </button>
            <button
              onClick={() => handleShare(translatedContent || docData, label)}
              disabled={translating}
              className="flex items-center gap-2"
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', opacity: translating ? 0.5 : 1 }}
            >
              <Share2 size={12} /> UDOSTĘPNIJ
            </button>
            {isInstr && docData?.id && (
              <button
                onClick={() => setDeleteConfirmInstr(docData.id)}
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
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Zalecenia / Instrukcje */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius)' }}>
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
                   onView={() => openViewDoc({ kind: 'instr', data: instr, typeKey: type.key })}
                   onEdit={() => { setInstrForm(instr || { type: type.key, title: '', content: '' }); setEditingInstr(instr?.id || type.key); setSaveError(null); }}
                   onDelete={instr ? () => setDeleteConfirmInstr(instr.id) : null}
                   onPrint={() => handlePrint(instr, type.label, null)}
                   onShare={() => handleShare(instr, type.label)}
                  />
                );
              })}
            </div>
          </div>

          {/* Regulamin */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Regulamin Studia</h3>
              <button
                onClick={() => { setTermsForm(terms || { title: 'Regulamin Studia', content: '' }); setEditingTerms(true); setSaveError(null); }}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}
              >
                <Plus size={12} /> DODAJ NOWY
              </button>
            </div>
            <DocCard
              label="Regulamin Studia"
              title={terms?.title}
              content={terms?.content}
              onView={() => openViewDoc({ kind: 'terms', data: terms })}
              onEdit={() => { setTermsForm(terms || { title: '', content: '' }); setEditingTerms(true); setSaveError(null); }}
              onDelete={() => setDeleteConfirmTerms(true)}
              onPrint={() => handlePrint(terms, 'Regulamin Studia', null)}
              onShare={() => handleShare(terms, 'Regulamin Studia')}
            />
          </div>

          {/* Dokumenty prawne */}
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Dokumenty prawne</h3>
              <button
                onClick={() => { setLegalForm(cookiesPolicy || { title: 'Polityka Cookies', content: '' }); setEditingLegal('cookies'); setSaveError(null); }}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}
              >
                <Plus size={12} /> DODAJ NOWY
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocCard
                label="Polityka Cookies"
                title={cookiesPolicy?.title}
                content={cookiesPolicy?.content}
                onView={() => openViewDoc({ kind: 'terms', data: cookiesPolicy })}
                onEdit={() => { setLegalForm(cookiesPolicy || { title: 'Polityka Cookies', content: '' }); setEditingLegal('cookies'); setSaveError(null); }}
                onDelete={() => setDeleteConfirmLegal('cookies')}
                onPrint={() => handlePrint(cookiesPolicy, 'Polityka Cookies', null)}
                onShare={() => handleShare(cookiesPolicy, 'Polityka Cookies')}
              />
              <DocCard
                label="Polityka Prywatności"
                title={privacyPolicy?.title}
                content={privacyPolicy?.content}
                onView={() => openViewDoc({ kind: 'terms', data: privacyPolicy })}
                onEdit={() => { setLegalForm(privacyPolicy || { title: 'Polityka Prywatności', content: '' }); setEditingLegal('privacy'); setSaveError(null); }}
                onDelete={() => setDeleteConfirmLegal('privacy')}
                onPrint={() => handlePrint(privacyPolicy, 'Polityka Prywatności', null)}
                onShare={() => handleShare(privacyPolicy, 'Polityka Prywatności')}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteConfirmInstr}
        title="Usuń dokument"
        message="Czy na pewno chcesz usunąć ten dokument? Tej operacji nie można cofnąć."
        onConfirm={() => handleDeleteInstr(deleteConfirmInstr)}
        onCancel={() => setDeleteConfirmInstr(null)}
        theme={theme}
      />

      <ConfirmDeleteDialog
        open={deleteConfirmTerms}
        title="Usuń Regulamin Studia"
        message="Czy na pewno chcesz usunąć Regulamin Studia? Tej operacji nie można cofnąć."
        onConfirm={handleDeleteTerms}
        onCancel={() => setDeleteConfirmTerms(false)}
        theme={theme}
      />

      <ConfirmDeleteDialog
        open={!!deleteConfirmLegal}
        title={`Usuń ${deleteConfirmLegal === 'cookies' ? 'Politykę Cookies' : 'Politykę Prywatności'}`}
        message="Czy na pewno chcesz usunąć ten dokument? Tej operacji nie można cofnąć."
        onConfirm={handleDeleteLegal}
        onCancel={() => setDeleteConfirmLegal(null)}
        theme={theme}
      />

      {/* View modal */}
      <ViewModal />

      {/* Share modal */}
      {shareDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShareDoc(null)}>
          <div className="w-full max-w-md flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div>
                <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>WYŚLIJ DOKUMENT</p>
                <h3 style={{ ...display, fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{shareDoc.label}</h3>
              </div>
              <button onClick={() => setShareDoc(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Adres e-mail odbiorcy *</label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={e => { setShareEmail(e.target.value); setShareResult(null); }}
                  placeholder="np. klient@email.pl"
                  style={inputStyle}
                  disabled={shareSending}
                />
              </div>
              {shareResult === 'ok' && (
                <p style={{ ...mono, fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>✓ Dokument wysłany pomyślnie</p>
              )}
              {shareResult === 'error' && (
                <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ Błąd wysyłki. Sprawdź adres e-mail i spróbuj ponownie.</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSendShareEmail}
                  disabled={!shareEmail || shareSending}
                  className="btn-oxblood flex-1"
                  style={{ padding: '12px', opacity: !shareEmail || shareSending ? 0.5 : 1 }}
                >
                  {shareSending ? 'WYSYŁANIE...' : 'WYŚLIJ MAILEM'}
                </button>
                <button onClick={() => setShareDoc(null)} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji instrukcji */}
      {editingInstr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => { setEditingInstr(null); setSaveError(null); }}>
          <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
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
              {saveError && <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ {saveError}</p>}
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
          <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
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
              {saveError && <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ {saveError}</p>}
              <div className="flex gap-4">
                <button onClick={handleSaveTerms} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '12px', opacity: saving ? 0.5 : 1 }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
                <button onClick={() => { setEditingTerms(false); setSaveError(null); }} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji dokumentów prawnych */}
      {editingLegal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => { setEditingLegal(null); setSaveError(null); }}>
          <div className="w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, maxHeight: '90vh', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6" style={{ borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>
                {editingLegal === 'cookies' ? 'Edytuj Politykę Cookies' : 'Edytuj Politykę Prywatności'}
              </h3>
              <button onClick={() => { setEditingLegal(null); setSaveError(null); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-6">
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input type="text" value={legalForm.title} onChange={e => setLegalForm({ ...legalForm, title: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść (HTML lub tekst)</label>
                <textarea rows={15} value={legalForm.content} onChange={e => setLegalForm({ ...legalForm, content: e.target.value })} style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }} />
              </div>
            </div>

            <div className="p-6 space-y-3" style={{ borderTop: `0.5px solid ${t.border}`, flexShrink: 0 }}>
              {saveError && <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ {saveError}</p>}
              <div className="flex gap-4">
                <button onClick={handleSaveLegal} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '12px', opacity: saving ? 0.5 : 1 }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
                <button onClick={() => { setEditingLegal(null); setSaveError(null); }} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}