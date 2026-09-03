import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TikTokIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
  </svg>
);

export default function Footer() {
  const [social, setSocial] = useState({ youtube_url: '', tiktok_url: '' });

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'contact' })
      .then(res => {
        if (res.length > 0) {
          setSocial({ youtube_url: res[0].contact_youtube_url || '', tiktok_url: res[0].contact_tiktok_url || '' });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t mt-0" style={{ borderColor: 'hsl(var(--border))', borderTopWidth: '0.5px', background: 'hsl(var(--background))' }}>
      <div className="px-8 md:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="font-display text-4xl font-700 mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: 'hsl(var(--foreground))', fontSize: '2.8rem', letterSpacing: '0.06em' }}>
              ROMANS TATTOO
            </div>
            <p className="text-parchment/40 text-sm mt-4 leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb) / 0.4)', fontSize: '14px' }}>
              Studio tatuażu i piercingu.<br />
              Wolsztyn, Polska.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="https://www.instagram.com/tattoo.romans/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-opacity hover:opacity-80" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Instagram size={13} />
                Instagram
              </a>
              <a href="https://www.facebook.com/tattoo.romans.wolsztyn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-opacity hover:opacity-80" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Facebook size={13} />
                Facebook
              </a>
              {social.youtube_url && (
                <a href={social.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-opacity hover:opacity-80" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  <Youtube size={13} />
                  YouTube
                </a>
              )}
              {social.tiktok_url && (
                <a href={social.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-opacity hover:opacity-80" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  <TikTokIcon size={13} />
                  TikTok
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.15em' }}>
              NAWIGACJA
            </p>
            <div className="space-y-3">
              {[['/', 'Home'], ['/artists', 'Artyści'], ['/faq', 'FAQ'], ['/blog', 'Blog'], ['/contact', 'Kontakt']].map(([href, label]) => (
                <Link key={href} to={href} className="block text-parchment/50 hover:text-parchment transition-colors text-sm" style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '14px' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.15em' }}>
              KONTAKT
            </p>
            <div className="space-y-2 text-sm text-parchment/50" style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '14px' }}>
              <p>ul. Wschowska 30</p>
              <p>64-200 Wolsztyn</p>
              <a href="tel:881717880" className="hover:text-parchment/80 transition-colors" style={{ marginTop: '16px', display: 'block', color: 'var(--brand)' }}>881717880</a>
              <a href="mailto:tattoo.wolsztyn@gmail.com" className="hover:text-parchment/80 transition-colors" style={{ marginTop: '8px', display: 'block', color: 'var(--brand)', fontSize: '12px' }}>tattoo.wolsztyn@gmail.com</a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
          <p className="text-micro" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.1em' }}>
            © 2026 ROMANS TATTOO. WSZELKIE PRAWA ZASTRZEŻONE.
          </p>
        </div>
      </div>
    </footer>
  );
}