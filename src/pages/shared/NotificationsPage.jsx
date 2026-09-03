import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getNotificationEmail } from '@/lib/adminConstants';
import { useOutletContext } from 'react-router-dom';
import { Bell, CheckCheck, Calendar, MessageSquare, Info, FileText, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = { booking: Calendar, message: MessageSquare, system: Info, health_form: FileText };
const CATEGORY_COLORS = { booking: 'var(--brand)', message: '#3b82f6', system: '#9ca3af', health_form: '#f59e0b' };

/**
 * Pełnostronicowy widok powiadomień — używany na mobile/tablet zamiast popupu.
 * Pobiera theme z Outlet context panelu, w którym jest osadzona.
 */
export default function NotificationsPage() {
  const { user } = useAuth();
  const { theme } = useOutletContext() || {};
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const pageSize = 15;

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: 'var(--brand)', unreadBg: 'rgb(var(--brand-rgb) /0.03)' }
    : { bg: '#0A0A0A', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)', unreadBg: 'rgb(var(--brand-rgb) /0.04)' };

  const userEmail = getNotificationEmail(user?.role, user?.email);

  const load = async () => {
    if (!userEmail) return;
    try {
      const data = await base44.entities.Notification.filter({ target_email: userEmail }, '-created_date', 100);
      setNotifications(data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    load();
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
  }, [userEmail]);

  const markRead = async (id, e) => {
    e?.stopPropagation();
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

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await base44.entities.Notification.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error('Delete notification error:', err); }
  };

  const deleteAll = async () => {
    setDeletingAll(true);
    try {
      await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
      setNotifications([]);
    } catch (err) { console.error('Delete all error:', err); }
    setDeletingAll(false);
    setConfirmDeleteAll(false);
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.link_path) {
      // Use link_data if available (e.g., email parameter for messages)
      const url = notif.link_data ? `${notif.link_path}?email=${encodeURIComponent(notif.link_data)}` : notif.link_path;
      navigate(url);
    }
  };

  const totalPages = Math.ceil(notifications.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedNotifications = notifications.slice(startIdx, endIdx);

  return (
    <div>
      {/* Actions */}
      <div className="mb-6 flex items-center justify-end flex-wrap gap-2">
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>
            <CheckCheck size={12} /> Przeczytane
          </button>
        )}
        {notifications.length > 0 && (
          <button onClick={() => setConfirmDeleteAll(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#FF4444', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={12} /> Usuń wszystkie
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, minHeight: '400px' }}>
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
          paginatedNotifications.map(notif => {
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
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {!notif.is_read && (
                      <button onClick={(e) => markRead(notif.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }} title="Oznacz jako przeczytane">
                        <Check size={13} color={t.fuchsia} />
                      </button>
                    )}
                    <button onClick={(e) => deleteNotification(notif.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }} title="Usuń">
                      <Trash2 size={13} color={t.muted} />
                    </button>
                    {!notif.is_read && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.fuchsia, marginLeft: '2px' }} />
                    )}
                  </div>
              </div>
            );
          })
          )}
          </div>

          {/* Pagination */}
          {notifications.length > pageSize && (
          <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: currentPage === 1 ? t.muted : t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={12} /> Nowsze
          </button>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em' }}>
            Strona {currentPage} z {totalPages}
          </p>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: currentPage === totalPages ? t.muted : t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Starsze <ChevronRight size={12} />
          </button>
          </div>
          )}

      {/* Confirmation modal — delete all */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setConfirmDeleteAll(false)}>
          <div className="w-full max-w-sm" style={{ background: t.bg, border: `0.5px solid ${t.border}`, padding: '36px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={16} color="#FF4444" />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#FF4444', letterSpacing: '0.2em', textTransform: 'uppercase' }}>USUŃ WSZYSTKIE</p>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.text, letterSpacing: '0.04em', marginBottom: '12px' }}>
              Czy na pewno?
            </h3>
            <p style={{ fontSize: '13px', color: t.muted, lineHeight: 1.6, marginBottom: '24px' }}>
              Czy na pewno chcesz usunąć wszystkie powiadomienia ({notifications.length})? Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3">
              <button onClick={deleteAll} disabled={deletingAll} className="btn-oxblood flex-1" style={{ opacity: deletingAll ? 0.5 : 1 }}>
                {deletingAll ? 'USUWANIE...' : 'TAK, USUŃ'}
              </button>
              <button onClick={() => setConfirmDeleteAll(false)} className="btn-ghost-parchment" style={{ flex: 1 }}>
                ANULUJ
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }