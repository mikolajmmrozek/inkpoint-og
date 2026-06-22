import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare } from 'lucide-react';
import NotificationBell from '@/components/panel/NotificationBell';

/**
 * Przypięty pasek nawigacji na dole dla widoków mobilnych i tabletów.
 * Trzy ikony: kalendarz, wiadomości, powiadomienia.
 * Props:
 *  - theme: 'light' | 'dark'
 *  - calendarPath: string (np. '/panel/sessions')
 *  - messagesPath: string (np. '/panel/messages')
 */
export default function BottomNav({ theme, calendarPath, messagesPath, onBellClick, userEmail }) {
  const location = useLocation();

  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const activeColor = '#FF007F';
  const inactiveColor = theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)';

  const isCalendarActive = location.pathname.startsWith(calendarPath);
  const isMessagesActive = location.pathname.startsWith(messagesPath);

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
    },

  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
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
          <div className="flex flex-col items-center gap-1 py-2" style={{ minWidth: '60px' }}>
            <Icon size={20} color={color} />
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '7px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color,
              }}
            >
              {item.label}
            </span>
          </div>
        );

        return item.isLink ? (
          <Link key={i} to={item.path} className="flex-1 flex justify-center transition-opacity hover:opacity-70">
            {inner}
          </Link>
        ) : (
          <button
            key={i}
            type="button"
            className="flex-1 flex justify-center transition-opacity hover:opacity-70"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {inner}
          </button>
        );
      })}
      <NotificationBell
        userEmail={userEmail}
        theme={theme}
        onClick={onBellClick}
        size={20}
        showLabel
      />
    </nav>
  );
}