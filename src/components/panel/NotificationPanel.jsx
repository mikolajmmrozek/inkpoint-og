import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Bell, CheckCheck, Trash2, Calendar, MessageSquare, Info, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = { booking: Calendar, message: MessageSquare, system: Info, health_form: FileText };
const CATEGORY_COLORS = { booking: '#FF007F', message: '#3b82f6', system: '#9ca3af', health_form: '#f59e0b' };

export default function NotificationPanel({ open, onClose, userEmail, theme }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: '#FF007F', unreadBg: 'rgba(255,0,127,0.03)' }
    : { bg: '#0A0A0A', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: '#FF007F', unreadBg: 'rgba(255,0,127,0.04)' };

  const load = async () => {
    if (!userEmail) return;
    try {
      const data = await base44.entities.Notification.filter({ target_email: userEmail }, '-created_date', 100);
      setNotifications(data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) load();
  }, [open, userEmail]);

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

  const deleteNotification = async (id) => {
   try {
     await base44.entities.Notification.delete(id);
     setNotifications(prev => prev.filter(n => n.id !== id));
   } catch (e) {}
  };

  const deleteAll = async () => {
   try {
     await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
     setNotifications([]);
   } catch (e) {}
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    let targetPath = notif.link_path;
    // For message notifications, route to conversation with sender email encoded in URL
    if (notif.category === 'message' && notif.link_data) {
      targetPath = `${notif.link_path}?email=${encodeURIComponent(notif.link_data)}`;
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
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
              POWIADOMIENIA
            </p>
            <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.text, letterSpacing: '0.04em', lineHeight: 1 }}>
              Powiadomienia
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Action buttons */}
         {notifications.length > 0 && (
           <div className="px-6 py-3 flex gap-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
             {notifications.some(n => !n.is_read) && (
               <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: `0.5px solid ${t.fuchsia}`, padding: '6px 10px', cursor: 'pointer' }}>
                 <CheckCheck size={11} /> Przeczytane
               </button>
             )}
             <button onClick={deleteAll} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '6px 10px', cursor: 'pointer' }}>
               <Trash2 size={11} /> Wyczyść
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
            notifications.map(notif => {
              const Icon = CATEGORY_ICONS[notif.category] || Bell;
              const color = CATEGORY_COLORS[notif.category] || '#9ca3af';
              return (
                <div
                  key={notif.id}
                  className="flex gap-3 p-4 cursor-pointer transition-colors hover:opacity-80 group"
                  style={{ borderBottom: `0.5px solid ${t.border}`, background: !notif.is_read ? t.unreadBg : 'transparent' }}
                  onClick={() => handleClick(notif)}
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
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.05em' }}>
                      {format(new Date(notif.created_date), 'dd.MM.yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    {!notif.is_read && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.fuchsia, marginTop: '6px' }} />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                      style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#FF007F'}
                      onMouseLeave={e => e.currentTarget.style.color = t.muted}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}