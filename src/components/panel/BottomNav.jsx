import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getNotificationEmail } from '@/lib/adminConstants';

/**
 * Przypięty pasek nawigacji na dole dla widoków mobilnych i tabletów.
 * Trzy ikony w równych odstępach: kalendarz, wiadomości, powiadomienia.
 */
export default function BottomNav({ theme, calendarPath, messagesPath, notificationsPath, userEmail, role }) {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const activeColor = 'var(--brand)';
  const inactiveColor = theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)';

  const isCalendarActive = location.pathname.startsWith(calendarPath);
  const isMessagesActive = location.pathname.startsWith(messagesPath);
  const isNotificationsActive = location.pathname.startsWith(notificationsPath);

  const loadCount = async () => {
    if (!userEmail) return;
    try {
      const all = await base44.entities.Notification.filter({ target_email: getNotificationEmail(role, userEmail) }, '-created_date', 100);
      setUnreadCount(all.filter(n => !n.is_read).length);
    } catch (e) {}
  };

  const loadMessages = async () => {
    if (!userEmail) return;
    try {
      const normalizedEmail = userEmail.toLowerCase().trim();
      if (role === 'admin') {
        const msgs = await base44.entities.ContactMessage.filter({ is_read: false, sender_type: 'client' }, '-created_date', 200);
        setUnreadMessages(msgs.length);
      } else if (role === 'artist') {
        const msgs = await base44.entities.ContactMessage.filter({ is_read: false }, '-created_date', 200);
        setUnreadMessages(msgs.filter(m => m.sender_type === 'client' || m.sender_type === 'admin').length);
      } else {
        const msgs = await base44.entities.ContactMessage.filter({ is_read: false }, '-created_date', 200);
        const count = msgs.filter(m => {
          const msgEmail = (m.email || '').toLowerCase().trim();
          return msgEmail === normalizedEmail && (m.sender_type === 'admin' || m.sender_type === 'system');
        }).length;
        setUnreadMessages(count);
      }
    } catch (e) { console.log('Load messages error:', e); }
  };

  useEffect(() => {
    loadCount();
    loadMessages();
    const unsubNotif = base44.entities.Notification.subscribe(() => loadCount());
    const unsubMsg = base44.entities.ContactMessage.subscribe(() => loadMessages());
    const interval = setInterval(() => {
      loadCount();
      loadMessages();
    }, 60000);
    return () => {
      if (typeof unsubNotif === 'function') unsubNotif();
      if (typeof unsubMsg === 'function') unsubMsg();
      clearInterval(interval);
    };
  }, [userEmail, role]);

  const items = [
    {
      icon: Calendar,
      label: 'Kalendarz',
      path: calendarPath,
      active: isCalendarActive,
      isLink: true,
    },
    {
      icon: MessageSquare,
      label: 'Wiadomości',
      path: messagesPath,
      active: isMessagesActive,
      isLink: true,
      badge: unreadMessages,
    },
    {
      icon: Bell,
      label: 'Powiadomienia',
      path: notificationsPath,
      active: isNotificationsActive,
      isLink: true,
      badge: unreadCount,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: bg,
        borderTop: `0.5px solid ${border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const color = item.active ? activeColor : inactiveColor;

        const inner = (
          <div className="flex flex-col items-center gap-1.5 py-4" style={{ minWidth: '72px' }}>
            <div style={{ position: 'relative' }}>
              <Icon size={24} color={color} />
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '-4px',
                  minWidth: '14px', height: '14px',
                  background: 'var(--brand)', color: '#F5F0EB',
                  fontSize: '8px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '7px', padding: '0 3px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color,
              }}
            >
              {item.label}
            </span>
          </div>
        );

        return (
          <Link key={i} to={item.path} className="flex-1 flex justify-center transition-opacity hover:opacity-70">
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}