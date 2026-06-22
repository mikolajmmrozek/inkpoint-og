import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Mail, MailOpen } from 'lucide-react';
import { useTheme } from './Dashboard';

export default function DashboardMessages() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', hover: 'rgba(0,0,0,0.03)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', hover: 'rgba(255,255,255,0.05)' };
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const data = await base44.entities.ContactMessage.list('-created_date', 100);
    setMessages(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (msg) => {
    if (!msg.is_read) {
      await base44.entities.ContactMessage.update(msg.id, { is_read: true });
      setMessages(m => m.map(x => x.id === msg.id ? { ...x, is_read: true } : x));
    }
    setSelected(msg);
  };

  const deleteMsg = async (id) => {
    await base44.entities.ContactMessage.delete(id);
    setMessages(m => m.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          SKRZYNKA ODBIORCZA
        </p>
        <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Wiadomości
        </h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* List */}
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
                BRAK WIADOMOŚCI
              </p>
            </div>
          ) : messages.map((msg, i) => (
            <div
              key={msg.id}
              className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
              style={{ borderBottom: i < messages.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === msg.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
              onClick={() => markRead(msg)}
            >
              <div className="flex-shrink-0">
                {msg.is_read ? (
                  <MailOpen size={14} color={t.muted} />
                ) : (
                  <Mail size={14} color={t.fuchsia} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p style={{ color: msg.is_read ? t.muted : t.text, fontSize: '14px', fontWeight: msg.is_read ? 400 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.name}
                  </p>
                  <button onClick={(e) => { e.stopPropagation(); deleteMsg(msg.id); }} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.subject || msg.message?.slice(0, 50)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div style={{ border: `0.5px solid ${t.border}`, padding: '24px', background: t.bg }}>
            <div className="mb-6 pb-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.75rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                {selected.name}
              </h3>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '4px' }}>
                {selected.email} {selected.phone ? `· ${selected.phone}` : ''}
              </p>
            </div>
            {selected.subject && (
              <p className="mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {selected.subject}
              </p>
            )}
            <p style={{ color: t.muted, fontSize: '15px', lineHeight: 1.8 }}>
              {selected.message}
            </p>
            <a
              href={`mailto:${selected.email}?subject=Re: ${selected.subject || 'Twoja wiadomość'}`}
              className="btn-oxblood inline-block mt-8"
              style={{ textDecoration: 'none' }}
            >
              ODPOWIEDZ
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ border: `0.5px solid ${t.border}` }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
              WYBIERZ WIADOMOŚĆ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}