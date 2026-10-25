import { useState } from 'react';
import { Wrench, ChevronDown } from 'lucide-react';

// Karta pojedynczej wymiany z logu obserwacyjnego Gatekeeperów artystów.
// Treści są już zanonimizowane po stronie serwera (e-maile, telefony, imiona klientów).

const statusInfo = (st) => {
  const s = String(st || '').toLowerCase();
  if (['failed', 'error'].includes(s)) return { label: 'BŁĄD', color: '#ef4444' };
  if (['success', 'completed'].includes(s)) return { label: 'OK', color: '#16a34a' };
  return { label: (st || '—').toUpperCase(), color: 'var(--brand)' };
};

export default function AgentTranscriptCard({ entry, artistName, t }) {
  const [openTools, setOpenTools] = useState(false);
  const tools = entry.tool_calls || [];
  const date = entry.created_date ? new Date(entry.created_date).toLocaleString('pl-PL') : '—';
  const err = entry.had_error;

  const sectionLabel = (text) => (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>{text}</p>
  );

  return (
    <div style={{ border: `0.5px solid ${err ? '#ef4444' : t.border}`, background: t.bg, borderRadius: 'var(--radius)', padding: '18px' }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.08em' }}>{artistName}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{date}</span>
        {entry.conversation_name && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, opacity: 0.8 }}>· {entry.conversation_name}</span>}
        <span className="ml-auto" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          v{entry.instruction_version || '—'} · pamięć: {entry.memory_entries ?? 0}
        </span>
      </div>

      {entry.user_message && (
        <div className="mb-3">
          {sectionLabel('Artysta')}
          <p style={{ fontSize: '13px', color: t.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.user_message}</p>
        </div>
      )}
      {entry.assistant_message && (
        <div className="mb-3">
          {sectionLabel('Asystent')}
          <p style={{ fontSize: '13px', color: t.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.assistant_message}</p>
        </div>
      )}
      {err && (
        <div className="mb-3" style={{ padding: '8px 12px', border: '0.5px solid #ef4444', borderRadius: 'var(--radius)' }}>
          {sectionLabel('Błąd wymiany')}
          <p style={{ fontSize: '12px', color: '#ef4444' }}>{entry.error_note || 'Wymiana zakończyła się błędem'}</p>
        </div>
      )}

      {tools.length > 0 && (
        <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '10px' }}>
          <button onClick={() => setOpenTools(v => !v)} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0 }}>
            <Wrench size={11} /> Narzędzia ({tools.length})
            <ChevronDown size={11} style={{ transform: openTools ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {openTools && (
            <div className="mt-2 space-y-2">
              {tools.map((tc, i) => {
                const info = statusInfo(tc.status);
                return (
                  <div key={i} style={{ padding: '8px 10px', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text }}>{tc.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: info.color, letterSpacing: '0.1em' }}>{info.label}</span>
                    </div>
                    {tc.arguments && <p style={{ fontSize: '10px', color: t.muted, wordBreak: 'break-all', marginBottom: 4 }}>{tc.arguments}</p>}
                    {tc.result && <p style={{ fontSize: '10px', color: t.muted, opacity: 0.75, wordBreak: 'break-all' }}>{tc.result}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}