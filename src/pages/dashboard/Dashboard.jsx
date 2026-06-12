import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, BookOpen, MessageSquare, FileText, LogOut, BarChart2, Menu, X, Sun, Moon, Settings, UserCircle, PieChart, Star, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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
  { path: '/dashboard/feedback', label: 'Opinie', icon: Star },
  { path: '/dashboard/stats', label: 'Statystyki', icon: PieChart },
  { path: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
];

const SIDEBAR_FULL = 256;
const SIDEBAR_COLLAPSED = 64;

function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed, theme, toggleTheme }) {
  const location = useLocation();
  const isActive = (nav) => nav.exact ? location.pathname === nav.path : location.pathname.startsWith(nav.path);

  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(245,240,235,0.4)';
  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: bg, borderRight: `0.5px solid ${border}`, width: `${w}px` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `0.5px solid ${border}`, height: '72px', padding: collapsed ? '0' : '0 24px', justifyContent: collapsed ? 'center' : 'space-between' }}
        >
          {collapsed ? (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF007F' }} />
          ) : (
            <>
              <div>
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, fontSize: '1.4rem', color: textColor, letterSpacing: '0.08em', lineHeight: 1 }}>ROMANS</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>DASHBOARD</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '12px 0' }}>
          {NAV.map(nav => {
            const Icon = nav.icon;
            const active = isActive(nav);
            return (
              <Link
                key={nav.path}
                to={nav.path}
                title={nav.label}
                className="flex items-center transition-all duration-200"
                style={{
                  padding: collapsed ? '12px 0' : '10px 24px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : '12px',
                  background: active ? 'rgba(255,0,127,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #FF007F' : '2px solid transparent',
                  color: active ? textColor : mutedColor,
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={14} color={active ? '#FF007F' : (theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(245,240,235,0.3)')} />
                {!collapsed && (
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {nav.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: `0.5px solid ${border}`, padding: '8px 0' }}>
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}
            className="flex items-center w-full transition-all duration-200 hover:opacity-70"
            style={{ padding: collapsed ? '10px 0' : '10px 24px', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : '12px', color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {!collapsed && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}</span>}
          </button>

          <button
            onClick={() => base44.auth.logout('/')}
            title="Wyloguj się"
            className="flex items-center w-full transition-all duration-200 hover:opacity-70"
            style={{ padding: collapsed ? '10px 0' : '10px 24px', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : '12px', color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={14} />
            {!collapsed && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wyloguj się</span>}
          </button>

          {!collapsed && (
            <Link to="/" style={{ display: 'flex', alignItems: 'center', padding: '6px 24px', color: theme === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(245,240,235,0.2)', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ← Wróć na stronę
            </Link>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex items-center justify-center w-full transition-all duration-200 hover:opacity-70"
            style={{ padding: '10px 0', borderTop: `0.5px solid ${border}`, marginTop: '6px', color: mutedColor, background: 'transparent', border: 'none', borderTop: `0.5px solid ${border}`, cursor: 'pointer' }}
            title={collapsed ? 'Rozwiń menu' : 'Zwiń menu'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function Dashboard() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dashboardCollapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboardTheme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('dashboardTheme', next);
  };

  useEffect(() => {
    localStorage.setItem('dashboardCollapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [user, isLoadingAuth]);

  if (isLoadingAuth) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
    </div>
  );

  if (!user) return null;

  if (user.role !== 'admin') return (
    <div className="h-screen flex items-center justify-center flex-col gap-6" style={{ background: '#0A0A0A' }}>
      <div style={{ border: '0.5px solid #262626', padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>DOSTĘP ZABRONIONY</p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '12px' }}>Brak uprawnień</h2>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(245,240,235,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
          Twoje konto ({user.email}) nie ma dostępu do panelu administracyjnego.
        </p>
        <button onClick={() => base44.auth.logout('/')} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>WYLOGUJ SIĘ</button>
      </div>
    </div>
  );

  const bg = theme === 'light' ? '#F8F8F8' : '#0A0A0A';
  const topBarBg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(245,240,235,0.4)';
  const desktopMargin = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="min-h-screen" style={{ background: bg, color: textColor }}>
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Main area — offset by sidebar width on desktop */}
        <div
          className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
          style={{ marginLeft: 0 }}
        >
          {/* Desktop spacer via padding trick */}
          <div
            className="lg:flex flex-col min-h-screen hidden"
            style={{ display: 'none' }}
          />

          {/* Actual content wrapper with left margin on lg+ */}
          <div
            className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
            style={{ paddingLeft: `${desktopMargin}px` }}
          >
            {/* Top bar */}
            <div
              className="flex items-center gap-4 px-6 flex-shrink-0"
              style={{ borderBottom: `0.5px solid ${border}`, background: topBarBg, height: '72px' }}
            >
              {/* Mobile hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
                style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Menu size={20} />
              </button>

              {/* Desktop branding — always visible in topbar */}
              <div className="hidden lg:block">
                <p style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, fontSize: '1.4rem', color: textColor, letterSpacing: '0.08em', lineHeight: 1 }}>ROMANS</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>DASHBOARD</p>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#FF007F' }} />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: mutedColor, letterSpacing: '0.1em' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Page content */}
            <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}