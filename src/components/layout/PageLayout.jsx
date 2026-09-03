import Navbar from './Navbar';
import Footer from './Footer';

export default function PageLayout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <Navbar />
      <main>{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}