import { Sparkles, RotateCcw } from 'lucide-react';

export default function AiHistoryPanel({ history, loading, t, onLoad }) {
  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-px bg-oxblood animate-pulse" /></div>;
  if (history.length === 0) {
    return (
      <div className="py-16 px-6 text-center" style={{ border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)' }}>
        <Sparkles size={16} color={t.muted} className="mx-auto mb-3" />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.03em', color: t.text }}>Historia jest pusta</p>
        <p className="mx-auto mt-2 max-w-sm" style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', lineHeight: 1.6, color: t.muted }}>
          Każde wygenerowanie treści przez AI zapisze się tutaj razem z poleceniem i wynikiem.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {history.map(entry => (
        <div key={entry.id} className="p-4" style={{ border: `0.5px solid ${t.border}`, background: t.card, borderRadius: 'var(--radius)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand)' }}>
                {entry.action === 'layout' ? 'Ułożenie treści' : 'Nowa treść'} {entry.campaign_name ? `· ${entry.campaign_name}` : ''}
              </p>
              <p className="mt-1" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: t.text }}>{entry.result?.subject || 'Bez tematu'}</p>
              <p className="mt-1" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: 1.6, color: t.muted }}>{entry.brief}</p>
              <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>
                {new Date(entry.created_date).toLocaleString('pl-PL')} · {entry.author_name || 'studio'}
              </p>
            </div>
            <button type="button" onClick={() => onLoad(entry)} className="flex items-center gap-1.5 shrink-0" style={{ background: 'none', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '7px 10px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text }}>
              <RotateCcw size={10} /> Wczytaj
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}