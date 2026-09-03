import { useState } from 'react';
import { Loader2, Shield, KeyRound, Check, Mail, Apple, Edit3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AccountSecurity({ user, t }) {
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState('');

  const authProvider = user?.auth_provider || user?.provider || user?.oauth_provider;
  const isSocialLogin = authProvider && ['google', 'apple', 'facebook'].includes(authProvider.toLowerCase());

  const handleSave = async () => {
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Wypełnij wszystkie pola.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Nowe hasło musi mieć co najmniej 6 znaków.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Nowe hasła nie są zgodne.');
      return;
    }
    setChanging(true);
    try {
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword,
        newPassword,
      });
      setChanged(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEditing(false);
      setTimeout(() => setChanged(false), 4000);
    } catch (err) {
      setError('Nie udało się zmienić hasła. Sprawdź, czy obecne hasło jest poprawne.');
    } finally {
      setChanging(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setEditing(false);
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    color: t.text,
    padding: '10px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const ProviderIcon = isSocialLogin && authProvider.toLowerCase() === 'apple' ? Apple : Mail;
  const providerLabel = isSocialLogin
    ? authProvider.toLowerCase() === 'apple' ? 'Sign in with Apple' : authProvider.toLowerCase() === 'google' ? 'Google' : authProvider
    : 'E-mail i hasło';

  return (
    <div className="pt-6 mt-8" style={{ borderTop: `0.5px solid ${t.border}` }}>
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          BEZPIECZEŃSTWO
        </p>
        {!editing && !isSocialLogin && (
          <button
            onClick={() => setEditing(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fuchsia, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            <Edit3 size={13} /> ZMIEŃ HASŁO
          </button>
        )}
      </div>

      {/* Login method */}
      <div className="mb-6 p-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${t.border}`, flexShrink: 0 }}>
            <ProviderIcon size={16} color={isSocialLogin ? t.fuchsia : t.muted} />
          </div>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2px' }}>
              METODA LOGOWANIA
            </p>
            <p style={{ fontSize: '13px', color: t.text, fontWeight: 500 }}>{providerLabel}</p>
            {isSocialLogin && (
              <p style={{ fontSize: '11px', color: t.muted, marginTop: '2px' }}>
                Zalogowano przez konto społecznościowe — hasło zarządzane przez dostawcę.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Password change — only in edit mode, email/password users */}
      {!isSocialLogin && editing && (
        <div className="space-y-5">
          <div>
            {label('Obecne hasło')}
            <input
              type="password"
              style={inputStyle}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
          </div>
          <div>
            {label('Nowe hasło')}
            <input
              type="password"
              style={inputStyle}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
          </div>
          <div>
            {label('Powtórz nowe hasło')}
            <input
              type="password"
              style={inputStyle}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>✗ {error}</p>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={changing}
              className="btn-oxblood flex items-center gap-2"
              style={{ opacity: changing ? 0.5 : 1 }}
            >
              {changing ? <><Loader2 size={13} className="animate-spin" /> ZMIENIANIE...</> : 'ZAPISZ ZMIANY'}
            </button>
            <button
              onClick={handleCancel}
              style={{
                fontSize: '10px',
                fontFamily: 'JetBrains Mono',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '13px 31px',
                background: 'transparent',
                color: t.text,
                border: `0.5px solid ${t.text}`,
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              ANULUJ
            </button>
          </div>
        </div>
      )}

      {!isSocialLogin && !editing && changed && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em' }}>
          ✓ HASŁO ZMIENIONE
        </p>
      )}

      {isSocialLogin && (
        <div className="flex items-start gap-3 p-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
          <Shield size={14} color={t.muted} className="flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5 }}>
            Twoje hasło jest zarządzane przez {providerLabel}. Aby je zmienić, zaloguj się do swojego konta u dostawcy.
          </p>
        </div>
      )}
    </div>
  );
}