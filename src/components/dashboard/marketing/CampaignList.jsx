import { Plus } from 'lucide-react';
import CampaignCard from '@/components/dashboard/marketing/CampaignCard';

export default function CampaignList({ campaigns, loading, t, onCreate, onOpen }) {
  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-10 h-px bg-oxblood animate-pulse" /></div>;
  }
  if (campaigns.length === 0) {
    return (
      <div className="py-16 text-center" style={{ border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.text, letterSpacing: '0.04em' }}>Brak kampanii</p>
        <p className="mx-auto mt-2 max-w-sm" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: t.muted, lineHeight: 1.6 }}>
          Zacznij od szkicu: wybierz odbiorców, ustaw treść i sprawdź podgląd wiadomości.
        </p>
        <button onClick={onCreate} className="btn-oxblood mt-6" style={{ fontSize: '10px' }}>Nowa kampania</button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.muted }}>
          {campaigns.length} {campaigns.length === 1 ? 'KAMPANIA' : 'KAMPANII'}
        </p>
        <button onClick={onCreate} className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand)' }}>
          <Plus size={12} /> NOWA
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {campaigns.map(campaign => (
          <CampaignCard key={campaign.id} campaign={campaign} t={t} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}