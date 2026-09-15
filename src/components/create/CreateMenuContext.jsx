import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import CreateMenuFAB from './CreateMenuFAB';
import BookingModal from '@/components/dashboard/BookingModal';
import QuickAvailabilityModal from './QuickAvailabilityModal';
import QuickClientModal from './QuickClientModal';

const CreateMenuContext = createContext(null);
export const useCreateMenu = () => useContext(CreateMenuContext);

// Build the theme token object used across dashboard modals.
export const buildThemeT = (theme) => theme === 'light'
  ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)', fuchsia: 'var(--brand)' }
  : { bg: 'rgba(255,255,255,0.06)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)', fuchsia: 'var(--brand)' };

export function CreateMenuProvider({ children, role, theme, selfArtistId }) {
  const navigate = useNavigate();
  const [action, setAction] = useState(null); // 'booking' | 'availability' | 'client'
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [availPrefill, setAvailPrefill] = useState(null);
  const refreshRef = useRef({ bookings: null, availability: null, clients: null });

  const t = buildThemeT(theme);

  const registerBookingsRefresh = useCallback((fn) => { refreshRef.current.bookings = fn; }, []);
  const registerAvailabilityRefresh = useCallback((fn) => { refreshRef.current.availability = fn; }, []);
  const registerClientsRefresh = useCallback((fn) => { refreshRef.current.clients = fn; }, []);

  const newBooking = useCallback((prefill) => { setBookingPrefill(prefill || null); setAction('booking'); }, []);
  const newAvailability = useCallback((prefill) => {
    const pre = prefill || (role === 'artist' && selfArtistId ? { artist_id: selfArtistId } : null);
    setAvailPrefill(pre);
    setAction('availability');
  }, [role, selfArtistId]);
  const newClient = useCallback(() => setAction('client'), []);
  const newHealthForm = useCallback(() => navigate('/health-form'), [navigate]);

  const closeAll = () => { setAction(null); setBookingPrefill(null); setAvailPrefill(null); };

  const runRefresh = async (key) => {
    const fn = refreshRef.current[key];
    if (fn) { try { await fn(); } catch (e) { /* keep current list on error */ } }
  };

  const handleBookingSaved = async () => {
    closeAll();
    toast({ title: 'Rezerwacja zapisana' });
    await runRefresh('bookings');
  };

  const handleAvailSaved = async () => {
    closeAll();
    toast({ title: 'Dyspozycja dodana' });
    await runRefresh('availability');
  };

  const handleClientSaved = async (clientName) => {
    closeAll();
    toast({ title: 'Klient dodany', description: clientName });
    await runRefresh('clients');
  };

  return (
    <CreateMenuContext.Provider value={{ newBooking, newAvailability, newClient, newHealthForm, registerBookingsRefresh, registerAvailabilityRefresh, registerClientsRefresh, role }}>
      {children}
      {role !== 'user' && !action && (
        <CreateMenuFAB
          theme={theme}
          onNewBooking={() => newBooking(null)}
          onNewAvailability={() => newAvailability(null)}
          onNewHealthForm={newHealthForm}
          onNewClient={newClient}
        />
      )}
      <AnimatePresence>
        {action === 'booking' && (
          <BookingModal
            key="booking"
            booking={bookingPrefill}
            defaultDate={bookingPrefill?.session_date || ''}
            onClose={closeAll}
            onSaved={handleBookingSaved}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {action === 'availability' && (
          <QuickAvailabilityModal
            key="availability"
            prefill={availPrefill}
            role={role}
            onClose={closeAll}
            onSaved={handleAvailSaved}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {action === 'client' && (
          <QuickClientModal
            key="client"
            onClose={closeAll}
            onSaved={handleClientSaved}
            t={t}
          />
        )}
      </AnimatePresence>
    </CreateMenuContext.Provider>
  );
}