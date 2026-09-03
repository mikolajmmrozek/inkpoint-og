import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Check, RefreshCw, Link2, Unlink } from 'lucide-react';

const CONNECTOR_ID = '6a3d26300e0fa4b3b95a87ab';

export default function GoogleCalendarSync({ theme }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  const t = theme === 'light'
    ? { cardBg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.4)' }
    : { cardBg: 'rgba(255,255,255,0.04)', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)' };

  const checkStatus = async () => {
    try {
      const res = await base44.functions.invoke('manageGoogleCalendar', { action: 'status' });
      setConnected(res.data?.connected === true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) checkStatus();
      else setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkStatus();
        }
      }, 500);
    } catch (e) {
      setError('Nie udało się połączyć z Google Calendar.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setSyncResult(null);
    } catch {
      setError('Nie udało się rozłączyć.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('manageGoogleCalendar', { action: 'sync' });
      if (res.data?.success) {
        setSyncResult(res.data);
      } else {
        setError(res.data?.error || 'Błąd synchronizacji.');
      }
    } catch {
      setError('Błąd synchronizacji. Spróbuj ponownie.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 mb-6" style={{ border: `0.5px solid ${t.border}`, background: t.cardBg }}>
        <div className="w-6 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    );
  }

  return (
    <div className="p-4 mb-6 flex items-center justify-between gap-4 flex-wrap" style={{ border: `0.5px solid ${t.border}`, background: t.cardBg }}>
      <div className="flex items-center gap-3">
        <Calendar size={16} color={connected ? '#16a34a' : 'var(--brand)'} />
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
            GOOGLE CALENDAR
          </p>
          <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>
            {connected ? 'Kalendarz połączony' : 'Połącz swój kalendarz Google'}
          </p>
          {syncResult && (
            <>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.08em', marginTop: '4px' }}>
                ✓ Utworzono: {syncResult.created} · Zaktualizowano: {syncResult.updated}
                {syncResult.skipped > 0 ? ` · Pominięto: ${syncResult.skipped}` : ''}
                {` / ${syncResult.total}`}
              </p>
              {syncResult.errors?.length > 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', letterSpacing: '0.04em', marginTop: '2px', wordBreak: 'break-word' }}>
                  ⚠ {syncResult.errors[0]}
                </p>
              )}
            </>
          )}
          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.08em', marginTop: '4px' }}>
              ⚠ {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', background: syncing ? 'rgb(var(--brand-rgb) /0.3)' : 'linear-gradient(135deg, var(--brand) 0%, var(--brand) 100%)', color: '#F5F0EB', border: 'none', cursor: syncing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'SYNCHRONIZUJĘ...' : 'SYNCHRONIZUJ'}
            </button>
            <button
              onClick={handleDisconnect}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', background: 'transparent', color: t.muted, border: `0.5px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Unlink size={12} />
              ROZŁĄCZ
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand) 100%)', color: '#F5F0EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Link2 size={12} />
            POŁĄCZ KALENDARZ
          </button>
        )}
      </div>
    </div>
  );
}