import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
    { href: '/contact', label: 'Kontakt' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled ? 'glass py-3' : 'py-6 bg-transparent'
      }`}>
        <div className="px-8 md:px-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-display text-2xl font-700 text-parchment tracking-tight" style={{ fontFamily: 'Cormorant Garamond', fontWeight: 700, color: '#F5F0EB' }}>
              INK
            </span>
            <span className="text-micro text-oxblood" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.2em', color: '#8B1A1A' }}>
              STUDIO
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-micro transition-all duration-300 hover:text-oxblood ${
                  location.pathname === link.href ? 'text-oxblood' : 'text-parchment/60'
                }`}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: location.pathname === link.href ? '#8B1A1A' : 'rgba(245,240,235,0.6)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Book CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/booking" className="btn-oxblood animate-pulse-oxblood" style={{ padding: '10px 24px', fontSize: '11px' }}>
              Umów Sesję
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Menu"
          >
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ background: '#F5F0EB' }} />
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} style={{ background: '#F5F0EB' }} />
            <span className={`block w-6 h-px bg-parchment transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ background: '#F5F0EB' }} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 bg-obsidian flex flex-col justify-center px-12 transition-all duration-700 ${
        menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`} style={{ background: '#0A0A0A' }}>
        <div className="space-y-8">
          {navLinks.map((link, i) => (
            <div key={link.href}>
              <Link
                to={link.href}
                className="block font-display text-6xl font-300 text-parchment hover:text-oxblood transition-colors duration-300"
                style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: '#F5F0EB', fontWeight: 300 }}
              >
                {link.label}
              </Link>
              <div className="h-px w-full mt-4" style={{ background: '#262626', height: '0.5px' }} />
            </div>
          ))}
          <Link to="/booking" className="btn-oxblood inline-block mt-4">
            Umów Sesję
          </Link>
        </div>
      </div>
    </>
  );
}