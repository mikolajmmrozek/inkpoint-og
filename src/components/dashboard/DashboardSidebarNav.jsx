import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import SidebarBadge from '@/components/panel/SidebarBadge';
import { NAV_GROUPS, groupKeyForPath } from '@/lib/dashboardNav';

const badgeForPath = (path, counts) => {
  const map = {
    '/dashboard/messages': counts.messages > 0 ? { type: 'count', value: counts.messages } : null,
    '/dashboard/bookings': (counts.pendingBookings + counts.openChangeRequests) > 0
      ? { type: 'count', value: counts.pendingBookings + counts.openChangeRequests }
      : null,
    '/dashboard/health-forms': counts.newHealthForms > 0 ? { type: 'count', value: counts.newHealthForms } : null,
    '/dashboard/feedback': counts.unpublishedFeedback > 0 ? { type: 'count', value: counts.unpublishedFeedback } : null,
    '/dashboard/clients': counts.newClients > 0 ? { type: 'count', value: counts.newClients } : null,
  };
  return map[path] || null;
};

// Menu panelu w rozwijanych kategoriach; stan zwinięcia grup trzyma konto użytkownika.
export default function DashboardSidebarNav({ theme, collapsed, counts, onNavigate, closedGroups = {}, onGroupToggle }) {
  const location = useLocation();
  const activeGroup = groupKeyForPath(location.pathname);

  // Strona, na której jesteśmy, ma zawsze otwartą swoją kategorię.
  useEffect(() => {
    if (activeGroup && closedGroups[activeGroup]) onGroupToggle?.(activeGroup);
  }, [activeGroup, closedGroups]);

  const toggleGroup = (key) => onGroupToggle?.(key);

  const textColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const mutedColor = theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.75)';
  const iconColor = (active) => (active ? 'var(--brand)' : (theme === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(245,240,235,0.65)'));

  const renderItem = (nav) => {
    const Icon = nav.icon;
    const active = nav.exact ? location.pathname === nav.path : location.pathname.startsWith(nav.path);
    const badge = badgeForPath(nav.path, counts);
    return (
      <Link
        key={nav.path}
        to={nav.path}
        className="flex items-center gap-3 px-4 py-2.5 whitespace-nowrap overflow-hidden transition-colors duration-200"
        style={{
          background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
          borderLeft: active ? '2px solid var(--brand)' : '2px solid transparent',
          color: active ? textColor : mutedColor,
        }}
        onClick={onNavigate}
        title={collapsed ? nav.label : ''}
      >
        <div className="shrink-0" style={{ position: 'relative' }}>
          <Icon size={20} color={iconColor(active)} />
          {badge && <SidebarBadge type={badge.type} value={badge.value} />}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {nav.label}
        </span>
      </Link>
    );
  };

  // Zwinięty pasek na desktopie: same ikony, bez nagłówków kategorii —
  // pokazujemy tylko pozycje z kategorii, które były rozwinięte przed zwinięciem.
  if (collapsed) {
    return (
      <>
        {NAV_GROUPS.map(group => {
          if (!group.label) return <div key={group.key}>{group.items.map(renderItem)}</div>;
          if (closedGroups[group.key]) return null;
          return <div key={group.key}>{group.items.map(renderItem)}</div>;
        })}
      </>
    );
  }

  return (
    <>
      {NAV_GROUPS.map(group => {
        if (!group.label) return <div key={group.key}>{group.items.map(renderItem)}</div>;
        const open = !closedGroups[group.key];
        return (
          <div key={group.key}>
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex items-center justify-between w-full px-4 pt-4 pb-1.5"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedColor }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65 }}>
                {group.label}
              </span>
              <ChevronDown
                size={12}
                style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', opacity: 0.65 }}
              />
            </button>
            {open && <div>{group.items.map(renderItem)}</div>}
          </div>
        );
      })}
    </>
  );
}