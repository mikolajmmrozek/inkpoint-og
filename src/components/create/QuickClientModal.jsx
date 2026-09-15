import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function QuickClientModal({ onClose, onSaved, t }) {
  const isLight = t.bg === '#FFFFFF';
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '10px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    color: t.text,
    colorScheme: isLight ? 'light' : 'dark',
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const handleSave = async () => {
    if (!first.trim()) { alert('Imię jest wymagane.'); return; }
    setSaving(true);
    try {
      const name = `${first.trim()} ${last.trim()}`.trim();
      await base44.entities.Client.create({
        first_name: first.trim(),
        last_name: last.trim(),
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved(name);
    } catch (e) {
      alert('Nie udało się dodać klienta: ' + (e.message || 'błąd'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md p-6 sm:p-8"
        style={{ border: `0.5px solid ${t.border}`, background: isLight ? '#FFFFFF' : '#0A0A0A' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>NOWY KLIENT</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>Dodaj klienta</h3>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>{label('Imię *')}<input type="text" value={first} onChange={(e) => setFirst(e.target.value)} style={inputStyle} /></div>
            <div>{label('Nazwisko')}<input type="text" value={last} onChange={(e) => setLast(e.target.value)} style={inputStyle} /></div>
          </div>
          <div>{label('Email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></div>
          <div>{label('Telefon')}<input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} /></div>
          <div>
            {label('Notatki')}
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'none' }} placeholder="Alergie, preferencje..." />
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSave} className="btn-oxblood flex-1" style={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? 'ZAPISYWANIE...' : 'DODAJ KLIENTA'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}