import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, MessageSquare } from 'lucide-react';

// Tytuł rozmowy: nadana nazwa, a inaczej pierwszy komunikat użytkownika
export const convTitle = (conv) => {
  const name = conv?.metadata?.name;
  if (name && name !== 'Nowa rozmowa') return name;
  const firstUser = (conv?.messages || []).find(m => m.role === 'user');
  const text = (firstUser?.content || '').trim().replace(/\s+/g, ' ');
  if (text) return text.length > 42 ? text.slice(0, 42) + '…' : text;
  return 'Nowa rozmowa';
};

export default function ChatHistoryPanel({ t, conversations, activeId, onSelect, onNew, creating }) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
      <button
        onClick={onNew}
        disabled={creating}
        className="flex items-center justify-center gap-2 w-full"
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--btn-text, #F5F0EB)', background: 'var(--brand)', border: 'none',
          padding: '9px', cursor: 'pointer', borderRadius: 'var(--radius)', opacity: creating ? 0.5 : 1,
        }}
      >
        <Plus size={12} /> Nowa rozmowa
      </button>

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>
        Historia ({conversations.length})
      </p>

      {conversations.length === 0 && (
        <p style={{ fontSize: '12px', color: t.muted, padding: '8px 2px' }}>Brak zapisanych rozmów.</p>
      )}

      {conversations.map(c => {
        const active = c.id === activeId;
        let when = '';
        try { when = format(parseISO(c.updated_date || c.created_date), 'd MMM, HH:mm', { locale: pl }); } catch {}
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="text-left w-full"
            style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              background: active ? 'rgb(var(--brand-rgb) / 0.1)' : 'rgba(128,128,128,0.05)',
              border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
              borderRadius: 'var(--radius)', padding: '8px 10px', cursor: 'pointer',
            }}
          >
            <MessageSquare size={12} color={active ? 'var(--brand)' : t.muted} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '12px', color: t.text, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {convTitle(c)}
              </span>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
                {when} · {(c.messages || []).length} wiadomości
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}