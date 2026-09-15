import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister any stale service workers that may cache old React copies
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}

// Prevent mouse wheel from accidentally changing number input values — keyboard entry only.
if (typeof document !== 'undefined') {
  document.addEventListener('wheel', (e) => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT' && el.type === 'number') {
      e.preventDefault();
      el.blur();
    }
  }, { passive: false });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)