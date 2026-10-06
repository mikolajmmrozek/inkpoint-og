import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getNotificationEmail } from '@/lib/adminConstants';

/**
 * Centralny hook pobierający liczniki nieprzeczytanych wiadomości,
 * powiadomień oraz wskaźniki "nowych rzeczy" dla sekcji dashboardu.
 *
 * @param {Object} params
 * @param {string} params.role - 'admin' | 'artist' | 'user'
 * @param {string} params.userEmail - e-mail zalogowanego użytkownika
 */
export function useBadgeCounts({ role, userEmail }) {
  const [counts, setCounts] = useState({
    messages: 0,
    notifications: 0,
    pendingBookings: 0,
    newHealthForms: 0,
    unpublishedFeedback: 0,
    newClients: 0,
    openChangeRequests: 0,
  });

  useEffect(() => {
    if (!userEmail) return;

    let cancelled = false;

    const loadAll = async () => {
      const results = {
        messages: 0,
        notifications: 0,
        pendingBookings: 0,
        newHealthForms: 0,
        unpublishedFeedback: 0,
        newClients: 0,
        openChangeRequests: 0,
      };

      // Wiadomości
      try {
        if (role === 'admin') {
          const msgs = await base44.entities.ContactMessage.filter(
            { is_read: false, sender_type: 'client' },
            '-created_date',
            200
          );
          results.messages = msgs.length;
        } else if (role === 'artist') {
          const msgs = await base44.entities.ContactMessage.filter(
            { is_read: false },
            '-created_date',
            200
          );
          results.messages = msgs.filter(
            (m) => m.sender_type === 'client' || m.sender_type === 'admin'
          ).length;
        } else if (role === 'user') {
          const msgs = await base44.entities.ContactMessage.filter(
            { is_read: false, email: userEmail },
            '-created_date',
            200
          );
          results.messages = msgs.filter(
            (m) => m.sender_type === 'admin' || m.sender_type === 'system'
          ).length;
        }
      } catch (e) {}

      // Powiadomienia
      try {
        const notifs = await base44.entities.Notification.filter(
          { target_email: getNotificationEmail(role, userEmail), is_read: false },
          '-created_date',
          100
        );
        results.notifications = notifs.length;
      } catch (e) {}

      // Tylko dla admina
      if (role === 'admin') {
        try {
          const bookings = await base44.entities.Booking.filter(
            { status: 'pending' },
            '-created_date',
            100
          );
          results.pendingBookings = bookings.length;
        } catch (e) {}

        try {
          const healthForms = await base44.entities.HealthForm.filter(
            { is_read: false },
            '-created_date',
            100
          );
          results.newHealthForms = healthForms.filter(
            (f) => !f.is_draft
          ).length;
        } catch (e) {}

        try {
          const feedbacks = await base44.entities.Feedback.filter(
            { is_published: false },
            '-created_date',
            50
          );
          results.unpublishedFeedback = feedbacks.length;
        } catch (e) {}

        try {
          const clients = await base44.entities.Client.filter(
            { is_read: false },
            '-created_date',
            100
          );
          results.newClients = clients.length;
        } catch (e) {}

        try {
          const crs = await base44.entities.ChangeRequest.list('-created_date', 100);
          results.openChangeRequests = crs.filter(
            (r) => r.status === 'pending' || r.status === 'studio_proposed'
          ).length;
        } catch (e) {}
      }

      if (!cancelled) setCounts(results);
    };

    loadAll();

    // Subskrypcje realtime — update counters na żywo bez pełnego reload
    const unsubs = [];
    
    // Powiadomienia
    try {
      unsubs.push(
        base44.entities.Notification.subscribe((event) => {
          setCounts(prev => {
            const unreadCount = event.data.is_read ? -1 : (event.type === 'delete' ? -1 : 1);
            return {
              ...prev,
              notifications: Math.max(0, prev.notifications + unreadCount)
            };
          });
        })
      );
    } catch (e) {}

    // Wiadomości
    try {
      unsubs.push(
        base44.entities.ContactMessage.subscribe((event) => {
          if (role === 'admin') {
            const isClientMsg = event.data.sender_type === 'client' && !event.data.is_read;
            const unreadChange = event.type === 'delete' ? -1 : (isClientMsg ? 1 : 0);
            setCounts(prev => ({ ...prev, messages: Math.max(0, prev.messages + unreadChange) }));
          } else if (role === 'artist') {
            const isUnread = !event.data.is_read && (event.data.sender_type === 'client' || event.data.sender_type === 'admin');
            const unreadChange = event.type === 'delete' ? -1 : (isUnread ? 1 : 0);
            setCounts(prev => ({ ...prev, messages: Math.max(0, prev.messages + unreadChange) }));
          } else if (role === 'user' && event.data.email?.toLowerCase() === userEmail?.toLowerCase()) {
            const isUnread = !event.data.is_read && (event.data.sender_type === 'admin' || event.data.sender_type === 'system');
            const unreadChange = event.type === 'delete' ? -1 : (isUnread ? 1 : 0);
            setCounts(prev => ({ ...prev, messages: Math.max(0, prev.messages + unreadChange) }));
          }
        })
      );
    } catch (e) {}

    if (role === 'admin') {
      try {
        unsubs.push(
          base44.entities.Booking.subscribe((event) => {
            const isPending = event.data.status === 'pending';
            const wasDeleted = event.type === 'delete';
            const unreadChange = wasDeleted ? -1 : (isPending ? 1 : 0);
            setCounts(prev => ({ ...prev, pendingBookings: Math.max(0, prev.pendingBookings + unreadChange) }));
          })
        );
      } catch (e) {}

      try {
        unsubs.push(
          base44.entities.HealthForm.subscribe(() => loadAll())
        );
      } catch (e) {}

      try {
        unsubs.push(
          base44.entities.Client.subscribe(() => loadAll())
        );
      } catch (e) {}

      try {
        unsubs.push(
          base44.entities.Feedback.subscribe((event) => {
            const isUnpublished = !event.data.is_published;
            const wasDeleted = event.type === 'delete';
            const unreadChange = wasDeleted ? -1 : (isUnpublished ? 1 : 0);
            setCounts(prev => ({ ...prev, unpublishedFeedback: Math.max(0, prev.unpublishedFeedback + unreadChange) }));
          })
        );
      } catch (e) {}

      try {
        unsubs.push(
          base44.entities.ChangeRequest.subscribe(() => loadAll())
        );
      } catch (e) {}
    }

    // Polling fallback (60s) — realtime subscriptions handle live updates
    const interval = setInterval(loadAll, 60000);

    return () => {
      cancelled = true;
      unsubs.forEach((u) => {
        if (typeof u === 'function') u();
      });
      clearInterval(interval);
    };
  }, [userEmail, role]);

  return counts;
}