import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, X, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function ChangeRequest() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();
  const [cr, setCr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);

  const t = { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)' };

  // Load the request once auth has settled and the user is logged in.
  useEffect(() => {
    if (isLoadingAuth || !authChecked) return;
    if (!isAuthenticated) {
      // Not logged in — stop loading; the UI below offers the login link.
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
      setError('Brak ID prośby.');
      setLoading(false);
      return;
    }
    base44.functions.invoke('clientChangeRequest', { action: 'list_mine' })
      .then(res => {
        const list = res?.data?.data || [];
        const found = list.find(r => r.id === id);
        if (!found) {
          setError('Nie znaleziono prośby lub nie masz do niej dostępu.');
        } else {
          setCr(found);
        }
      })
      .catch(() => setError('Nie udało się załadować prośby.'))
      .finally(() => setLoading(false));
  }, [isLoadingAuth, authChecked, isAuthenticated]);

  const handleAction = async (action) => {
    setActing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('clientChangeRequest', { action, request_id: cr.id });
      if (res?.data?.error) throw new Error(res.data.error);
      navigate('/panel/sessions');
    } catch (e) {
      setError(e.message || 'Wystąpił błąd.');
      setActing(false);
    }
  };

  const goToLogin = () => {
    // Direct redirect to the platform login; after login the user lands back here,
    // or on /panel/sessions where the change-request badge is visible.
    window.location.href = '/panel/sessions';
  };

  // Loading spinner while auth or data is resolving.
  if (isLoadingAuth || !authChecked || (loading && isAuthenticated && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: t.fuchsia }} />
      </div>
    );
  }

  // Not logged in → simple screen with a login link (no black screen, no redirect loop).
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: t.bg }}>
        <div className="max-w-md text-center">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ROMANS TATTOO
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: t.title, letterSpacing: '0.04em', marginBottom: '16px' }}>
            Zaloguj się
          </h1>
          <p style={{ color: t.muted, fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
            Aby zobaczyć propozycję nowego terminu sesji i ją zaakceptować, musisz być zalogowany w panelu klienta.
          </p>
          <button onClick={goToLogin} className="btn-oxblood inline-flex items-center gap-2">
            <LogIn size={13} /> ZALOGUJ SIĘ / PRZEJDŹ DO PANELU
          </button>
        </div>
      </div>
    );
  }

  // Auth error from context (e.g. expired token) → same simple screen.
  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: t.bg }}>
        <div className="max-w-md text-center">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: t.title, letterSpacing: '0.04em', marginBottom: '16px' }}>
            Wymagane logowanie
          </h1>
          <p style={{ color: t.muted, fontSize: '14px', marginBottom: '28px' }}>
            Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować.
          </p>
          <button onClick={goToLogin} className="btn-oxblood inline-flex items-center gap-2">
            <LogIn size={13} /> ZALOGUJ SIĘ
          </button>
        </div>
      </div>
    );
  }

  if (error && !cr) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: t.bg }}>
        <div className="max-w-md text-center">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            BŁĄD
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: t.title, letterSpacing: '0.04em', marginBottom: '16px' }}>
            Nie można załadować
          </h1>
          <p style={{ color: t.muted, fontSize: '14px', marginBottom: '24px' }}>{error}</p>
          <button onClick={() => navigate('/panel/sessions')} className="btn-ghost-parchment">
            WRÓĆ DO SESJI
          </button>
        </div>
      </div>
    );
  }

  const isActionable = cr.status === 'studio_proposed';

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg, color: t.text }}>
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate('/panel/sessions')} className="flex items-center gap-2 mb-6" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <ArrowLeft size={12} /> WRÓĆ DO SESJI
        </button>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
          PROŚBA O ZMIANĘ TERMINU
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', marginBottom: '24px' }}>
          Propozycja studia
        </h1>

        <div className="mb-6 space-y-3">
          <div className="p-3" style={{ border: `0.5px solid ${t.border}`, background: 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
              PIERWOTNY TERMIN (POTWIERDZONY)
            </p>
            <p style={{ fontSize: '14px', color: t.text }}>
              {cr.original_date} {cr.original_time && `· ${cr.original_time}`}
              {cr.original_end_time && `–${cr.original_end_time}`}
              {cr.artist_name && ` · ${cr.artist_name}`}
            </p>
          </div>

          <div className="p-3" style={{ border: `0.5px solid ${t.border}`, background: 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
              PROSIŁEŚ O
            </p>
            <p style={{ fontSize: '14px', color: t.muted }}>
              {cr.requested_date} {cr.requested_time && `· ${cr.requested_time}`}
            </p>
          </div>

          <div className="p-4" style={{ border: `0.5px solid ${t.fuchsia}`, background: 'rgb(var(--brand-rgb) /0.06)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
              STUDIO PROPONUJE
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.text, letterSpacing: '0.04em' }}>
              {cr.studio_proposed_date} {cr.studio_proposed_time && `· ${cr.studio_proposed_time}`}
            </p>
            {cr.studio_proposed_end_time && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, marginTop: '4px' }}>
                do {cr.studio_proposed_end_time}
              </p>
            )}
            {cr.studio_note && (
              <p style={{ fontSize: '13px', color: t.muted, marginTop: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderLeft: `1px solid ${t.fuchsia}` }}>
                {cr.studio_note}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3" style={{ border: '0.5px solid var(--brand)', background: 'rgb(var(--brand-rgb) /0.08)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>⚠ {error}</p>
          </div>
        )}

        {isActionable ? (
          <>
            <p style={{ fontSize: '12px', color: t.muted, marginBottom: '16px', lineHeight: 1.5 }}>
              Zaakceptuj propozycję, aby zmienić termin sesji. Odrzucenie zostawi pierwotny termin potwierdzony.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('client_accept')}
                disabled={acting}
                className="btn-oxblood flex-1 flex items-center justify-center gap-2"
                style={{ opacity: acting ? 0.5 : 1 }}
              >
                {acting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} AKCEPTUJ NOWY TERMIN
              </button>
              <button
                onClick={() => handleAction('client_decline')}
                disabled={acting}
                className="btn-ghost-parchment flex items-center justify-center gap-2"
                style={{ opacity: acting ? 0.5 : 1 }}
              >
                <X size={13} /> ODRZUĆ
              </button>
            </div>
          </>
        ) : (
          <div className="p-5" style={{ border: `0.5px solid ${t.border}`, background: 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              TA ZMIANA JUŻ NIE JEST AKTUALNA
            </p>
            <p style={{ fontSize: '14px', color: t.text, marginBottom: '20px', lineHeight: 1.5 }}>
              {cr.status === 'accepted_by_client' ? 'Zaakceptowałeś już tę propozycję nowego terminu.'
                : cr.status === 'declined_by_client' ? 'Odrzuciłeś już tę propozycję. Pierwotny termin pozostaje potwierdzony.'
                : cr.status === 'accepted_by_studio' ? 'Studio zaakceptowało Twój proponowany termin.'
                : cr.status === 'rejected' ? 'Studio odrzuciło Twoją prośbę o zmianę. Pierwotny termin pozostaje potwierdzony.'
                : cr.status === 'expired' ? 'Ta prośba o zmianę terminu wygasła.'
                : 'Ta prośba została już rozstrzygnięta.'}
            </p>
            <button onClick={() => navigate('/panel/sessions')} className="btn-oxblood inline-flex items-center gap-2">
              <ArrowLeft size={13} /> WRÓĆ DO PANELU KLIENTA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}