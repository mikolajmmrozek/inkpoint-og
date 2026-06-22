import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Calendar, BarChart2, User, LogOut, Menu, X, Sun, Moon } from 'lucide-react';

export const ArtistThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export const useArtistTheme = () => useContext(ArtistThemeContext);

const NAV = [
  { path: '/artist', label: 'Przegląd', icon: BarChart2, exact: true },
  { path: '/artist/schedule', label: 'Mój Kalendarz', icon: Calendar },
  { path: '/artist/stats', label: 'Moje Wyniki', icon: BarChart2 },
  { path: '/artist/profile', label: 'Mój Profil', icon: User },
];

function Sidebar({ sidebarOpen, setSidebarOpen, theme, toggleTheme, artist }) {
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
        <div className="p-8 flex items-center justify-between" style={{ borderBottom: `0.5px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, fontSize: '1.6rem', color: textColor, letterSpacing: '0.08em' }}>ROMANS</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>PANEL ARTYSTY</p>
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
                  background: active ? 'rgba(255,0,127,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid #FF007F' : '2px solid transparent',
                  color: active ? textColor : mutedColor,
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={14} color={active ? '#FF007F' : (theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(245,240,235,0.3)')} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{nav.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-2" style={{ borderTop: `0.5px solid ${border}` }}>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 w-full"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}
            </span>
          </button>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-3 px-4 py-3 w-full"
            style={{ color: mutedColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={14} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wyloguj się</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default function ArtistPanel() {
  const { user, isLoadingAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('artistPanelTheme') || 'dark');
  const [artist, setArtist] = useState(null);
  const [loadingArtist, setLoadingArtist] = useState(true);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('artistPanelTheme', next);
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
      } else if (user.role === 'artist' && user.artist_id) {
        base44.entities.Artist.get(user.artist_id).then(res => {
          if (res) setArtist(res);
          setLoadingArtist(false);
        }).catch(() => setLoadingArtist(false));
      } else {
        setLoadingArtist(false);
      }
    }
  }, [user, isLoadingAuth]);

  if (isLoadingAuth || loadingArtist) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
    </div>
  );

  if (!user) return null;

  if (user.role !== 'artist') return (
    <div className="h-screen flex items-center justify-center flex-col gap-6" style={{ background: '#0A0A0A' }}>
      <div style={{ border: '0.5px solid #262626', padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>DOSTĘP ZABRONIONY</p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '12px' }}>Brak uprawnień</h2>
        <p style={{ fontSize: '14px', color: 'rgba(245,240,235,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
          Ten panel jest dostępny tylko dla artystów studia.
        </p>
        <button onClick={() => base44.auth.logout('/')} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>WYLOGUJ SIĘ</button>
      </div>
    </div>
  );

  if (!artist) return (
    <div className="h-screen flex items-center justify-center flex-col gap-6" style={{ background: '#0A0A0A' }}>
      <div style={{ border: '0.5px solid #262626', padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>KONFIGURACJA WYMAGANA</p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.04em', marginBottom: '12px' }}>Brak powiązania</h2>
        <p style={{ fontSize: '14px', color: 'rgba(245,240,235,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
          Twoje konto nie jest jeszcze powiązane z profilem artysty. Skontaktuj się z administratorem studia.
        </p>
        <button onClick={() => base44.auth.logout('/')} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>WYLOGUJ SIĘ</button>
      </div>
    </div>
  );

  const bg = theme === 'light' ? '#F8F8F8' : '#0A0A0A';
  const topBarBg = theme === 'light' ? '#FFFFFF' : '#0A0A0A';
  const border = theme === 'light' ? '#E5E5E5' : '#262626';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(245,240,235,0.4)';
  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';

  return (
    <ArtistThemeContext.Provider value={{ theme, toggleTheme, artist }}>
      <div className="min-h-screen flex" style={{ background: bg, color: textColor }}>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} toggleTheme={toggleTheme} artist={artist} />
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: `0.5px solid ${border}`, background: topBarBg }}>
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
              <Menu size={20} />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3 flex-row-reverse">
              {artist?.photo_url ? (
                <img src={artist.photo_url} alt={artist.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,0,127,0.12)', border: '0.5px solid rgba(255,0,127,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '11px', color: '#FF007F' }}>
                    {(artist?.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: textColor, letterSpacing: '0.05em' }}>{artist?.name}</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: mutedColor, letterSpacing: '0.1em' }}>{user?.email}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <Outlet context={{ artist, theme }} />
          </div>
        </div>
      </div>
    </ArtistThemeContext.Provider>
  );
}