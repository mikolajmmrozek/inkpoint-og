import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, ShieldAlert } from 'lucide-react';
import { labelStyle } from '@/lib/marketingUi';

const CATEGORY_LABELS = { tattoo: 'Tatuaż', piercing: 'Piercing', studio: 'Studio' };

export default function AudiencePreview({ filters, t, onCount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      base44.functions.invoke('marketingAudience', { filters })
        .then(response => {
          if (cancelled) return;
          setData(response.data);
          onCount?.(response.data?.stats?.matched || 0);
        })
        .catch(() => { if (!cancelled) setError('Nie udało się policzyć segmentu.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [JSON.stringify(filters)]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-px bg-oxblood animate-pulse" /></div>;
  }
  if (error) {
    return <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)' }}>{error}</p>;
  }
  if (!data) return null;

  const stats = data.stats;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Odbiorcy', value: stats.matched },
          { label: 'Powracający', value: stats.returning },
          { label: 'Jednorazowi', value: stats.one_time },
          { label: 'Warsztaty', value: stats.workshop },
          { label: 'Sklep', value: stats.shop_order },
          { label: 'Pełnoletni', value: stats.adult },
          { label: 'Niepełnoletni', value: stats.minor },
          { label: 'Bez daty ur.', value: stats.unknown_age },
        ].map(item => (
          <div key={item.label} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: t.text }}>{item.value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginTop: '4px' }}>{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 p-3 mb-4" style={{ border: `0.5px solid ${t.border}`, background: t.notice, borderRadius: 'var(--radius)' }}>
        <ShieldAlert size={13} color="#f59e0b" className="shrink-0 mt-0.5" />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: 1.6, color: t.muted }}>
          {stats.excluded_no_consent > 0 && `${stats.excluded_no_consent} ${stats.excluded_no_consent === 1 ? 'osobę pominięto' : 'osób pominięto'} — brak zgody marketingowej. `}
          Nowi klienci trafiają do odbiorców tylko po zaznaczeniu zgody w ankiecie; osoby, które się wypisały, są pomijane.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <span style={labelStyle(t)}>Podgląd odbiorców</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>
          {data.truncated ? `pierwszych ${data.recipients.length} z ${stats.matched}` : `${data.recipients.length} z ${stats.base_total} w bazie`}
        </span>
      </div>

      {data.recipients.length === 0 ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)' }}>
          <Users size={13} color={t.muted} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>Żaden klient nie spełnia tych filtrów.</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: t.card }}>
                {['Klient', 'Ostatnia usługa', 'Wizyty', 'Kategorie', 'Wiek', 'Zgoda'].map(head => (
                  <th key={head} className="text-left px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recipients.map(person => (
                <tr key={person.email}>
                  <td className="px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: t.text }}>{person.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{person.email}</p>
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>{person.last_service || '—'}</td>
                  <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, borderBottom: `0.5px solid ${t.border}` }}>{person.visits}</td>
                  <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                    {person.categories.map(key => CATEGORY_LABELS[key] || key).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, borderBottom: `0.5px solid ${t.border}` }}>
                    {person.age_group === 'adult' ? 'Pełnoletni' : person.age_group === 'minor' ? 'Niepełnoletni' : '—'}
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', color: person.consent === 'granted' ? '#16a34a' : person.consent === 'unsubscribed' ? 'var(--brand)' : '#f59e0b', borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                    {person.consent === 'granted' ? 'Tak' : person.consent === 'unsubscribed' ? 'Wypis' : person.consent === 'denied' ? 'Nie' : 'Domyślnie'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}