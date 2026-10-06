import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, BookOpen, MessageSquare, FileText, LogOut, BarChart2, Menu, X, Sun, Moon, Settings, UserCircle, PieChart, Star, FolderOpen, Scissors, ShieldCheck, Bell, PanelLeftClose, PanelLeftOpen, Home as HomeIcon, Gift } from 'lucide-react';
import BottomNav from '@/components/panel/BottomNav';
import NotificationBell from '@/components/panel/NotificationBell';
import NotificationPanel from '@/components/panel/NotificationPanel';
import NotificationSidebarItem from '@/components/panel/NotificationSidebarItem';
import SidebarBadge from '@/components/panel/SidebarBadge';
import StudioAvatar from '@/components/panel/StudioAvatar';
import { useBadgeCounts } from '@/hooks/useBadgeCounts';
import { CreateMenuProvider } from '@/components/create/CreateMenuContext';

export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

const NAV = [
  { path: '/dashboard', label: 'Przegląd', icon: BarChart2, exact: true },
  { path: '/dashboard/bookings', label: 'Rezerwacje', icon: Calendar },
  { path: '/dashboard/artists', label: 'Artyści', icon: Users },
  { path: '/dashboard/blog', label: 'Blog', icon: BookOpen },
  { path: '/dashboard/messages', label: 'Wiadomości', icon: MessageSquare },
  { path: '/dashboard/health-forms', label: 'Ankiety', icon: FileText },
  { path: '/dashboard/clients', label: 'Klienci', icon: UserCircle },
  { path: '/dashboard/documents', label: 'Dokumenty', icon: FolderOpen },
  { path: '/dashboard/faq', label: 'FAQ', icon: MessageSquare },
  { path: '/dashboard/services', label: 'Usługi', icon: Scissors },
  { path: '/dashboard/promotions', label: 'Promocje', icon: Gift },
  { path: '/dashboard/feedback', label: 'Opinie', icon: Star },
  { path: '/dashboard/stats', label: 'Statystyki', icon: PieChart },
  { path: '/dashboard/users', label: 'Użytkownicy', icon: ShieldCheck },
  { path: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
];

const getBadgeForPath = (path, counts) => {
  const map = {
    '/dashboard/messages': counts.messages > 0 ? { type: 'count', value: counts.messages } : null,
    '/dashboard/bookings': (counts.pendingBookings + counts.openChangeRequests) > 0 ? { type: 'count', value: counts.pendingBookings + counts.openChangeRequests } : null,
    '/dashboard/health-forms': counts.newHealthForms > 0 ? { type: 'count', value: counts.newHealthForms } : null,
    '/dashboard/feedback': counts.unpublishedFeedback > 0 ? { type: 'count', value: counts.unpublishedFeedback } : null,
    '/dashboard/clients': counts.newClients > 0 ? { type: 'count', value: counts.newClients } : null,
  };
  return map[path] || null;
};

function Sidebar({ sidebarOpen, setSidebarOpen, theme, toggleTheme, userEmail, onNotifClick, collapsed, onToggleCollapse }) {
  const location = useLocation();
  const counts = useBadgeCounts({ role: 'admin', userEmail });

  const isActive = (nav) => nav.exact ? location.pathname === nav.path : location.pathname.startsWith(nav.path);

  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.75)';

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 w-64 flex flex-col transition-all duration-500 lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-64'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: bg, borderRight: `0.5px solid ${border}` }}
      >
        {/* Logo / collapse toggle — matches top bar height (px-6 py-4) */}
        <div className="flex items-center px-2 py-4 lg:py-6 justify-between min-h-[72px] lg:min-h-[96px]" style={{ borderBottom: `0.5px solid ${border}` }}>
          <div className={`flex-1 min-w-0 overflow-hidden pl-4 transition-opacity duration-300 ${collapsed ? 'lg:opacity-0' : ''}`}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '2.1rem', color: textColor, letterSpacing: '0.08em', lineHeight: 1, margin: 0 }}>ROMANS</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', letterSpacing: '0.2em', lineHeight: 1, marginTop: '3px', textTransform: 'uppercase' }}>TATTOO</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden flex items-center justify-center" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px' }}>
            <X size={20} />
          </button>
          <button onClick={onToggleCollapse} className="hidden lg:flex items-center justify-center ml-auto shrink-0" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            {collapsed ? <PanelLeftOpen size={20} className="shrink-0" /> : <PanelLeftClose size={20} className="shrink-0" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV.map(nav => {
            const Icon = nav.icon;
            const active = isActive(nav);
            const badge = getBadgeForPath(nav.path, counts);
            return (
              <Link
                key={nav.path}
                to={nav.path}
                className="flex items-center gap-3 px-4 py-3 whitespace-nowrap overflow-hidden transition-colors duration-200"
                style={{
                  background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                  borderLeft: active ? '2px solid var(--brand)' : '2px solid transparent',
                  color: active ? textColor : mutedColor,
                }}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? nav.label : ''}
              >
                <div className="shrink-0" style={{ position: 'relative' }}>
                  <Icon size={20} color={active ? 'var(--brand)' : (theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)')} />
                  {badge && <SidebarBadge type={badge.type} value={badge.value} />}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {nav.label}
                </span>
              </Link>
            );
          })}
          {/* Notifications */}
          <div className="mt-3 pt-3" style={{ borderTop: `0.5px solid ${border}` }}>
            <NotificationSidebarItem
              userEmail={userEmail}
              theme={theme}
              notificationsPath="/dashboard/notifications"
              onMobileClick={() => setSidebarOpen(false)}
              onDesktopClick={() => { setSidebarOpen(false); onNotifClick(); }}
              collapsed={collapsed}
            />
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-2 py-6 space-y-2" style={{ borderTop: `0.5px solid ${border}` }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-1.5 w-full whitespace-nowrap overflow-hidden hover:opacity-70 transition-colors duration-200"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
            title={collapsed ? (theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw') : ''}
          >
            <div className="shrink-0 flex items-center justify-center" style={{ width: 20 }}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}
            </span>
          </button>

          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-3 px-4 py-1.5 w-full whitespace-nowrap overflow-hidden hover:opacity-70 transition-colors duration-200"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
            title={collapsed ? 'Wyloguj się' : ''}
          >
            <div className="shrink-0 flex items-center justify-center" style={{ width: 20 }}>
              <LogOut size={16} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Wyloguj się
            </span>
          </button>
          <Link to="/" className="flex items-center gap-3 px-4 py-1.5 w-full whitespace-nowrap overflow-hidden" style={{ color: mutedColor, fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }} title={collapsed ? 'Wróć na stronę' : ''}>
            <div className="shrink-0 flex items-center justify-center" style={{ width: 20 }}>
              <HomeIcon size={16} />
            </div>
            <span>Wróć na stronę</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

export default function Dashboard() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboardTheme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('dashboardSidebarCollapsed') === 'true');
  const location = useLocation();
  const [studioProfile, setStudioProfile] = useState(null);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('dashboardTheme', next);
  };

  const toggleSidebarCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('dashboardSidebarCollapsed', String(next));
  };

  useEffect(() => {
    base44.entities.Artist.filter({ name: 'Studio' })
      .then(list => setStudioProfile(list[0] || null))
      .catch(() => {});
  }, []);

  // Keep the document background in sync with the dashboard theme so the area
  // behind the panel never leaks the dark public-site/html background.
  useEffect(() => {
    const rootBg = theme === 'light' ? '#F8F8F8' : '#0A0A0A';
    document.documentElement.style.backgroundColor = rootBg;
    document.body.style.backgroundColor = rootBg;
    document.body.style.backgroundImage = 'none';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.backgroundImage = '';
    };
  }, [theme]);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        // Not logged in — redirect to login, then come back to dashboard
        base44.auth.redirectToLogin(window.location.href);
      } else if (user.role === 'artist') {
        navigate('/artist');
      } else if (user.role !== 'admin') {
        // Logged in but not admin — show access denied, don't redirect silently
      }
    }
  }, [user, isLoadingAuth]);

  if (isLoadingAuth) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
    </div>
  );

  if (!user) return null; // redirecting to login

  if (user.role !== 'admin') return (
    <div className="h-screen flex items-center justify-center flex-col gap-6" style={{ background: '#0A0A0A' }}>
      <div style={{ border: '0.5px solid #262626', padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>DOSTĘP ZABRONIONY</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '12px' }}>Brak uprawnień</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(245,240,235,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
          Twoje konto ({user.email}) nie ma dostępu do panelu administracyjnego. Skontaktuj się z właścicielem studia.
        </p>
        <button onClick={() => base44.auth.logout('/')} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>
          WYLOGUJ SIĘ
        </button>
      </div>
    </div>
  );

  const bg = theme === 'light' ? '#F8F8F8' : '#0A0A0A';
  const topBarBg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.75)';

  const currentNav = NAV.find(n => n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path));
  const currentLabel = currentNav?.label || (location.pathname === '/dashboard/notifications' ? 'Powiadomienia' : 'Przegląd');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <CreateMenuProvider role="admin" theme={theme}>
      <div className="min-h-screen flex overflow-x-hidden" style={{ background: bg, color: textColor }}>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} toggleTheme={toggleTheme} userEmail={user.email} onNotifClick={() => setNotifOpen(true)} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />

        <div className={`flex-1 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} flex flex-col min-h-screen min-w-0 transition-all duration-500`}>
          {/* Top bar */}
           <div className="flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-4 lg:py-6 min-h-[72px] lg:min-h-[96px]" style={{ borderBottom: `0.5px solid ${border}`, background: topBarBg }}>
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center justify-center" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px' }}>
               <Menu size={20} />
             </button>
             {/* Dynamic page title */}
             <div className="flex items-center gap-3 min-w-0">
               <div className="min-w-0">
                 <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1 }}>PANEL</p>
                 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: textColor, letterSpacing: '0.04em', lineHeight: 1, marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentLabel}</h1>
               </div>
             </div>
             <div className="flex-1" />
            <div className="flex items-center gap-3">
               <div className="hidden lg:block">
                 <NotificationBell userEmail={user.email} theme={theme} onClick={() => setNotifOpen(true)} />
               </div>
               <Link to="/dashboard" title="Profil studia">
                 <StudioAvatar studio={studioProfile} theme={theme} size={38} />
               </Link>
             </div>
          </div>

          <div className="flex-1 p-4 lg:p-10 overflow-y-auto overflow-x-hidden min-w-0 pb-20 lg:pb-10">
            <Outlet context={{ theme }} />
          </div>
        </div>
        <BottomNav theme={theme} role="admin" calendarPath="/dashboard/bookings" messagesPath="/dashboard/messages" notificationsPath="/dashboard/notifications" userEmail={user.email} />
        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} userEmail={user.email} theme={theme} />
      </div>
      </CreateMenuProvider>
    </ThemeContext.Provider>
  );
}