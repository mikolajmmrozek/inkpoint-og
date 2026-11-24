import {
  Calendar, Inbox, MessageSquare, Wallet, Users, FileText, ShoppingBag,
  PieChart, Gift, FolderOpen, Star, TrendingUp, Clock, User,
} from 'lucide-react';

// Katalog kafli, które można przypiąć na pulpicie (maks. 6).
// kind: 'metric' = kafel z wartością/trendem, 'shortcut' = skrót do sekcji.
export const ADMIN_TILES = [
  { key: 'all_bookings', label: 'Wszystkie rezerwacje', icon: Calendar, href: '/dashboard/bookings', kind: 'metric' },
  { key: 'pending', label: 'Do weryfikacji', icon: Inbox, href: '/dashboard/bookings?view=pending', kind: 'metric' },
  { key: 'messages', label: 'Nowe wiadomości', icon: MessageSquare, href: '/dashboard/messages', kind: 'metric' },
  { key: 'to_settle', label: 'Do rozliczenia', icon: Wallet, href: '/dashboard/bookings?filter=to_settle&view=list&tab=past', kind: 'metric' },
  { key: 'clients', label: 'Klienci', icon: Users, href: '/dashboard/clients', kind: 'shortcut' },
  { key: 'health_forms', label: 'Ankiety zdrowotne', icon: FileText, href: '/dashboard/health-forms', kind: 'shortcut' },
  { key: 'shop', label: 'Sklep', icon: ShoppingBag, href: '/dashboard/shop', kind: 'shortcut' },
  { key: 'stats', label: 'Statystyki', icon: PieChart, href: '/dashboard/stats', kind: 'shortcut' },
  { key: 'promotions', label: 'Promocje', icon: Gift, href: '/dashboard/promotions', kind: 'shortcut' },
  { key: 'documents', label: 'Dokumenty', icon: FolderOpen, href: '/dashboard/documents', kind: 'shortcut' },
  { key: 'feedback', label: 'Opinie klientów', icon: Star, href: '/dashboard/feedback', kind: 'shortcut' },
];

export const ARTIST_TILES = [
  { key: 'upcoming', label: 'Nadchodzące sesje', icon: Calendar, href: '/artist/schedule', kind: 'metric' },
  { key: 'month_sessions', label: 'Sesje w tym miesiącu', icon: TrendingUp, href: '/artist/stats', kind: 'metric' },
  { key: 'month_revenue', label: 'Mój zarobek (mies.)', icon: Clock, href: '/artist/stats', kind: 'metric' },
  { key: 'schedule', label: 'Mój kalendarz', icon: Calendar, href: '/artist/schedule', kind: 'shortcut' },
  { key: 'availability', label: 'Grafik i przerwy', icon: Clock, href: '/artist/profile', kind: 'shortcut' },
  { key: 'stats', label: 'Moje wyniki', icon: PieChart, href: '/artist/stats', kind: 'shortcut' },
  { key: 'messages', label: 'Wiadomości', icon: MessageSquare, href: '/artist/messages', kind: 'shortcut' },
  { key: 'profile', label: 'Mój profil', icon: User, href: '/artist/profile', kind: 'shortcut' },
];

export const DEFAULT_ADMIN_TILES = ['all_bookings', 'pending', 'messages', 'to_settle'];
export const DEFAULT_ARTIST_TILES = ['upcoming', 'month_sessions', 'month_revenue'];
export const MAX_TILES = 6;

export function tileCatalog(role) {
  return role === 'artist' ? ARTIST_TILES : ADMIN_TILES;
}

export function defaultTiles(role) {
  return role === 'artist' ? DEFAULT_ARTIST_TILES : DEFAULT_ADMIN_TILES;
}