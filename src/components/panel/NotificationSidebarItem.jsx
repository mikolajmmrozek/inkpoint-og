import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell } from 'lucide-react';

/**
 * Element menu bocznego z licznikiem nieprzeczytanych powiadomień.
 * Kliknięcie otwiera panel powiadomień.
 */
export default function NotificationSidebarItem({ userEmail, theme, onClick }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const inactiveColor = theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';

  const loadCount = async () => {
    if (!userEmail) return;
    try {
      const all = await base44.entities.Notification.filter({ target_email: userEmail }, '-created_date', 100);
      setUnreadCount(all.filter(n => !n.is_read).length);
    } catch (e) {}
  };

  useEffect(() => {
    loadCount();
    const unsubscribe = base44.entities.Notification.subscribe(() => loadCount());
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [userEmail]);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: inactiveColor }}
    >
      <div style={{ position: 'relative' }}>
        <Bell size={14} color={inactiveColor} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-5px',
            minWidth: '14px', height: '14px',
            background: '#FF007F', color: '#F5F0EB',
            fontSize: '8px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '7px', padding: '0 3px',
            fontFamily: 'JetBrains Mono',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: inactiveColor }}>
        Powiadomienia
      </span>
    </button>
  );
}