import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Calendar, FileText, User, LogOut, Home, Menu, X } from 'lucide-react';

const NAV = [
  { path: '/panel', label: 'Pulpit', icon: Home },
  { path: '/panel/sessions', label: 'Sesje', icon: Calendar },
  { path: '/panel/health-forms', label: 'Ankiety', icon: FileText },
  { path: '/panel/profile', label: 'Profil', icon: User },
];

export default function ClientPanel() {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isLoadingAuth || !authChecked) return;
    if (authError || !isAuthenticated || !user) return;

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
        <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
      </div>
    );
  }

  if (authError || !isAuthenticated) return null;
  if (user.role !== 'user') return null;

  const clientName = client?.name || user.full_name || user.email;

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <Link to="/" className="block">
          <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.3rem', color: '#FF007F', letterSpacing: '0.05em' }}>
            PANEL KLIENTA
          </p>
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 transition-all"
              style={{
                background: active ? 'rgba(255,0,127,0.08)' : 'transparent',
                border: `0.5px solid ${active ? '#FF007F' : 'transparent'}`,
                color: active ? '#FF007F' : 'rgba(245,240,235,0.5)',
              }}
            >
              <Icon size={14} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4" style={{ borderTop: '0.5px solid #262626' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.5)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {clientName}
        </p>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2"
          style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <LogOut size={12} /> Wyloguj
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A0A', color: '#F5F0EB' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col" style={{ borderRight: '0.5px solid #262626' }}>
        <SidebarContent />
      </aside>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: '#0A0A0A', borderRight: '0.5px solid #262626' }}>
            <button onClick={() => setMobileNavOpen(false)} className="absolute top-4 right-4" style={{ color: 'rgba(245,240,235,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-6 py-4" style={{ borderBottom: '0.5px solid #262626' }}>
          <button onClick={() => setMobileNavOpen(true)} style={{ color: '#F5F0EB', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Menu size={20} />
          </button>
          <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1rem', color: '#FF007F', letterSpacing: '0.05em' }}>PANEL KLIENTA</p>
          <div style={{ width: '20px' }} />
        </div>

        <div className="p-6 md:p-12 max-w-4xl mx-auto">
          <Outlet context={{ client, user }} />
        </div>
      </main>
    </div>
  );
}