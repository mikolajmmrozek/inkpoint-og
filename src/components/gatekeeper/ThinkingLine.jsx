import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';

// Jedna linijka statusu pracy Gatekeepera — zamiast kilku bloków.
// Kolejne komunikaty zamieniają się w tym samym miejscu, więc zawsze wiadomo,
// że asystent pracuje, a interfejs nie rośnie.

const TOOL_STEPS = [
  { key: 'booking', text: 'Odtwarzam rezerwacje' },
  { key: 'client', text: 'Sprawdzam bazę klientów' },
  { key: 'artistavailability', text: 'Sprawdzam dyspozycje' },
  { key: 'service', text: 'Sprawdzam usługi' },
  { key: 'promotion', text: 'Sprawdzam vouchery' },
  { key: 'healthform', text: 'Sprawdzam ankiety zdrowotne' },
  { key: 'changerequest', text: 'Sprawdzam prośby o zmianę' },
  { key: 'contactmessage', text: 'Sprawdzam wiadomości' },
  { key: 'feedback', text: 'Sprawdzam opinie' },
  { key: 'artist', text: 'Sprawdzam artystów' },
  { key: 'userlog', text: 'Przeglądam aktywność' },
  { key: 'managegooglecalendar', text: 'Synchronizuję kalendarz' },
  { key: 'googlecalendar', text: 'Synchronizuję kalendarz' },
  { key: 'memory', text: 'Sprawdzam pamięć' },
  { key: 'ops', text: 'Zapisuję dane' },
];

function buildSteps(toolCalls = []) {
  const steps = ['Myślę'];
  (toolCalls || []).forEach((tc) => {
    const name = String(tc?.name || '').toLowerCase().replace(/_/g, '');
    const found = TOOL_STEPS.find((s) => name.includes(s.key));
    const text = found ? found.text : 'Przetwarzam dane';
    if (!steps.includes(text)) steps.push(text);
  });
  if (steps.length > 1) steps.push('Analizuję wynik');
  steps.push('Przygotowuję odpowiedź');
  return steps;
}

export default function ThinkingLine({ t, toolCalls = [] }) {
  const signature = (toolCalls || []).map((tc) => tc?.name).join('|');
  const steps = useMemo(() => buildSteps(toolCalls), [signature]);
  const [index, setIndex] = useState(0);

  useEffect(() => { setIndex(0); }, [signature]);

  useEffect(() => {
    if (steps.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % steps.length), 2000);
    return () => clearInterval(id);
  }, [steps.length, signature]);

  const label = steps[Math.min(index, steps.length - 1)];

  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ width: '26px', height: '26px', borderRadius: 'var(--radius)', background: 'var(--brand)', color: 'var(--btn-text, #F5F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bot size={15} />
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'rgba(128,128,128,0.06)', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
        <Loader2 size={12} className="animate-spin" style={{ color: 'var(--brand)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted, whiteSpace: 'nowrap' }}>
          {label}…
        </span>
      </span>
    </div>
  );
}