import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t mt-0" style={{ borderColor: '#262626', borderTopWidth: '0.5px', background: '#0A0A0A' }}>
      <div className="px-8 md:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="font-display text-4xl font-700 mb-2" style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, color: '#F5F0EB', fontSize: '2.8rem', letterSpacing: '0.06em' }}>
              ROMANS TATTOO
            </div>
            <p className="text-parchment/40 text-sm mt-4 leading-relaxed" style={{ color: 'rgba(245,240,235,0.4)', fontSize: '14px' }}>
              Studio tatuażu i piercingu.<br />
              Wolsztyn, Polska.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="https://www.instagram.com/tattoo.romans/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,235,0.4)', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Instagram
              </a>
              <a href="https://www.facebook.com/tattoo.romans.wolsztyn" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,235,0.4)', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Facebook
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.15em' }}>
              NAWIGACJA
            </p>
            <div className="space-y-3">
              {[['/', 'Home'], ['/artists', 'Artyści'], ['/faq', 'FAQ'], ['/blog', 'Blog'], ['/contact', 'Kontakt']].map(([href, label]) => (
                <Link key={href} to={href} className="block text-parchment/50 hover:text-parchment transition-colors text-sm" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '14px' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.15em' }}>
              KONTAKT
            </p>
            <div className="space-y-2 text-sm text-parchment/50" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '14px' }}>
              <p>ul. Wschowska 30</p>
              <p>64-200 Wolsztyn</p>
              <p className="mt-4">881717880</p>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '0.5px solid #262626' }}>
          <p className="text-micro" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.1em' }}>
            © 2026 ROMANS TATTOO. WSZELKIE PRAWA ZASTRZEŻONE.
          </p>
          <Link to="/dashboard" className="text-micro text-parchment/20 hover:text-parchment/60 transition-colors" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.2)', letterSpacing: '0.1em' }}>
            PANEL ADMINA
          </Link>
        </div>
      </div>
    </footer>
  );
}