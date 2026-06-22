import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import PanelMessages from '@/components/panel/PanelMessages';

export default function ArtistMessages() {
  const { artist, theme } = useOutletContext();
  const { user } = useAuth();
  return (
    <PanelMessages
      theme={theme}
      userEmail={user?.email}
      userName={artist?.name || user?.full_name}
      roleLabel="ARTYSTA"
    />
  );
}