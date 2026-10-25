import GatekeeperChat from './GatekeeperChat';
import { base44 } from '@/api/base44Client';

// Prywatny Gatekeeper artysty — osobny agent (GatekeeperArtist), osobna historia
// rozmów i prywatna pamięć. Każda wymiana jest logowana (z anonimizacją PII
// po stronie serwera) do obserwacyjnego zbioru dla administratorów.

const SUGGESTIONS = [
  'Co potrafisz? Opisz swoje funkcje',
  'Jakie mam sesje w tym tygodniu?',
  'Kto i kiedy edytował sesję SES-…?',
  'Dodaj sesję dla klienta na przyszły wtorek',
  'Jaki był mój przychód w tym miesiącu?',
];

// Każda zakończona wymiana trafia do logu obserwacyjnego (serwer anonimizuje dane klientów)
const logger = (payload) => base44.functions.invoke('logGatekeeperTranscript', payload);

export default function ArtistGatekeeperChat({ theme = 'dark', onClose }) {
  return (
    <GatekeeperChat
      theme={theme}
      onClose={onClose}
      agentName="GatekeeperArtist"
      conversationToolName="artistManageConversation"
      suggestions={SUGGESTIONS}
      showMemory={false}
      allowAttachments={true}
      logger={logger}
      subtitle="Gatekeeper · Asystent Artysty"
    />
  );
}