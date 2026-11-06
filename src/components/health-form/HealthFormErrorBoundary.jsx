import { Component } from 'react';

// Obejście: błąd renderowania ankiety (np. natywny kalendarz na Androidzie)
// nie wywala już całej strony na biało. Zapis lokalny pozwala wrócić do tego
// samego kroku po odświeżeniu.
export default class HealthFormErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Health form crash:', error, info);
  }

  resume = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0A0A0A', color: '#F5F0EB' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            ANKIETA ZDROWOTNA
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 400, lineHeight: 1, letterSpacing: '0.04em', marginBottom: '12px' }}>
            Chwila przerwy
          </h1>
          <div style={{ height: '0.5px', width: '64px', background: 'var(--brand)', marginBottom: '28px' }} />

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.8, color: 'rgba(245,240,235,0.78)', marginBottom: '28px' }}>
            Formularz napotkał problem w przeglądarce. Twoje odpowiedzi zostały zapisane na tym urządzeniu — wróć do
            wypełniania i kontynuuj od miejsca, w którym przerwałeś.
          </p>

          <button
            onClick={this.resume}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 32px', background: 'var(--brand)', color: '#F5F0EB', border: 'none', cursor: 'pointer', width: '100%', marginBottom: '12px' }}
          >
            ↩ WZNÓW WYPEŁNIANIE
          </button>
          <a
            href="/"
            style={{ display: 'block', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '13px 32px', color: 'rgba(245,240,235,0.6)', border: '0.5px solid #262626', textDecoration: 'none' }}
          >
            Wróć na stronę główną
          </a>
        </div>
      </div>
    );
  }
}