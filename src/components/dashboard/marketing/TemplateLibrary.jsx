import { LayoutTemplate, Trash2 } from 'lucide-react';

const CATEGORY_LABELS = {
  newsletter: 'Newsletter', offer: 'Oferta', workshop: 'Warsztaty',
  shop: 'Sklep', reactivation: 'Powrót klienta', custom: 'Własny',
};

export default function TemplateLibrary({ templates, loading, t, onUse, onDelete }) {
  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-px bg-oxblood animate-pulse" /></div>;
  if (templates.length === 0) {
    return (
      <div className="py-16 text-center" style={{ border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.muted }}>Brak szablonów</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {templates.map(template => (
        <div key={template.id} className="p-4 flex flex-col" style={{ border: `0.5px solid ${t.border}`, background: t.card, borderRadius: 'var(--radius)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <LayoutTemplate size={14} className="text-oxblood shrink-0" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.muted }}>
              {CATEGORY_LABELS[template.category] || 'Szablon'}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1, letterSpacing: '0.03em', color: t.text }}>{template.name}</p>
          <p className="mt-2 flex-1" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: 1.6, color: t.muted }}>{template.description || template.subject}</p>
          <div className="flex items-center justify-between gap-2 mt-3 pt-3" style={{ borderTop: `0.5px solid ${t.border}` }}>
            <button type="button" onClick={() => onUse(template)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)' }}>
              Użyj szablonu
            </button>
            <button type="button" onClick={() => onDelete(template)} aria-label="Usuń szablon" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}