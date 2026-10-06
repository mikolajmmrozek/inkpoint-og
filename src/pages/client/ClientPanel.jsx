import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, FileText, User, LogOut, Home, Menu, X, Sun, Moon, MessageSquare, Gift } from 'lucide-react';
import BottomNav from '@/components/panel/BottomNav';
import NotificationBell from '@/components/panel/NotificationBell';
import NotificationPanel from '@/components/panel/NotificationPanel';
import SidebarBadge from '@/components/panel/SidebarBadge';
import { useBadgeCounts } from '@/hooks/useBadgeCounts';
import { CreateMenuProvider } from '@/components/create/CreateMenuContext';

export const ClientThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export const useClientTheme = () => useContext(ClientThemeContext);

const NAV = [
  { path: '/panel', label: 'Pulpit', icon: Home, exact: true },
  { path: '/panel/sessions', label: 'Sesje', icon: Calendar },
  { path: '/panel/health-forms', label: 'Ankiety', icon: FileText },
  { path: '/panel/vouchers', label: 'Vouchery', icon: Gift },
  { path: '/panel/profile', label: 'Profil', icon: User },
  { path: '/panel/messages', label: 'Wiadomości', icon: MessageSquare },
];

function Sidebar({ sidebarOpen, setSidebarOpen, theme, toggleTheme, clientName, userEmail }) {
  const location = useLocation();
  const isActive = (nav) => nav.exact ? location.pathname === nav.path : location.pathname.startsWith(nav.path);
  const counts = useBadgeCounts({ role: 'user', userEmail });

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
        className={`fixed top-0 left-0 h-full z-50 w-64 flex flex-col transition-transform duration-500 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: bg, borderRight: `0.5px solid ${border}` }}
      >
        <div className="p-8 flex items-center justify-between" style={{ borderBottom: `0.5px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', color: textColor, letterSpacing: '0.08em' }}>ROMANS</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>PANEL KLIENTA</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: mutedColor }}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-1 overflow-y-auto">
          {NAV.map(nav => {
            const Icon = nav.icon;
            const active = isActive(nav);
            return (
              <Link
                key={nav.path}
                to={nav.path}
                className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
                style={{
                  background: active ? 'rgba(var(--brand-rgb),0.08)' : 'transparent',
                  borderLeft: active ? '2px solid var(--brand)' : '2px solid transparent',
                  color: active ? textColor : mutedColor,
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={14} color={active ? 'var(--brand)' : (theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)')} />
                  {nav.path === '/panel/messages' && counts.messages > 0 && <SidebarBadge type="count" value={counts.messages} />}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{nav.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-2" style={{ borderTop: `0.5px solid ${border}` }}>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}
            </span>
          </button>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={14} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wyloguj się</span>
          </button>
          <Link to="/" className="flex items-center gap-3 px-4 py-2 w-full mt-1" style={{ color: theme === 'light' ? 'rgba(0,0,0,0.45)' : 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ← Wróć na stronę
          </Link>
        </div>
      </aside>
    </>
  );
}

export default function ClientPanel() {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('clientPanelTheme') || 'dark');
  const [notifOpen, setNotifOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('clientPanelTheme', next);
  };

  useEffect(() => {
    if (isLoadingAuth || !authChecked) return;

    // Not logged in → send to the login page; after login the user returns to this exact URL.
    if (!isAuthenticated || !user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    if (authError) return;

    // Role-based redirect
    if (user.role === 'admin') { navigate('/dashboard', { replace: true }); return; }
    if (user.role === 'artist') { navigate('/artist', { replace: true }); return; }

    // Load client record
    base44.entities.Client.filter({ email: user.email })
      .then(clients => { if (clients.length > 0) setClient(clients[0]); })
      .catch(() => {})
      .finally(() => setLoadingClient(false));

    // Track login activity (fire and forget)
    base44.functions.invoke('trackUserActivity', { event_type: 'login', metadata: { path: location.pathname } })
      .catch(() => null);
  }, [user, isAuthenticated, isLoadingAuth, authChecked, authError, navigate]);

  if (isLoadingAuth || !authChecked || loadingClient) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    );
  }

  if (authError || !isAuthenticated) return null;
  if (user.role !== 'user') return null;

  // Allow child pages (e.g. ClientProfile) to refresh the client record after an update.
  const reloadClient = () => base44.entities.Client.filter({ email: user.email })
    .then(clients => { if (clients.length > 0) setClient(clients[0]); })
    .catch(() => {});

  const clientName = client?.name || user.full_name || user.email;

  const bg = theme === 'light' ? '#F8F8F8' : '#0A0A0A';
  const topBarBg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.75)';

  return (
    <ClientThemeContext.Provider value={{ theme, toggleTheme, client }}>
      <CreateMenuProvider role="user" theme={theme}>
      <div className="min-h-screen flex" data-theme={theme} style={{ background: bg, color: textColor }}>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} toggleTheme={toggleTheme} clientName={clientName} userEmail={user.email} />
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: `0.5px solid ${border}`, background: topBarBg }}>
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center justify-center" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px' }}>
              <Menu size={20} />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <NotificationBell userEmail={user.email} theme={theme} onClick={() => setNotifOpen(true)} />
              </div>
              <Link to="/panel/profile" title="Mój profil">
                {client?.avatar_url ? (
                  <img src={client.avatar_url} alt={clientName} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${border}` }} />
                ) : (
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(var(--brand-rgb),0.12)', border: '0.5px solid rgba(var(--brand-rgb),0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--brand)', letterSpacing: '0.05em' }}>
                      {clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
            </div>
          </div>
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto pb-20 lg:pb-10">
            <Outlet context={{ client, user, theme, reloadClient }} />
          </div>
        </div>
        <BottomNav theme={theme} role="user" calendarPath="/panel/sessions" messagesPath="/panel/messages" notificationsPath="/panel/notifications" userEmail={user.email} />
        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} userEmail={user.email} theme={theme} />
      </div>
      </CreateMenuProvider>
    </ClientThemeContext.Provider>
  );
}