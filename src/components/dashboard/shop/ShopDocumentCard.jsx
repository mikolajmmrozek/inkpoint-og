import { FileText, Eye, Printer, Share2, Pencil, Trash2, Download } from 'lucide-react';
import { mono, display } from './shopTheme';

export default function ShopDocumentCard({ label, doc, t, onView, onEdit, onPrint, onShare, onDelete }) {
  const hasContent = !!(doc?.content || doc?.file_url);
  const hasText = !!doc?.content;

  const iconBtn = (enabled) => ({
    background: 'none',
    border: 'none',
    cursor: enabled ? 'pointer' : 'default',
    color: t.muted,
    padding: '5px',
    opacity: enabled ? 1 : 0.3,
  });

  return (
    <div style={{ border: `0.5px solid ${t.border}`, padding: '14px 16px', background: t.panel, borderRadius: 'var(--radius)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <FileText size={13} color={hasContent ? 'var(--brand)' : t.muted} style={{ flexShrink: 0, marginTop: '3px' }} />
          <div className="min-w-0">
            <p style={{ ...display, fontSize: '1.1rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.15 }}>{label}</p>
            <p style={{ ...mono, fontSize: '8px', color: hasContent ? 'var(--brand)' : t.muted, letterSpacing: '0.1em', marginTop: '5px' }}>
              {doc?.file_url ? 'PDF DODANY' : doc?.content ? 'TREŚĆ DODANA' : 'BRAK TREŚCI'}
              {doc?.last_updated ? ` · ${doc.last_updated}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onView} disabled={!hasContent} title="Podgląd" style={iconBtn(hasContent)}><Eye size={13} /></button>
          <button onClick={onPrint} disabled={!hasText} title="Drukuj" style={iconBtn(hasText)}><Printer size={13} /></button>
          <button onClick={onShare} disabled={!hasContent} title="Udostępnij" style={iconBtn(hasContent)}><Share2 size={13} /></button>
          {doc?.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Pobierz PDF" style={{ color: t.muted, padding: '5px' }}><Download size={13} /></a>
          )}
          <button onClick={onEdit} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '5px' }}><Pencil size={13} /></button>
          {doc?.id && (
            <button onClick={onDelete} title="Usuń" style={iconBtn(true)}><Trash2 size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );
}