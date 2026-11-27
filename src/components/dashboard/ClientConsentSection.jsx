// Podgląd zgód klienta w profilu Dashboardu — widoczny także dla klientów bez konta.
const CONSENT = {
  granted: { label: 'Tak', color: '#16a34a' },
  denied: { label: 'Nie', color: 'var(--brand)' },
  undecided: { label: 'Brak decyzji', color: '#f59e0b' },
};

const SOURCE = {
  health_form: 'Ankieta',
  dashboard: 'Panel',
  unsubscribe: 'Wypis z mailingu',
  import: 'Import',
};

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

export default function ClientConsentSection({ client, t }) {
  const consent = CONSENT[client.marketing_consent] || CONSENT.undecided;
  const unsubscribed = Boolean(client.marketing_unsubscribed);
  const mono = { fontFamily: 'var(--font-mono)' };

  const Row = ({ label, value, color, note }) => (
    <div className="px-3 py-2 flex items-start justify-between gap-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: '2px' }}>{label}</p>
      <div style={{ textAlign: 'right' }}>
        <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{value}</p>
        {note && <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{note}</p>}
      </div>
    </div>
  );

  return (
    <div className="mb-4">
      <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>ZGODY</p>
      <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <Row
          label="Marketing"
          value={consent.label}
          color={consent.color}
          note={client.marketing_consent_source
            ? [SOURCE[client.marketing_consent_source] || '—', fmtDate(client.marketing_consent_date)].join(' · ')
            : 'Brak decyzji — domyślnie zapisany'}
        />
        <div style={{ borderBottom: 'none' }}>
          <Row
            label="Wypis z mailingu"
            value={unsubscribed ? 'Tak' : 'Nie'}
            color={unsubscribed ? 'var(--brand)' : t.muted}
            note={unsubscribed ? fmtDate(client.marketing_unsubscribed_at) : null}
          />
        </div>
      </div>
    </div>
  );
}