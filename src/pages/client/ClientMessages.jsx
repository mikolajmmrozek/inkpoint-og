import { useOutletContext } from 'react-router-dom';
import PanelMessages from '@/components/panel/PanelMessages';

export default function ClientMessages() {
  const { user, theme } = useOutletContext();
  return (
    <PanelMessages
      theme={theme}
      userEmail={user?.email}
      userName={user?.full_name}
      roleLabel="KLIENT"
    />
  );
}