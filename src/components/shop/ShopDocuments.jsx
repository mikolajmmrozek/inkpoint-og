import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileText } from 'lucide-react';
import { SHOP_DOCS } from '@/lib/shop';

export default function ShopDocuments() {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    base44.entities.TermsAndConditions.filter({ key: { $in: SHOP_DOCS.map(d => d.key) } })
      .then(setDocs)
      .catch(() => {});
  }, []);

  const available = SHOP_DOCS.map(item => ({ ...item, doc: docs.find(d => d.key === item.key) }))
    .filter(d => d.doc && (d.doc.content || d.doc.file_url));

  return (
    <div className="mt-20 pt-10" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
      <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', marginBottom: '14px' }}>DOKUMENTY SKLEPU</p>
      {available.length === 0 ? (
        <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em' }}>DOKUMENTY ZOSTANĄ OPUBLIKOWANE</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {available.map(({ key, doc }) => (
            <details key={key} style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
              <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer" style={{ listStyle: 'none' }}>
                <span className="flex items-center gap-2">
                  <FileText size={12} color="var(--brand)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', color: 'hsl(var(--foreground))' }}>{doc.title || key}</span>
                </span>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em', textDecoration: 'none' }}>
                    <Download size={10} /> PDF
                  </a>
                )}
              </summary>
              {doc.content && (
                <p style={{ padding: '0 16px 14px', fontSize: '12px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{doc.content}</p>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}