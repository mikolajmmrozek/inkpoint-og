import { Mail } from 'lucide-react';

const STATUS = {
  draft: { label: 'Szkic', color: '#f59e0b' },
  ready: { label: 'Gotowa', color: '#16a34a' },
  archived: { label: 'Archiwum', color: 'rgba(245,240,235,0.45)' },
};

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CampaignCard({ campaign, t, onOpen }) {
  const status = STATUS[campaign.status] || STATUS.draft;
  return (
    <button
      type="button"
      onClick={() => onOpen(campaign)}
      className="text-left p-5 w-full transition-colors hover:opacity-90"
      style={{ border: `0.5px solid ${t.border}`, background: t.card, borderRadius: 'var(--radius)', cursor: 'pointer' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Mail size={15} className="text-oxblood shrink-0" />
        <span className="flex items-center gap-1.5 shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: status.color }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: status.color }} />
          {status.label}
        </span>
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.04em', lineHeight: 1, color: t.text }}>{campaign.name}</p>
      <p className="mt-2 line-clamp-2" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.5, color: t.muted }}>
        {campaign.subject || 'Bez tematu'}
      </p>
      <div className="flex items-center justify-between gap-3 mt-4 pt-3" style={{ borderTop: `0.5px solid ${t.border}`, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: t.muted }}>
        <span>{campaign.audience_count ? `${campaign.audience_count} ODBIORCÓW` : 'SEGMENT NIEUSTAWIONY'}</span>
        <span>{formatDate(campaign.updated_date)}</span>
      </div>
    </button>
  );
}