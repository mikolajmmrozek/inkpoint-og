import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Users, BookOpen, MessageSquare, FileText, LogOut, BarChart2, Menu, X } from 'lucide-react';

const NAV = [
  { path: '/dashboard', label: 'Przegląd', icon: BarChart2, exact: true },
  { path: '/dashboard/bookings', label: 'Rezerwacje', icon: Calendar },
  { path: '/dashboard/clients', label: 'Klienci', icon: Users },
  { path: '/dashboard/artists', label: 'Artyści', icon: Users },
  { path: '/dashboard/blog', label: 'Blog', icon: BookOpen },
  { path: '/dashboard/messages', label: 'Wiadomości', icon: MessageSquare },
  { path: '/dashboard/health-forms', label: 'Ankiety', icon: FileText },
];

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (nav) => nav.exact ? location.pathname === nav.path : location.pathname.startsWith(nav.path);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(10,10,10,0.8)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-50 w-64 flex flex-col transition-transform duration-500 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderRight: '0.5px solid #262626' }}>
        {/* Logo */}
        <div className="p-8 flex items-center justify-between" style={{ borderBottom: '0.5px solid #262626' }}>
          <div>
            <p style={{ fontFamily: 'Cormorant Garamond', fontWeight: 700, fontSize: '1.5rem', color: '#F5F0EB' }}>INK</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#8B1A1A', letterSpacing: '0.2em', textTransform: 'uppercase' }}>DASHBOARD</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: 'rgba(245,240,235,0.4)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-6 space-y-1">
          {NAV.map(nav => {
            const Icon = nav.icon;
            const active = isActive(nav);
            return (
              <Link
                key={nav.path}
                to={nav.path}
                className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
                style={{
                  background: active ? 'rgba(139,26,26,0.1)' : 'transparent',
                  borderLeft: active ? '0.5px solid #8B1A1A' : '0.5px solid transparent',
                  color: active ? '#F5F0EB' : 'rgba(245,240,235,0.4)',
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={14} color={active ? '#8B1A1A' : 'rgba(245,240,235,0.3)'} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {nav.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-6" style={{ borderTop: '0.5px solid #262626' }}>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:opacity-70"
            style={{ color: 'rgba(245,240,235,0.3)' }}
          >
            <LogOut size={14} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Wyloguj się
            </span>
          </button>
          <Link to="/" className="flex items-center gap-3 px-4 py-2 w-full mt-1" style={{ color: 'rgba(245,240,235,0.2)', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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

  useEffect(() => {
    if (!isLoadingAuth && (!user || user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, isLoadingAuth]);

  if (isLoadingAuth) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A0A', color: '#F5F0EB' }}>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '0.5px solid #262626' }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: 'rgba(245,240,235,0.6)' }}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: '#8B1A1A' }} />
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}