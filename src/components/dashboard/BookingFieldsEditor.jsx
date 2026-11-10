import { BOOKING_FIELD_DEFS, normalizeBookingFields } from '@/lib/bookingFields';

export default function BookingFieldsEditor({ value, onChange, t }) {
  const fields = normalizeBookingFields(value);

  const update = (key, patch) => {
    const next = { ...fields, [key]: { ...fields[key], ...patch } };
    if (next[key].required) next[key].visible = true;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {BOOKING_FIELD_DEFS.map(({ key, label }) => {
        const field = fields[key];
        return (
          <div key={key} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <span style={{ fontSize: '13px', color: field.visible ? t.text : t.muted }}>{label}</span>
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => update(key, { visible: !field.visible, required: field.visible ? false : field.required })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: field.visible ? 'var(--brand)' : t.muted }}
              >
                {field.visible ? 'Widoczne' : 'Ukryte'}
              </button>
              <button
                type="button"
                onClick={() => update(key, { required: !field.required, visible: true })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: field.required ? '#f59e0b' : t.muted }}
              >
                {field.required ? 'Wymagane' : 'Opcjonalne'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}