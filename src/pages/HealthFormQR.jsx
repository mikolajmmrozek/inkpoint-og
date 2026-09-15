// Full-screen branded QR page for the health-form survey.
// Shows the QR code (for scanning) plus a "Wypełnij ankietę" button that
// navigates to the form directly on the same device. Being a real route
// (not a blob) lets the form's success screen link back here.
import { useState, useEffect } from 'react';

export default function HealthFormQR() {
  const [bookingId, setBookingId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBookingId(params.get('booking_id') || '');
  }, []);

  const formUrl = bookingId
    ? `${window.location.origin}/health-form?booking_id=${encodeURIComponent(bookingId)}`
    : `${window.location.origin}/health-form`;
  const formLink = bookingId
    ? `/health-form?booking_id=${encodeURIComponent(bookingId)}`
    : '/health-form';
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(formUrl)}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        color: '#F5F0EB',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        backgroundImage:
          'radial-gradient(ellipse 55% 45% at -5% 0%, rgba(255,0,127,0.45) 0%, rgba(255,0,127,0.12) 40%, transparent 70%), radial-gradient(ellipse 45% 40% at 105% 100%, rgba(255,0,127,0.4) 0%, rgba(255,0,127,0.10) 40%, transparent 65%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, marginBottom: '8px' }}>
        <span style={{ fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif", fontSize: '44px', fontWeight: 400, letterSpacing: '0.08em', color: '#F5F0EB' }}>
          ROMANS
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.2em', color: '#FF007F', textTransform: 'uppercase', marginTop: '4px' }}>
          TATTOO
        </span>
      </div>

      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.5)', margin: '28px 0' }}>
        Skanuj, aby wypełnić ankietę
      </p>

      <div style={{ background: '#F5F0EB', padding: '18px', borderRadius: '2px', boxShadow: '0 0 80px rgba(255,0,127,0.28)' }}>
        <img src={qrImg} alt="QR kod ankiety" style={{ display: 'block', width: '320px', height: '320px', maxWidth: '70vw' }} />
      </div>

      <p style={{ marginTop: '28px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,240,235,0.6)' }}>
        Nakieruj aparat telefonu na kod
      </p>

      <a
        href={formLink}
        style={{
          display: 'inline-block',
          marginTop: '24px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#F5F0EB',
          textDecoration: 'none',
          padding: '14px 32px',
          background: '#FF007F',
        }}
      >
        WYPEŁNIJ ANKIETĘ
      </a>

      <p style={{ marginTop: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(245,240,235,0.32)', wordBreak: 'break-all', maxWidth: '440px', lineHeight: 1.6 }}>
        {formUrl}
      </p>
    </div>
  );
}