/**
 * Reużywalny znacznik badge dla elementów menu sidebar.
 * type='count' — czerwony dymek z liczbą (1-99, potem 99+)
 * type='dot'  — mała kropka sygnalizująca nową aktywność
 */
export default function SidebarBadge({ type, value }) {
  if (!value || value === 0) return null;

  if (type === 'count') {
    return (
      <span
        style={{
          position: 'absolute',
          top: '-3px',
          right: '-5px',
          minWidth: '14px',
          height: '14px',
          background: 'var(--brand)',
          color: '#F5F0EB',
          fontSize: '8px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '7px',
          padding: '0 3px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value > 99 ? '99+' : value}
      </span>
    );
  }

  // dot
  return (
    <span
      style={{
        position: 'absolute',
        top: '-1px',
        right: '-2px',
        width: '6px',
        height: '6px',
        background: 'var(--brand)',
        borderRadius: '50%',
      }}
    />
  );
}