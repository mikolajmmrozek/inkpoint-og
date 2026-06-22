import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleAccountClick = () => {
    if (isAuthenticated) {
      const target = user?.role === 'admin' ? '/dashboard' : user?.role === 'artist' ? '/artist' : '/panel';
      navigate(target);
    } else {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/artists', label: 'Artyści' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Kontakt' }];


  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
      scrolled ? 'glass py-3' : 'py-6 bg-transparent'}`
      }>
        <div className="px-8 md:px-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-display text-2xl font-700 text-parchment tracking-tight" style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, color: '#F5F0EB', letterSpacing: '0.08em', fontSize: '1.6rem' }}>
              ROMANS
            </span>
            <span className="text-micro text-oxblood" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.2em', color: '#FF007F' }}>
              TATTOO
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) =>
            <Link
              key={link.href}
              to={link.href}
              className={`text-micro transition-all duration-300 hover:text-oxblood ${
              location.pathname === link.href ? 'text-oxblood' : 'text-parchment/60'}`
              }
              style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: location.pathname === link.href ? '#FF007F' : 'rgba(245,240,235,0.85)' }}>
              
                {link.label}
              </Link>
            )}
          </div>

          {/* Book CTA */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleAccountClick}
              className="flex items-center justify-center gap-0 overflow-hidden transition-all duration-500 ease-out group"
              style={{
                height: '38px',
                borderRadius: '0.25rem',
                border: '0.5px solid rgba(255,0,127,0.4)',
                background: 'rgba(255,0,127,0.04)',
                padding: '0 10px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.width = 'auto';
                const label = e.currentTarget.querySelector('.login-label');
                const icon = e.currentTarget.querySelector('.login-icon');
                if (label) {label.style.maxWidth = '120px';label.style.opacity = '1';label.style.marginLeft = '8px';}
                if (icon) {e.currentTarget.style.borderColor = '#FF007F';e.currentTarget.style.background = 'rgba(255,0,127,0.08)';}
              }}
              onMouseLeave={(e) => {
                const label = e.currentTarget.querySelector('.login-label');
                if (label) {label.style.maxWidth = '0';label.style.opacity = '0';label.style.marginLeft = '0';}
                e.currentTarget.style.borderColor = 'rgba(255,0,127,0.4)';
                e.currentTarget.style.background = 'rgba(255,0,127,0.04)';
              }}>
              
              <User size={15} className="login-icon" color="#FF007F" style={{ flexShrink: 0 }} />
              <span
                className="login-label"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#F5F0EB',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: '0',
                  opacity: '0',
                  transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                
                {isAuthenticated ? 'MOJE KONTO' : 'ZALOGUJ SIĘ'}
              </span>
            </button>
            <Link to="/booking" className="btn-oxblood animate-pulse-oxblood" style={{ padding: '10px 24px', fontSize: '11px' }}>
              Umów Sesję
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Menu">
            
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ background: '#F5F0EB' }} />
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} style={{ background: '#F5F0EB' }} />
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ background: '#F5F0EB' }} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 bg-obsidian flex flex-col justify-center px-12 transition-all duration-700 ${
      menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
      } style={{ background: '#0A0A0A' }}>
        <div className="space-y-8">
          <div className="flex gap-3 mb-8" style={{ marginTop: '60px' }}>
            <button
              onClick={handleAccountClick}
              className="flex items-center justify-center gap-2 flex-1 whitespace-nowrap"
              style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '0',
                border: '0.5px solid #FF007F',
                background: 'rgba(255,0,127,0.06)',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#FF007F'
              }}>
              <User size={15} color="#FF007F" />
              {isAuthenticated ? 'MOJE KONTO' : 'ZALOGUJ SIĘ'}
            </button>
            <Link to="/booking" className="btn-oxblood flex items-center justify-center flex-1 whitespace-nowrap" style={{ height: '42px', padding: '0 12px', borderRadius: '0', fontSize: '10px', letterSpacing: '0.08em', textAlign: 'center' }}>
              Umów Sesję
            </Link>
          </div>
          {navLinks.map((link, i) =>
          <div key={link.href}>
              <Link
              to={link.href}
              className="block font-display text-6xl font-300 text-parchment hover:text-oxblood transition-colors duration-300"
              style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: 'clamp(3rem, 10vw, 6rem)', color: '#F5F0EB', fontWeight: 400, letterSpacing: '0.05em' }}>
              
                {link.label}
              </Link>
              <div className="h-px w-full mt-4" style={{ background: '#262626', height: '0.5px' }} />
            </div>
          )}
        </div>
      </div>
    </>);

}