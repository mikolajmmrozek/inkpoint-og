import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getNotificationEmail } from '@/lib/adminConstants';
import { X, Bell, CheckCheck, Calendar, MessageSquare, Info, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = { booking: Calendar, message: MessageSquare, system: Info, health_form: FileText };
const CATEGORY_COLORS = { booking: 'var(--brand)', message: '#3b82f6', system: '#9ca3af', health_form: '#f59e0b' };

export default function NotificationPanel({ open, onClose, userEmail, theme, notificationsPath = '/dashboard/notifications' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const notifEmail = getNotificationEmail(user?.role, userEmail);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: 'var(--brand)', unreadBg: 'rgb(var(--brand-rgb) /0.03)' }
    : { bg: '#0A0A0A', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)', unreadBg: 'rgb(var(--brand-rgb) /0.04)' };

  const load = async () => {
    if (!userEmail) return;
    try {
      const data = await base44.entities.Notification.filter({ target_email: notifEmail }, '-created_date', 100);
      setNotifications(data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) load();
  }, [open, notifEmail]);

  useEffect(() => {
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        setNotifications(prev => prev.some(n => n.id === event.data.id) ? prev : [event.data, ...prev]);
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.data.id ? { ...n, ...event.data } : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.data.id));
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const markRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    try {
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    let targetPath = notif.link_path;
    // For message notifications, route to conversation with sender email encoded in URL
    if (notif.category === 'message' && notif.link_data) {
      targetPath = `${notif.link_path}?email=${encodeURIComponent(notif.link_data)}`;
    }
    // For booking notifications, ensure booking_id + date are in the URL so the
    // destination page can deep-link straight to the session. Old notifications
    // stored only "/dashboard/bookings" without the query string — reconstruct it.
    if (notif.category === 'booking' && notif.booking_id) {
      try {
        const [base, qs] = (targetPath || '').split('?');
        const params = new URLSearchParams(qs || '');
        if (!params.get('booking_id')) {
          params.set('booking_id', notif.booking_id);
          if (notif.booking_date) params.set('date', notif.booking_date);
          targetPath = `${base}?${params.toString()}`;
        }
      } catch (e) {}
    }
    if (targetPath) {
      onClose();
      navigate(targetPath);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md flex flex-col"
        style={{ background: t.bg, borderLeft: `0.5px solid ${t.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              POWIADOMIENIA
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.text, letterSpacing: '0.04em', lineHeight: 1 }}>
              Powiadomienia
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); navigate(notificationsPath); }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: `0.5px solid ${t.fuchsia}`, padding: '6px 12px', cursor: 'pointer' }}
            >
              Pokaż wszystkie
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mark all read */}
        {notifications.some(n => !n.is_read) && (
          <div className="px-6 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>
              <CheckCheck size={12} /> Oznacz wszystkie jako przeczytane
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bell size={28} color={t.muted} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', color: t.muted }}>Brak powiadomień</p>
            </div>
          ) : (
            <>
              {notifications.slice(0, 10).map(notif => {
                const Icon = CATEGORY_ICONS[notif.category] || Bell;
                const color = CATEGORY_COLORS[notif.category] || '#9ca3af';
                return (
                  <div
                     key={notif.id}
                     onClick={() => handleClick(notif)}
                     className="flex gap-3 p-4 cursor-pointer transition-colors hover:opacity-80"
                     style={{ borderBottom: `0.5px solid ${t.border}`, background: !notif.is_read ? t.unreadBg : 'transparent' }}
                   >
                     <div className="flex-shrink-0 mt-0.5">
                       <Icon size={14} color={color} />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p style={{ fontSize: '13px', color: t.text, fontWeight: !notif.is_read ? 500 : 400, marginBottom: '2px' }}>
                         {notif.title}
                       </p>
                       <p style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5, marginBottom: '4px' }}>
                         {notif.message}
                       </p>
                       <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.05em' }}>
                         {format(new Date(notif.created_date), 'dd.MM.yyyy HH:mm')}
                       </p>
                     </div>
                     {!notif.is_read && (
                       <div className="flex-shrink-0 mt-1.5">
                         <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.fuchsia }} />
                       </div>
                     )}
                   </div>
                );
              })}
              {notifications.length > 10 && (
                <div className="p-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <button
                    onClick={() => {
                       onClose();
                       navigate(notificationsPath);
                     }}
                    style={{ width: '100%', padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: `0.5px solid ${t.fuchsia}`, cursor: 'pointer' }}
                  >
                    Pokaż wszystkie
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}