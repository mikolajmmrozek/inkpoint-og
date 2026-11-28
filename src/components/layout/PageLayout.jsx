import Navbar from './Navbar';
import Footer from './Footer';
import CookieConsent from '@/components/site/CookieConsent';

export default function PageLayout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <Navbar />
      <main>{children}</main>
      {!noFooter && <Footer />}
      <CookieConsent />
    </div>
  );
}