import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, MessageSquare, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

// Tytuł rozmowy: nadana nazwa, a inaczej pierwszy komunikat użytkownika
export const convTitle = (conv) => {
  const name = conv?.metadata?.name;
  if (name && name !== 'Nowa rozmowa') return name;
  const firstUser = (conv?.messages || []).find(m => m.role === 'user');
  const text = (firstUser?.content || '').trim().replace(/\s+/g, ' ');
  if (text) return text.length > 42 ? text.slice(0, 42) + '…' : text;
  return 'Nowa rozmowa';
};

export default function ChatHistoryPanel({ t, conversations, activeId, onSelect, onNew, creating, onRename, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  // Szukamy po nazwie rozmowy ORAZ po treści wiadomości wewnątrz (z fragmentem trafienia)
  const results = q
    ? conversations.map(c => {
        if (convTitle(c).toLowerCase().includes(q)) return { conv: c, snippet: null };
        for (const m of c.messages || []) {
          const raw = String(m.content || '').replace(/\s+/g, ' ').trim();
          const idx = raw.toLowerCase().indexOf(q);
          if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            return { conv: c, snippet: (start > 0 ? '…' : '') + raw.slice(start, start + 72) + '…' };
          }
        }
        return null;
      }).filter(Boolean)
    : conversations.map(c => ({ conv: c, snippet: null }));

  const iconBtn = {
    background: 'none', border: 'none', cursor: 'pointer', color: t.muted,
    padding: '3px', flexShrink: 0, display: 'flex',
  };

  const startRename = (c) => {
    setEditingId(c.id);
    setEditName(convTitle(c));
  };

  const submitRename = (c) => {
    const name = editName.trim();
    if (name && name !== convTitle(c)) onRename(c.id, name);
    setEditingId(null);
  };

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

      <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '7px 10px', background: 'rgba(128,128,128,0.05)' }}>
        <Search size={12} color={t.muted} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Szukaj w rozmowach..."
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: t.text, fontSize: '11px', outline: 'none', fontFamily: 'var(--font-body)' }}
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Wyczyść wyszukiwanie" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0, display: 'flex' }}>
            <X size={11} />
          </button>
        )}
      </div>

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>
        Historia ({results.length}{q && results.length !== conversations.length ? `/${conversations.length}` : ''})
      </p>

      {conversations.length === 0 && (
        <p style={{ fontSize: '12px', color: t.muted, padding: '8px 2px' }}>Brak zapisanych rozmów.</p>
      )}

      {q && results.length === 0 && (
        <p style={{ fontSize: '12px', color: t.muted, padding: '8px 2px' }}>Brak rozmów pasujących do frazy „{query.trim()}".</p>
      )}

      {results.map(r => {
        const c = r.conv;
        const active = c.id === activeId;
        const editing = editingId === c.id;
        let when = '';
        try { when = format(parseISO(c.updated_date || c.created_date), 'd MMM, HH:mm', { locale: pl }); } catch {}
        return (
          <div
            key={c.id}
            onClick={() => !editing && onSelect(c.id)}
            className="text-left w-full"
            style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              background: active ? 'rgb(var(--brand-rgb) / 0.1)' : 'rgba(128,128,128,0.05)',
              border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
              borderRadius: 'var(--radius)', padding: '8px 10px', cursor: editing ? 'default' : 'pointer',
            }}
          >
            <MessageSquare size={12} color={active ? 'var(--brand)' : t.muted} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              {editing ? (
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); submitRename(c); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', borderBottom: `0.5px solid var(--brand)`, color: t.text, fontSize: '12px', padding: '2px 0', outline: 'none', fontFamily: 'var(--font-body)' }}
                  />
                  <button onClick={e => { e.stopPropagation(); submitRename(c); }} title="Zapisz nazwę" style={iconBtn}><Check size={12} color="var(--brand)" /></button>
                  <button onClick={e => { e.stopPropagation(); setEditingId(null); }} title="Anuluj" style={iconBtn}><X size={12} /></button>
                </span>
              ) : (
                <span style={{ display: 'block', fontSize: '12px', color: t.text, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {convTitle(c)}
                </span>
              )}
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
                {when} · {(c.messages || []).length} wiadomości
              </span>
              {r.snippet && (
                <span style={{ display: 'block', fontSize: '10.5px', color: t.muted, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.snippet}
                </span>
              )}
            </span>
            {!editing && (
              <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => startRename(c)} title="Zmień nazwę" style={iconBtn}><Pencil size={10} /></button>
                <button onClick={() => setDeleteId(c.id)} title="Usuń rozmowę" style={iconBtn}><Trash2 size={11} /></button>
              </span>
            )}
          </div>
        );
      })}

      <ConfirmDeleteDialog
        open={!!deleteId}
        title="Usuń rozmowę"
        message="Czy na pewno chcesz usunąć tę rozmowę? Zniknie z Twojej historii i nie można tego cofnąć."
        onConfirm={() => { onDelete(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}