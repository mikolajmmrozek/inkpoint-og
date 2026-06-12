import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, BookOpen, MessageSquare, FileText, LogOut, BarChart2, Menu, X, Sun, Moon, Settings, UserCircle, PieChart, Star, FolderOpen } from 'lucide-react';

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

function Sidebar({ sidebarOpen, setSidebarOpen, theme, toggleTheme }) {
  const location = useLocation();

  const isActive = (nav) => nav.exact ? location.pathname === nav.path : location.pathname.startsWith(nav.path);

  const bg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(245,240,235,0.4)';

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 w-64 flex flex-col transition-transform duration-500 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: bg, borderRight: `0.5px solid ${border}` }}
      >
        {/* Logo */}
        <div className="p-8 flex items-center justify-between" style={{ borderBottom: `0.5px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, fontSize: '1.6rem', color: textColor, letterSpacing: '0.08em' }}>ROMANS</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>DASHBOARD</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: mutedColor }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
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
                  background: active ? 'rgba(255,0,127,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #FF007F' : '2px solid transparent',
                  color: active ? textColor : mutedColor,
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={14} color={active ? '#FF007F' : (theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(245,240,235,0.3)')} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {nav.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-6 space-y-2" style={{ borderTop: `0.5px solid ${border}` }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}
            </span>
          </button>

          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={14} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Wyloguj się
            </span>
          </button>
          <Link to="/" className="flex items-center gap-3 px-4 py-2 w-full mt-1" style={{ color: theme === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(245,240,235,0.2)', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ← Wróć na stronę
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
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboardTheme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('dashboardTheme', next);
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        // Not logged in — redirect to login, then come back to dashboard
        base44.auth.redirectToLogin(window.location.href);
      } else if (user.role !== 'admin') {
        // Logged in but not admin — show access denied, don't redirect silently
      }
    }
  }, [user, isLoadingAuth]);

  if (isLoadingAuth) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
    </div>
  );

  if (!user) return null; // redirecting to login

  if (user.role !== 'admin') return (
    <div className="h-screen flex items-center justify-center flex-col gap-6" style={{ background: '#0A0A0A' }}>
      <div style={{ border: '0.5px solid #262626', padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>DOSTĘP ZABRONIONY</p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '12px' }}>Brak uprawnień</h2>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(245,240,235,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
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
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(245,240,235,0.4)';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="min-h-screen flex" style={{ background: bg, color: textColor }}>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} toggleTheme={toggleTheme} />

        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          {/* Top bar */}
           <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: `0.5px solid ${border}`, background: topBarBg }}>
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Menu size={20} />
             </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#FF007F' }} />
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: mutedColor, letterSpacing: '0.1em' }}>
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}