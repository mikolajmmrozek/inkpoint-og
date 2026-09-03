import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Element menu bocznego z licznikiem nieprzeczytanych powiadomień.
 * Mobile/tablet: Link do strony powiadomień.
 * Desktop: przycisk otwierający panel popup.
 */
export default function NotificationSidebarItem({ userEmail, theme, onMobileClick, onDesktopClick, notificationsPath, collapsed }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const inactiveColor = theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)';

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

  const inner = (
    <>
      <div className="shrink-0" style={{ position: 'relative' }}>
        <Bell size={20} color={inactiveColor} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-5px',
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
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: inactiveColor }}>
        Powiadomienia
      </span>
    </>
  );

  return (
    <>
      {/* Mobile/tablet: link do strony powiadomień */}
      <Link
        to={notificationsPath}
        onClick={onMobileClick}
        className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70 lg:hidden"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: inactiveColor }}
      >
        {inner}
      </Link>

      {/* Desktop: link do strony powiadomień */}
      <Link
        to={notificationsPath}
        onClick={onMobileClick}
        className="hidden lg:flex items-center gap-3 px-4 py-3 w-full whitespace-nowrap overflow-hidden hover:opacity-70 transition-colors duration-200"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: inactiveColor }}
        title={collapsed ? 'Powiadomienia' : ''}
      >
        <div className="shrink-0" style={{ position: 'relative' }}>
          <Bell size={20} color={inactiveColor} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-3px', right: '-5px',
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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: inactiveColor }}>
          Powiadomienia
        </span>
      </Link>
    </>
  );
}