// Serious medical contraindications → red badge
const SERIOUS_FIELDS = [
  'has_heart_condition',
  'has_kidney_condition',
  'has_liver_condition',
  'has_lung_condition',
  'has_cancer',
  'has_infectious_diseases',
  'has_epilepsy',
  'has_diabetes',
  'has_hemophilia',
  'has_blood_clotting_disorders',
  'has_inflammatory_conditions',
  'is_pregnant',
  'is_under_alcohol_drug_influence',
];

// Minor reported issues → yellow badge
const MINOR_FIELDS = [
  'has_allergies',
  'is_allergic_to_metals_dyes_latex',
  'has_skin_conditions',
  'has_scars_skin_changes',
  'has_mental_conditions',
  'has_other_chronic_diseases',
];

const SEVERITY = { none: 0, green: 1, yellow: 2, red: 3 };

// Classify a single health form: 'none' | 'green' | 'yellow' | 'red'
export function getHealthFormStatus(form) {
  if (!form || form.is_draft) return 'none';
  if (SERIOUS_FIELDS.some(f => form[f])) return 'red';
  if (MINOR_FIELDS.some(f => form[f])) return 'yellow';
  return 'green';
}

// Build a map: bookingId -> most severe status from a list of health forms
export function buildHealthFormStatusMap(forms = []) {
  const map = {};
  forms.forEach(f => {
    if (!f.booking_id) return;
    const s = getHealthFormStatus(f);
    if (!map[f.booking_id] || SEVERITY[s] > SEVERITY[map[f.booking_id]]) {
      map[f.booking_id] = s;
    }
  });
  return map;
}

// Resolve status for a booking, falling back to the completed flag
export function resolveBookingHealthStatus(booking, statusMap = {}) {
  if (!booking) return 'none';
  return statusMap[booking.id] || (booking.health_form_completed ? 'green' : 'none');
}