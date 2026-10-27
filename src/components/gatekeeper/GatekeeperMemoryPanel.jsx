import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Brain, ChevronDown, ChevronRight, History, Trash2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

const CATEGORY_LABELS = { style: 'Styl pracy', preference: 'Preferencja' };
const CATEGORY_COLORS = { style: 'var(--brand)', preference: '#2563eb' };

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function MemoryEntry({ entry, isOwner, t, theme, onRestored, onDeleted }) {
  const [openHistory, setOpenHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const color = CATEGORY_COLORS[entry.category] || 'var(--brand)';

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await base44.functions.invoke('gatekeeperMemory', { action: 'list', memory_key: entry.memory_key, agent_name: entry.agent_name });
      setVersions(res.data?.versions || []);
    } catch { setVersions([]); }
    setLoadingHistory(false);
  };

  const toggleHistory = () => {
    if (!openHistory) loadHistory();
    setOpenHistory(o => !o);
  };

  const restore = async (versionId) => {
    setBusy(true);
    try {
      await base44.functions.invoke('gatekeeperMemory', { action: 'restore', id: versionId });
      await loadHistory();
      onRestored();
    } catch (e) {
      alert(e?.response?.data?.error || 'Nie udało się przywrócić wersji.');
    }
    setBusy(false);
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await base44.functions.invoke('gatekeeperMemory', { action: 'delete', memory_key: entry.memory_key, agent_name: entry.agent_name });
      onDeleted(entry.memory_key);
    } catch (e) {
      alert(e?.response?.data?.error || 'Nie udało się usunąć wpisu.');
    }
    setBusy(false);
  };

  return (
    <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', background: 'rgba(128,128,128,0.04)' }}>
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, letterSpacing: '0.05em', fontWeight: 600 }}>{entry.memory_key}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', border: `0.5px solid ${color}55`, borderRadius: 'var(--radius)' }}>
            {CATEGORY_LABELS[entry.category] || entry.category}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>v{entry.version}</span>
          {isOwner && entry.studio_id && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>· {entry.studio_id}</span>
          )}
        </div>
        <p style={{ fontSize: '12.5px', color: t.text, lineHeight: 1.5 }}>{entry.content}</p>
        <div className="flex items-center justify-between mt-2">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.05em' }}>
            {entry.author_type === 'assistant' ? 'Nauczył się sam' : 'Wpis administratora'}{entry.author_name ? ` · ${entry.author_name}` : ''} · {fmtDate(entry.updated_date)}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={toggleHistory} title="Historia zmian" style={{ background: 'none', border: 'none', cursor: 'pointer', color: openHistory ? 'var(--brand)' : t.muted, padding: '3px', display: 'flex' }}>
              {openHistory ? <ChevronDown size={13} /> : <History size={13} />}
            </button>
            <button onClick={() => setConfirmDelete(true)} title="Usuń wpis" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '3px', display: 'flex' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {openHistory && (
        <div className="px-3 pb-2.5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          {loadingHistory ? (
            <div className="flex items-center gap-2 py-2"><Loader2 size={11} className="animate-spin" color="var(--brand)" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>ŁADOWANIE HISTORII...</span></div>
          ) : (
            <div className="py-2 space-y-1">
              {(versions || []).map((v, i) => (
                <div key={v.id} className="flex items-start gap-2" style={{ opacity: v.is_current !== false ? 1 : 0.55 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: v.is_current !== false ? 'var(--brand)' : t.muted, flexShrink: 0, minWidth: '24px', paddingTop: '2px' }}>v{v.version}</span>
                  <p style={{ fontSize: '11px', color: t.text, lineHeight: 1.45, flex: 1 }}>{v.content}</p>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted }}>{v.author_name ? `${v.author_name} · ` : ''}{fmtDate(v.updated_date || v.created_date)}</span>
                    {v.is_current === false && (
                      <button onClick={() => restore(v.id)} disabled={busy} title={`Przywróć wersję v${v.version}`} style={{ background: 'none', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', cursor: busy ? 'default' : 'pointer', color: 'var(--brand)', padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px', opacity: busy ? 0.4 : 1 }}>
                        <RotateCcw size={9} /> PRZYWRÓĆ
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(versions || []).length <= 1 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>JEDYNA WERSJA — HISTORIA PUSTA</p>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirmDelete}
        theme={theme}
        title={`Usuń „${entry.memory_key}"`}
        message="Usunięcie wykasuje wpis wraz z całą historią wersji. Gatekeeper zapomniał tej preferencji na stałe. Tej operacji nie można cofnąć."
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function GatekeeperMemoryPanel({ theme = 'dark' }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)' }
    : { bg: '#0A0A0A', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)' };

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('gatekeeperMemory', { action: 'list' });
      setEntries(res.data?.memories || []);
      setIsOwner(!!res.data?.is_platform_owner);
    } catch (e) {
      setError(e?.response?.data?.error || 'Nie udało się wczytać pamięci.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>PAMIĘĆ GATEKEEPERA</p>
          <p style={{ fontSize: '11px', color: t.muted, marginTop: '3px', lineHeight: 1.45 }}>
            Preferencje i styl pracy, które asystent zapisał samodzielnie. Pełne rozmowy i dane klientów nigdy nie trafiają do pamięci.
          </p>
        </div>
        <button onClick={load} title="Odśwież" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '3px', flexShrink: 0 }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {isOwner && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2" style={{ border: '0.5px solid rgba(22,163,74,0.4)', background: 'rgba(22,163,74,0.05)', borderRadius: 'var(--radius)' }}>
          <ShieldCheck size={12} color="#16a34a" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dostęp nadrzędny · widzisz pamięć i dane wszystkich studiów</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wczytuję pamięć...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
          <X size={18} color="#ef4444" />
          <p style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5 }}>{error}</p>
          <button onClick={load} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', border: '0.5px solid var(--brand)', background: 'transparent', padding: '7px 14px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>SPRÓBUJ PONOWNIE</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
          <span style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', background: 'rgb(var(--brand-rgb) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="var(--brand)" />
          </span>
          <p style={{ fontSize: '12.5px', color: t.muted, lineHeight: 1.55 }}>
            Gatekeeper nie zapamiętał jeszcze nic. Porozmawiaj z nim i pokaż, jak ma pracować — będzie sam zapisywał preferencje i stosował je w kolejnych rozmowach.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <MemoryEntry
              key={`${e.agent_name}-${e.memory_key}-${e.id}`}
              entry={e}
              isOwner={isOwner}
              t={t}
              theme={theme}
              onRestored={load}
              onDeleted={() => load()}
            />
          ))}
        </div>
      )}
    </div>
  );
}