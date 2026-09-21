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
  const [artist, setArtist] = useState(null);
  const location = useLocation();

  const displayName = user?.display_name || user?.full_name || artist?.name || '';
  const initials = (displayName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') || (user?.email?.[0] || 'U')).toUpperCase();
  const avatarSrc = artist?.photo_url || '';

  const isBlogPost = location.pathname.startsWith('/blog/') && location.pathname !== '/blog';
  const forceLightText = isBlogPost && !scrolled;

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

  useEffect(() => {
    if (user?.artist_id) {
      base44.entities.Artist.get(user.artist_id).then(setArtist).catch(() => setArtist(null));
    } else {
      setArtist(null);
    }
  }, [user?.artist_id]);

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
            <span className="font-display text-2xl font-700 text-parchment tracking-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: forceLightText ? '#F5F0EB' : 'hsl(var(--foreground))', letterSpacing: '0.08em', fontSize: '2.1rem' }}>
              ROMANS
            </span>
            <span className="text-micro text-oxblood" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--brand)' }}>
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
              style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: location.pathname === link.href ? 'var(--brand)' : (forceLightText ? '#F5F0EB' : 'rgb(var(--foreground-rgb) / 0.85)') }}>
              
                {link.label}
              </Link>
            )}
          </div>

          {/* Book CTA */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleAccountClick}
              className="flex items-center overflow-hidden transition-all duration-500 ease-out group"
              style={{
                height: '40px',
                borderRadius: '9999px',
                border: '0.5px solid rgb(var(--brand-rgb) /0.4)',
                background: 'rgb(var(--brand-rgb) /0.04)',
                padding: '3px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                const label = e.currentTarget.querySelector('.login-label');
                if (label) { label.style.maxWidth = '170px'; label.style.opacity = '1'; label.style.marginLeft = '10px'; label.style.paddingRight = '12px'; }
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.1)';
              }}
              onMouseLeave={(e) => {
                const label = e.currentTarget.querySelector('.login-label');
                if (label) { label.style.maxWidth = '0'; label.style.opacity = '0'; label.style.marginLeft = '0'; label.style.paddingRight = '0'; }
                e.currentTarget.style.borderColor = 'rgb(var(--brand-rgb) /0.4)';
                e.currentTarget.style.background = 'rgb(var(--brand-rgb) /0.04)';
              }}>
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: avatarSrc ? 'transparent' : 'rgb(var(--brand-rgb) /0.15)'
                }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : isAuthenticated
                    ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.02em' }}>{initials}</span>
                    : <User size={15} color="var(--brand)" />
                }
              </span>
              <span
                className="login-label"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'hsl(var(--foreground))',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: '0',
                  opacity: '0',
                  marginLeft: '0',
                  paddingRight: '0',
                  transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                {isAuthenticated ? (displayName || 'MOJE KONTO') : 'ZALOGUJ SIĘ'}
              </span>
            </button>
            <Link to="/booking" className="btn-oxblood animate-pulse-oxblood" style={{ padding: '11px 26px', fontSize: '13px' }}>
              Umów Sesję
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Menu">
            
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ background: forceLightText ? '#F5F0EB' : 'hsl(var(--foreground))' }} />
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} style={{ background: forceLightText ? '#F5F0EB' : 'hsl(var(--foreground))' }} />
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ background: forceLightText ? '#F5F0EB' : 'hsl(var(--foreground))' }} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 bg-obsidian flex flex-col justify-center px-12 transition-all duration-700 ${
      menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
      } style={{ background: 'hsl(var(--background))' }}>
        <div className="space-y-8">
          <div className="flex gap-3 mb-8" style={{ marginTop: '60px' }}>
            <button
              onClick={handleAccountClick}
              className="flex items-center gap-3 flex-1 min-w-0"
              style={{
                height: '48px',
                padding: '4px 14px 4px 4px',
                borderRadius: '9999px',
                border: '0.5px solid rgb(var(--brand-rgb) /0.35)',
                background: 'rgb(var(--brand-rgb) /0.05)',
                cursor: 'pointer'
              }}>
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: avatarSrc ? 'transparent' : 'rgb(var(--brand-rgb) /0.15)'
                }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : isAuthenticated
                    ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.02em' }}>{initials}</span>
                    : <User size={17} color="var(--brand)" />
                }
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'hsl(var(--foreground))',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                {isAuthenticated ? (displayName || 'MOJE KONTO') : 'ZALOGUJ SIĘ'}
              </span>
            </button>
            <Link to="/booking" className="btn-oxblood flex items-center justify-center flex-1 whitespace-nowrap" style={{ height: '48px', padding: '0 18px', borderRadius: '9999px', fontSize: '11px', letterSpacing: '0.08em', textAlign: 'center' }}>
              Umów Sesję
            </Link>
          </div>
          {navLinks.map((link, i) =>
          <div key={link.href}>
              <Link
              to={link.href}
              className="block font-display text-6xl font-300 text-parchment hover:text-oxblood transition-colors duration-300"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 6rem)', color: 'hsl(var(--foreground))', fontWeight: 400, letterSpacing: '0.05em' }}>
              
                {link.label}
              </Link>
              <div className="h-px w-full mt-4" style={{ background: 'hsl(var(--border))', height: '0.5px' }} />
            </div>
          )}
        </div>
      </div>
    </>);

}