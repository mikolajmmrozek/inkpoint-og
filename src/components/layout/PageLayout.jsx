import Navbar from './Navbar';
import Footer from './Footer';

export default function PageLayout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A', color: '#F5F0EB' }}>
      <Navbar />
      <main>{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}