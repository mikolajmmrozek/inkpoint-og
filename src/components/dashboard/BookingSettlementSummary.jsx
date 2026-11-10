import { money } from '@/lib/shop';

const METHOD_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };
const METHOD_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };

export default function BookingSettlementSummary({ booking, t }) {
  const products = booking?.sold_products || [];
  const extra = booking?.additional_services || [];

  const Row = ({ label, value, color, strong }) => (
    <div className="flex items-center justify-between py-1">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: strong ? '12px' : '11px', color: color || t.text, fontWeight: strong ? 600 : 400 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ border: '0.5px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.04)', borderRadius: 'var(--radius)', padding: '12px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        ROZLICZONO
      </p>

      <Row label="FINAŁNA KWOTA" value={money(booking.final_amount)} strong />
      {Number(booking.deposit_amount || 0) > 0 && <Row label="ZALICZKA" value={money(booking.deposit_amount)} />}

      {extra.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: '0.5px solid rgba(22,163,74,0.2)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>USŁUGI DODATKOWE</p>
          {extra.map((s, i) => (
            <Row key={i} label={`${s.name}${s.category ? ` · ${s.category}` : ''}`} value={money(s.price)} />
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: '0.5px solid rgba(22,163,74,0.2)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>PRODUKTY</p>
          {products.map((p, i) => (
            <Row key={i} label={`${p.name}${p.variant_label ? ` · ${p.variant_label}` : ''} × ${p.qty}`} value={money((Number(p.price) || 0) * (Number(p.qty) || 0))} />
          ))}
          {Number(booking.products_commission || 0) > 0 && (
            <Row label="PROWIZJA PRACOWNIKA" value={money(booking.products_commission)} color="#f59e0b" />
          )}
        </div>
      )}

      {Array.isArray(booking.payment_breakdown) && booking.payment_breakdown.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: '0.5px solid rgba(22,163,74,0.2)' }}>
          {booking.payment_breakdown.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: METHOD_COLORS[p.method] || t.muted }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{METHOD_LABELS[p.method] || p.method}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.text }}>{money(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {booking.settled_by_name && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid rgba(22,163,74,0.15)' }}>
          ROZLICZYŁ: {booking.settled_by_name}{booking.settled_date ? ` · ${new Date(booking.settled_date).toLocaleDateString('pl-PL')}` : ''}
        </p>
      )}
    </div>
  );
}