import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import CreateMenuFAB from './CreateMenuFAB';
import BookingModal from '@/components/dashboard/BookingModal';
import QuickAvailabilityModal from './QuickAvailabilityModal';
import QuickPromotionModal from './QuickPromotionModal';
import QuickSaleModal from '@/components/sales/QuickSaleModal';
import { openHealthFormQRPage } from '@/lib/qrPage';
import GatekeeperChat from '@/components/gatekeeper/GatekeeperChat';
import ArtistGatekeeperChat from '@/components/gatekeeper/ArtistGatekeeperChat';

const CreateMenuContext = createContext(null);
export const useCreateMenu = () => useContext(CreateMenuContext);

// Build the theme token object used across dashboard modals.
export const buildThemeT = (theme) => theme === 'light'
  ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.62)', fuchsia: 'var(--brand)' }
  : { bg: 'rgba(255,255,255,0.06)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.72)', fuchsia: 'var(--brand)' };

export function CreateMenuProvider({ children, role, theme, selfArtistId }) {
  const navigate = useNavigate();
  const [action, setAction] = useState(null); // 'booking' | 'availability' | 'client' | 'promotion'
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [availPrefill, setAvailPrefill] = useState(null);
  const refreshRef = useRef({ bookings: null, availability: null, clients: null });
  const selectedDateRef = useRef('');

  const t = buildThemeT(theme);

  const registerBookingsRefresh = useCallback((fn) => { refreshRef.current.bookings = fn; }, []);
  const registerAvailabilityRefresh = useCallback((fn) => { refreshRef.current.availability = fn; }, []);
  const registerClientsRefresh = useCallback((fn) => { refreshRef.current.clients = fn; }, []);
  // Dashboard bookings page registers the currently selected day so the FAB
  // booking/dyspozycja options prefill that day instead of today.
  const registerSelectedDate = useCallback((dateStr) => { selectedDateRef.current = dateStr || ''; }, []);

  const newBooking = useCallback((prefill) => {
    const pre = prefill || (selectedDateRef.current ? { _prefill: true, session_date: selectedDateRef.current } : null);
    setBookingPrefill(pre);
    setAction('booking');
  }, []);
  const newAvailability = useCallback((prefill) => {
    let pre = prefill || null;
    if (!pre && role === 'artist' && selfArtistId) pre = { artist_id: selfArtistId };
    if (selectedDateRef.current) pre = { ...(pre || {}), date: selectedDateRef.current };
    setAvailPrefill(pre);
    setAction('availability');
  }, [role, selfArtistId]);
  // Nowy klient: zamiast okna wpisywania otwieramy stronę z kodem QR formularza.
  const newClient = useCallback(() => { navigate('/nowy-klient-qr'); }, [navigate]);
  const newPromotion = useCallback(() => setAction('promotion'), []);
  const newHealthForm = useCallback(() => {
    openHealthFormQRPage(`${window.location.origin}/health-form`);
  }, []);
  const newGatekeeper = useCallback(() => setAction('gatekeeper'), []);
  const newSale = useCallback(() => setAction('sale'), []);

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

  const handlePromotionSaved = async () => {
    closeAll();
    toast({ title: 'Promocja utworzona' });
  };

  const handleSaleSaved = async (sale) => {
    closeAll();
    toast({ title: 'Sprzedaż zapisana', description: `Razem ${Number(sale?.total || 0).toLocaleString('pl-PL')} zł` });
    await runRefresh('bookings');
  };

  return (
    <CreateMenuContext.Provider value={{ newBooking, newSale, newAvailability, newClient, newPromotion, newHealthForm, newGatekeeper, registerBookingsRefresh, registerAvailabilityRefresh, registerClientsRefresh, registerSelectedDate, role }}>
      {children}
      {role !== 'user' && !action && (
        <CreateMenuFAB
          theme={theme}
          role={role}
          onNewBooking={() => newBooking(null)}
          onNewSale={() => newSale()}
          onNewAvailability={() => newAvailability(null)}
          onNewHealthForm={newHealthForm}
          onNewClient={newClient}
          onNewPromotion={newPromotion}
          onNewGatekeeper={newGatekeeper}
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
            lockArtistId={role === 'artist' ? selfArtistId : undefined}
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
        {action === 'promotion' && (
          <QuickPromotionModal
            key="promotion"
            onClose={closeAll}
            onSaved={handlePromotionSaved}
            t={t}
            theme={theme}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {action === 'sale' && (
          <QuickSaleModal
            key="sale"
            theme={theme}
            role={role}
            selfArtistId={selfArtistId}
            t={t}
            onClose={closeAll}
            onSaved={handleSaleSaved}
          />
        )}
      </AnimatePresence>
      {action === 'gatekeeper' && (
        role === 'artist'
          ? <ArtistGatekeeperChat key="gatekeeper" theme={theme} onClose={closeAll} />
          : <GatekeeperChat key="gatekeeper" theme={theme} onClose={closeAll} />
      )}
    </CreateMenuContext.Provider>
  );
}