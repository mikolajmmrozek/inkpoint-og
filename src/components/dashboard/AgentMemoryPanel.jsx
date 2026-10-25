import { Brain } from 'lucide-react';

// Podgląd prywatnej pamięci Gatekeepera jednego artysty (nadzór administratora).
// Wpisy z seeded_from = 'admin_gatekeeper' to baza skopiowana z Gatekeepera adminów
// przy pierwszym uruchomieniu agenta — odróżnia wpływ promptu od personalizacji.

export default function AgentMemoryPanel({ entries, artistName, t }) {
  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)', padding: '18px' }}>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={14} color="var(--brand)" />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: t.text, letterSpacing: '0.04em' }}>{artistName} · pamięć agenta</p>
        <span className="ml-auto" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{entries.length} wpisów</span>
      </div>
      {entries.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>Agent nie zapisał jeszcze żadnych preferencji.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(m => (
            <div key={m.id} style={{ padding: '10px 12px', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.08em' }}>{m.memory_key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.category}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>v{m.version}</span>
                {m.seeded_from && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', border: '0.5px solid rgb(var(--brand-rgb) /0.4)', padding: '1px 5px' }}>BAZA ADMINÓW</span>}
              </div>
              <p style={{ fontSize: '12px', color: t.text, lineHeight: 1.5 }}>{m.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}