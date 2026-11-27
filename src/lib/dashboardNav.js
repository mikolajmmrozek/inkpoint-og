import {
  Calendar, BookOpen, MessageSquare, FileText, BarChart2, UserCircle, Star, FolderOpen,
  Scissors, Gift, ShoppingBag, CalendarDays, PieChart, ShieldCheck, Settings, Users, Mail,
} from 'lucide-react';

// Menu panelu administracyjnego w kategoriach. Kolejność grup i pozycji = kolejność w panelu.
export const NAV_GROUPS = [
  {
    key: 'overview',
    label: null,
    items: [{ path: '/dashboard', label: 'Przegląd', icon: BarChart2, exact: true }],
  },
  {
    key: 'visits',
    label: 'Wizyty i klienci',
    items: [
      { path: '/dashboard/bookings', label: 'Rezerwacje', icon: Calendar },
      { path: '/dashboard/clients', label: 'Klienci', icon: UserCircle },
      { path: '/dashboard/health-forms', label: 'Ankiety', icon: FileText },
      { path: '/dashboard/messages', label: 'Wiadomości', icon: MessageSquare },
    ],
  },
  {
    key: 'offer',
    label: 'Oferta',
    items: [
      { path: '/dashboard/shop', label: 'Sklep', icon: ShoppingBag },
      { path: '/dashboard/promotions', label: 'Promocje', icon: Gift },
      { path: '/dashboard/events', label: 'Oferty', icon: CalendarDays },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    items: [
      { path: '/dashboard/campaigns', label: 'Kampanie', icon: Mail },
    ],
  },
  {
    key: 'content',
    label: 'Zasoby',
    items: [
      { path: '/dashboard/services', label: 'Usługi', icon: Scissors },
      { path: '/dashboard/blog', label: 'Blog', icon: BookOpen },
      { path: '/dashboard/faq', label: 'FAQ', icon: MessageSquare },
      { path: '/dashboard/documents', label: 'Dokumenty', icon: FolderOpen },
      { path: '/dashboard/feedback', label: 'Opinie', icon: Star },
    ],
  },
  {
    key: 'admin',
    label: 'Zarządzanie',
    items: [
      { path: '/dashboard/stats', label: 'Statystyki', icon: PieChart },
      { path: '/dashboard/artists', label: 'Artyści', icon: Users },
      { path: '/dashboard/users', label: 'Użytkownicy', icon: ShieldCheck },
      { path: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
    ],
  },
];

export const FLAT_NAV = NAV_GROUPS.flatMap(group => group.items);

const matches = (nav, pathname) => (nav.exact ? pathname === nav.path : pathname.startsWith(nav.path));

export const labelForPath = (pathname) => {
  if (pathname === '/dashboard/notifications') return 'Powiadomienia';
  return FLAT_NAV.find(nav => matches(nav, pathname))?.label || 'Przegląd';
};

export const groupKeyForPath = (pathname) =>
  NAV_GROUPS.find(group => group.items.some(nav => matches(nav, pathname)))?.key || null;