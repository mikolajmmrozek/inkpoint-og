import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getNotificationEmail } from '@/lib/adminConstants';
import { Bell } from 'lucide-react';

export default function NotificationBell({ userEmail, theme, onClick, size = 18, showLabel = false }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const notifEmail = getNotificationEmail(user?.role, userEmail);

  const inactiveColor = theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)';

  const loadCount = async () => {
    if (!userEmail) return;
    try {
      const all = await base44.entities.Notification.filter({ target_email: notifEmail }, '-created_date', 100);
      setUnreadCount(all.filter(n => !n.is_read).length);
    } catch (e) {}
  };

  useEffect(() => {
    loadCount();
    const unsubscribe = base44.entities.Notification.subscribe(() => loadCount());
    const interval = setInterval(loadCount, 30000);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(interval);
    };
  }, [notifEmail]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 transition-opacity hover:opacity-70"
      style={{ background: 'none', border: 'none', cursor: 'pointer', minWidth: showLabel ? '60px' : 'auto', padding: showLabel ? '8px 0' : '8px' }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={size} color={inactiveColor} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-4px',
            minWidth: '14px', height: '14px',
            background: 'var(--brand)', color: '#F5F0EB',
            fontSize: '8px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '7px', padding: '0 3px',
            fontFamily: 'var(--font-mono)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {showLabel && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '7px',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: inactiveColor,
        }}>
          Powiadomienia
        </span>
      )}
    </button>
  );
}