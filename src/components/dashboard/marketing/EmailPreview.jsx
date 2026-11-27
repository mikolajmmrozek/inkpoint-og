import { buildEmailHtml } from '@/lib/emailHtml';
import { labelStyle } from '@/lib/marketingUi';

export default function EmailPreview({ campaign, t }) {
  const html = buildEmailHtml({
    subject: campaign.subject,
    preheader: campaign.preheader,
    blocks: campaign.blocks,
    layout: campaign.layout,
  });

  return (
    <div>
      <div className="p-4 mb-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
        <span style={labelStyle(t)}>Temat w skrzynce</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.4 }}>
          {campaign.subject || 'Bez tematu'}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: t.muted, marginTop: '4px' }}>
          {campaign.preheader || 'Brak zajawki'}
        </p>
      </div>
      <iframe
        title="Podgląd wiadomości e-mail"
        srcDoc={html}
        className="w-full block"
        style={{ height: 620, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', background: '#0a0a0a' }}
      />
      <p className="mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', color: t.muted }}>
        PODGLĄD Z PRZYKŁADOWYM IMIENIEM — NIC NIE ZOSTAJE WYSŁANE
      </p>
    </div>
  );
}