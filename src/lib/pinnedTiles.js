import {
  Calendar, Inbox, MessageSquare, Wallet, Users, FileText, ShoppingBag,
  PieChart, Gift, FolderOpen, Star, TrendingUp, Clock, User,
  Banknote, Coins, CalendarDays, Store, Ticket,
} from 'lucide-react';

// Katalog kafli, które można przypiąć na pulpicie (maks. 8).
// Każdy kafel pokazuje wartość i krótki opis pod nią; kliknięcie prowadzi do sekcji.
export const ADMIN_TILES = [
  { key: 'all_bookings', label: 'Wszystkie rezerwacje', icon: Calendar, href: '/dashboard/bookings', kind: 'metric' },
  { key: 'pending', label: 'Do weryfikacji', icon: Inbox, href: '/dashboard/bookings?view=pending', kind: 'metric' },
  { key: 'messages', label: 'Nowe wiadomości', icon: MessageSquare, href: '/dashboard/messages', kind: 'metric' },
  { key: 'to_settle', label: 'Do rozliczenia', icon: Wallet, href: '/dashboard/bookings?filter=to_settle&view=list&tab=past', kind: 'metric' },
  { key: 'shop', label: 'Nowe zamówienia', icon: ShoppingBag, href: '/dashboard/shop', kind: 'metric' },
  { key: 'stats', label: 'Przychód z usług', icon: PieChart, href: '/dashboard/stats?view=services', kind: 'metric' },
  { key: 'services_profit', label: 'Dochód z usług', icon: Coins, href: '/dashboard/stats?view=services', kind: 'metric' },
  { key: 'shop_revenue', label: 'Przychód ze sklepu', icon: ShoppingBag, href: '/dashboard/stats?view=shop', kind: 'metric' },
  { key: 'shop_profit', label: 'Dochód ze sklepu', icon: Store, href: '/dashboard/stats?view=shop', kind: 'metric' },
  { key: 'events_revenue', label: 'Przychód z warsztatów', icon: CalendarDays, href: '/dashboard/stats?view=events', kind: 'metric' },
  { key: 'events_profit', label: 'Dochód z warsztatów', icon: Ticket, href: '/dashboard/stats?view=events', kind: 'metric' },
  { key: 'total_revenue', label: 'Przychód całkowity', icon: TrendingUp, href: '/dashboard/stats', kind: 'metric' },
  { key: 'total_profit', label: 'Dochód całkowity', icon: Banknote, href: '/dashboard/stats', kind: 'metric' },
  { key: 'clients', label: 'Klienci', icon: Users, href: '/dashboard/clients', kind: 'metric' },
  { key: 'health_forms', label: 'Ankiety do przejrzenia', icon: FileText, href: '/dashboard/health-forms', kind: 'metric' },
  { key: 'promotions', label: 'Aktywne promocje', icon: Gift, href: '/dashboard/promotions', kind: 'metric' },
  { key: 'feedback', label: 'Opinie do publikacji', icon: Star, href: '/dashboard/feedback', kind: 'metric' },
  { key: 'documents', label: 'Dokumenty', icon: FolderOpen, href: '/dashboard/documents', kind: 'metric' },
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
export const MAX_TILES = 8;

export function tileCatalog(role) {
  return role === 'artist' ? ARTIST_TILES : ADMIN_TILES;
}

export function defaultTiles(role) {
  return role === 'artist' ? DEFAULT_ARTIST_TILES : DEFAULT_ADMIN_TILES;
}