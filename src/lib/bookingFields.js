export const BOOKING_FIELD_DEFS = [
  { key: 'placement', label: 'Miejsce na ciele' },
  { key: 'description', label: 'Opis projektu' },
  { key: 'notes', label: 'Dodatkowe uwagi' },
  { key: 'references', label: 'Zdjęcia referencyjne' },
  { key: 'budget', label: 'Preferowany budżet (PLN)' },
];

// Domyślnie pole jest widoczne i nieobowiązkowe; „wymagane” zawsze oznacza widoczne.
export const normalizeBookingFields = (fields) => {
  const out = {};
  BOOKING_FIELD_DEFS.forEach(({ key }) => {
    const raw = fields?.[key] || {};
    const required = raw.required === true;
    out[key] = { visible: required ? true : raw.visible !== false, required };
  });
  return out;
};

// Zachowanie sprzed konfiguracji: tattoo wymagał miejsca i opisu.
const legacyRequired = (category) => (category === 'tattoo' ? ['placement', 'description'] : []);

export const resolveBookingFields = (service, configs = []) => {
  const category = service?.category || '';
  const config = configs.find((c) => c.category === category);
  const base = config
    ? normalizeBookingFields(config.fields || {})
    : normalizeBookingFields(Object.fromEntries(legacyRequired(category).map((key) => [key, { visible: true, required: true }])));

  const useOwn = service && service.booking_fields_use_category === false && service.booking_fields_override;
  const fields = useOwn ? normalizeBookingFields(service.booking_fields_override) : base;

  // Stare pola „opcjonalne” na usłudze nadal zdejmują wymagalność.
  if (service?.placement_optional) fields.placement = { ...fields.placement, required: false };
  if (service?.description_optional) fields.description = { ...fields.description, required: false };

  return fields;
};