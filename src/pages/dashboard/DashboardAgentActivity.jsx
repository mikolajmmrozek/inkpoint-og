import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import StatsTile from '@/components/dashboard/StatsTile';
import AgentTranscriptCard from '@/components/dashboard/AgentTranscriptCard';
import AgentMemoryPanel from '@/components/dashboard/AgentMemoryPanel';
import { Bot, MessageSquare, Brain } from 'lucide-react';

// Asystenci AI — widok obserwacyjny Gatekeeperów artystów dla administratorów.
// Zanonimizowane wymiany (wiadomości, narzędzia, wyniki, błędy) i prywatne pamięci
// per artysta — do śledzenia pracy agentów i rozwoju przyszłych asystentów.

const asList = (res) => Array.isArray(res) ? res : (res?.items || []);

export default function DashboardAgentActivity() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.4)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)' };

  const [entries, setEntries] = useState([]);
  const [memories, setMemories] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [artistFilter, setArtistFilter] = useState('');
  const [view, setView] = useState('transcripts'); // 'transcripts' | 'memory'

  useEffect(() => {
    const load = async () => {
      try {
        const [tx, mem, art] = await Promise.all([
          base44.entities.GatekeeperTranscript.list('-created_date', 300),
          base44.entities.ArtistGatekeeperMemory.filter({ is_current: true }),
          base44.entities.Artist.list('-created_date', 200),
        ]);
        setEntries(asList(tx));
        setMemories(asList(mem));
        setArtists(asList(art));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const artistName = (id) => {
    const a = artists.find(x => x.id === id);
    if (a) return a.name;
    const m = memories.find(x => x.artist_id === id);
    return m?.artist_name || 'Artysta';
  };

  const activeArtistIds = [...new Set([...entries.map(e => e.artist_id), ...memories.map(m => m.artist_id)])].filter(Boolean);
  const filteredEntries = entries.filter(e => !artistFilter || e.artist_id === artistFilter);
  const filteredMemories = memories.filter(m => !artistFilter || m.artist_id === artistFilter);

  const stats = [
    { label: 'Wymiany', value: entries.length },
    { label: 'Artyści z agentem', value: activeArtistIds.length },
    { label: 'Wpisy pamięci', value: memories.length },
    { label: 'Wymiany z błędem', value: entries.filter(e => e.had_error).length },
  ];

  const viewBtn = (v, active) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
    color: active ? 'var(--brand)' : t.muted,
    background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '8px 16px', cursor: 'pointer', borderRadius: 'var(--radius)',
  });

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        {stats.map(s => <StatsTile key={s.label} label={s.label} value={s.value} t={t} />)}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <button onClick={() => setView('transcripts')} style={viewBtn('transcripts', view === 'transcripts')}>
          <MessageSquare size={12} /> ROZMOWY
        </button>
        <button onClick={() => setView('memory')} style={viewBtn('memory', view === 'memory')}>
          <Brain size={12} /> PAMIĘĆ AGENTÓW
        </button>
      </div>

      {activeArtistIds.length > 0 && (
        <div className="mb-6">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ARTYSTA</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setArtistFilter('')} style={viewBtn('', !artistFilter)}>WSZYSCY</button>
            {activeArtistIds.map(id => (
              <button key={id} onClick={() => setArtistFilter(id)} style={viewBtn(id, artistFilter === id)}>{artistName(id)}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : error ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#ef4444' }}>{error}</p>
        </div>
      ) : view === 'transcripts' ? (
        filteredEntries.length === 0 ? (
          <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <Bot size={28} color={t.muted} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ZAPISANYCH WYMIAN{artistFilter ? ' DLA TEGO ARTYSTY' : ''}</p>
            <p style={{ fontSize: '12px', color: t.muted, marginTop: '8px' }}>Wymiany z Gatekeeperami artystów pojawiają się tutaj automatycznie po każdej rozmowie.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map(e => <AgentTranscriptCard key={e.id} entry={e} artistName={artistName(e.artist_id)} t={t} />)}
          </div>
        )
      ) : (
        filteredMemories.length === 0 ? (
          <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <Brain size={28} color={t.muted} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK WPISÓW PAMIĘCI{artistFilter ? ' DLA TEGO ARTYSTY' : ''}</p>
            <p style={{ fontSize: '12px', color: t.muted, marginTop: '8px' }}>Pamięć agenta powstaje przy pierwszej rozmowie artysty z jego Gatekeeperem.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[...new Set(filteredMemories.map(m => m.artist_id))].map(id => (
              <AgentMemoryPanel key={id} entries={filteredMemories.filter(m => m.artist_id === id)} artistName={artistName(id)} t={t} />
            ))}
          </div>
        )
      )}
    </div>
  );
}