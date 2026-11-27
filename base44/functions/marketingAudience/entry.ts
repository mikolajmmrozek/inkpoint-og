import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DAY = 86400000;
// Klienci obecni przed wprowadzeniem zgód marketingowych są domyślnie traktowani jako zapisani.
// Profile powstałe później trafiają do odbiorców tylko po zaznaczeniu zgody w ankiecie.
const CONSENT_CUTOFF = new Date('2026-11-28T00:00:00Z');

const asList = (value) => (Array.isArray(value) ? value : value?.items || []);
const norm = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Kategoria usługi z tekstu ankiety (np. „Tatuaż", „Piercing") albo z usługi w rezerwacji.
const categoryFromText = (value) => {
  const text = norm(value);
  if (!text) return null;
  if (text.includes('tatua') || text.includes('tattoo')) return 'tattoo';
  if (text.includes('piercing') || text.includes('przekł') || text.includes('przekl')) return 'piercing';
  if (text.includes('studio') || text.includes('konsult')) return 'studio';
  return null;
};

const ageFrom = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const filters = body.filters || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const db = base44.asServiceRole.entities;
    const [bookings, services, clients, forms, eventBookings, orders] = await Promise.all([
      db.Booking.list('-session_date', 3000),
      db.Service.list(),
      db.Client.list(),
      db.HealthForm.list('-created_date', 3000),
      db.EventBooking.list('-created_date', 3000),
      db.ShopOrder.list('-created_date', 3000),
    ]);

    const serviceMap = {};
    asList(services).forEach((service) => { serviceMap[service.id] = service; });

    const people = new Map();
    const ensure = (email) => {
      const key = norm(email);
      if (!key) return null;
      if (!people.has(key)) {
        people.set(key, {
          email: key, name: '', phone: '', client_id: null, blocked: false,
          visits: 0, last_service: null, categories: new Set(),
          workshop: false, shop_order: false, age: null, minor_flag: false,
          consent: 'undecided', consent_date: '', consent_source: '',
          unsubscribed: false, token: '', since: null,
        });
      }
      return people.get(key);
    };

    // Najwcześniejszy ślad kontaktu — rozstrzyga, czy klient istniał przed wprowadzeniem zgód.
    const touch = (person, date) => {
      if (date && (!person.since || date < person.since)) person.since = date;
    };

    asList(clients).forEach((client) => {
      const person = ensure(client.email);
      if (!person) return;
      person.client_id = client.id;
      person.name = person.name || client.name || [client.first_name, client.last_name].filter(Boolean).join(' ');
      person.phone = person.phone || client.phone || '';
      person.blocked = Boolean(client.is_blocked);
      if (client.marketing_consent === 'granted' || client.marketing_consent === 'denied') {
        person.consent = client.marketing_consent;
      }
      person.consent_date = client.marketing_consent_date || '';
      person.consent_source = client.marketing_consent_source || '';
      person.unsubscribed = Boolean(client.marketing_unsubscribed);
      person.token = client.marketing_token || '';
      touch(person, toDate(client.created_date));
    });

    asList(bookings).forEach((booking) => {
      if (booking.status === 'cancelled' || booking.no_show) return;
      const person = ensure(booking.client_email);
      if (!person) return;
      person.name = person.name || booking.client_name || '';
      person.phone = person.phone || booking.client_phone || '';
      touch(person, toDate(booking.created_date));

      const service = serviceMap[booking.service_id];
      const category = service?.category || categoryFromText(service?.name || booking.service_name);
      if (category) person.categories.add(category);
      asList(booking.additional_services).forEach((extra) => {
        const extraCategory = extra.category || categoryFromText(extra.name);
        if (extraCategory) person.categories.add(extraCategory);
      });

      const date = toDate(booking.session_date);
      if (!date || date > today) return;
      person.visits += 1;
      if (!person.last_service || date > person.last_service) person.last_service = date;
    });

    asList(forms).forEach((form) => {
      const person = ensure(form.client_email);
      if (!person) return;
      person.name = person.name || form.client_name || [form.client_first_name, form.client_last_name].filter(Boolean).join(' ');
      person.phone = person.phone || form.client_phone || '';
      touch(person, toDate(form.created_date));
      const category = categoryFromText(form.procedure_type);
      if (category) person.categories.add(category);
      const age = ageFrom(form.date_of_birth);
      if (age !== null) person.age = age;
      if (form.is_minor) person.minor_flag = true;
    });

    asList(eventBookings).forEach((booking) => {
      if (booking.status === 'cancelled' || booking.status === 'rejected') return;
      const person = ensure(booking.email);
      if (!person) return;
      person.name = person.name || booking.client_name || '';
      person.phone = person.phone || booking.phone || '';
      touch(person, toDate(booking.created_date));
      person.workshop = true;
    });

    asList(orders).forEach((order) => {
      if (order.status === 'cancelled' || order.status === 'returned') return;
      const person = ensure(order.user_email);
      if (!person) return;
      person.name = person.name || order.client_name || '';
      person.phone = person.phone || order.client_phone || '';
      touch(person, toDate(order.created_date));
      person.shop_order = true;
    });

    const wanted = Array.isArray(filters.service_categories) ? filters.service_categories : [];
    const recencyDays = { month: 31, quarter: 92, half_year: 183, year: 366 };

    const matches = (person) => {
      if (wanted.length > 0 && !wanted.some((key) => person.categories.has(key))) return false;
      if (filters.workshop === 'yes' && !person.workshop) return false;
      if (filters.workshop === 'no' && person.workshop) return false;
      if (filters.shop_order === 'yes' && !person.shop_order) return false;
      if (filters.shop_order === 'no' && person.shop_order) return false;

      if (filters.recency && filters.recency !== 'any') {
        if (!person.last_service) return false;
        const days = Math.floor((today - person.last_service) / DAY);
        if (filters.recency === 'older') { if (days <= 366) return false; }
        else if (days > (recencyDays[filters.recency] || 0)) return false;
      }

      if (filters.visits === 'one_time' && person.visits !== 1) return false;
      if (filters.visits === 'returning' && person.visits < 2) return false;

      const isMinor = person.age !== null ? person.age < 18 : person.minor_flag;
      const ageKnown = person.age !== null || person.minor_flag;
      if (filters.adult === 'adult' && !(ageKnown && !isMinor)) return false;
      if (filters.adult === 'minor' && !(ageKnown && isMinor)) return false;
      return true;
    };

    // Zgody: odmowa i wypis wykluczają zawsze. Brak decyzji — tylko klienci sprzed wprowadzenia zgód.
    const consentOf = (person) => (person.unsubscribed ? 'unsubscribed' : person.consent);
    const isEligible = (person) => {
      const consent = consentOf(person);
      if (consent === 'denied' || consent === 'unsubscribed') return false;
      if (consent === 'granted') return true;
      return Boolean(person.since) && person.since < CONSENT_CUTOFF;
    };

    const all = [...people.values()];
    const matched = all.filter(matches).sort((a, b) => (b.last_service?.getTime() || 0) - (a.last_service?.getTime() || 0));
    const eligible = matched.filter(isEligible);
    const excludedNoConsent = matched.length - eligible.length;

    const count = (list, predicate) => list.filter(predicate).length;
    const ageOf = (person) => (person.age !== null ? person.age : person.minor_flag ? 0 : null);

    const slice = eligible.slice(0, 300);

    // Odbiorca bez profilu klienta nie mógłby się wypisać — zakładamy profil z tokenem.
    const noProfile = slice.filter((person) => !person.client_id);
    if (noProfile.length > 0) {
      try {
        await db.Client.bulkCreate(noProfile.map((person) => ({
          first_name: person.name?.split(' ')[0] || '',
          last_name: person.name?.split(' ').slice(1).join(' ') || '',
          name: person.name || person.email,
          email: person.email,
          phone: person.phone || '',
          source: 'booking',
          marketing_token: crypto.randomUUID(),
        })));
        const saved = await db.Client.filter({ email: { $in: noProfile.map((person) => person.email) } });
        asList(saved).forEach((client) => {
          const person = noProfile.find((p) => norm(p.email) === norm(client.email));
          if (person) {
            person.client_id = client.id;
            person.token = client.marketing_token || '';
          }
        });
      } catch (error) {
        // Brak profilu nie blokuje podglądu segmentu.
      }
    }

    // Token do linku REZYGNUJĘ — generowany raz i zapisywany na profilu klienta.
    const missingTokens = slice.filter((person) => person.client_id && !person.token);
    if (missingTokens.length > 0) {
      const patches = missingTokens.map((person) => {
        person.token = crypto.randomUUID();
        return { id: person.client_id, marketing_token: person.token };
      });
      try {
        await db.Client.bulkUpdate(patches);
      } catch (error) {
        missingTokens.forEach((person) => { person.token = ''; });
      }
    }

    const recipients = slice.map((person) => {
      const age = ageOf(person);
      return {
        name: person.name || person.email,
        email: person.email,
        phone: person.phone,
        last_service: person.last_service ? person.last_service.toISOString().slice(0, 10) : '',
        visits: person.visits,
        categories: [...person.categories],
        workshop: person.workshop,
        shop_order: person.shop_order,
        age_group: age === null ? 'unknown' : age < 18 ? 'minor' : 'adult',
        consent: consentOf(person),
        consent_date: person.consent_date,
        consent_source: person.consent_source,
        unsubscribe_token: person.token,
      };
    });

    return Response.json({
      stats: {
        base_total: all.length,
        matched: eligible.length,
        excluded_no_consent: excludedNoConsent,
        consent_granted: count(matched, (p) => consentOf(p) === 'granted'),
        consent_denied: count(matched, (p) => consentOf(p) === 'denied'),
        consent_undecided: count(matched, (p) => consentOf(p) === 'undecided'),
        unsubscribed: count(matched, (p) => p.unsubscribed),
        with_phone: count(eligible, (p) => Boolean(p.phone)),
        blocked: count(eligible, (p) => p.blocked),
        adult: count(eligible, (p) => ageOf(p) !== null && ageOf(p) >= 18),
        minor: count(eligible, (p) => ageOf(p) !== null && ageOf(p) < 18),
        unknown_age: count(eligible, (p) => ageOf(p) === null),
        one_time: count(eligible, (p) => p.visits === 1),
        returning: count(eligible, (p) => p.visits >= 2),
        workshop: count(eligible, (p) => p.workshop),
        shop_order: count(eligible, (p) => p.shop_order),
        categories: {
          tattoo: count(eligible, (p) => p.categories.has('tattoo')),
          piercing: count(eligible, (p) => p.categories.has('piercing')),
          studio: count(eligible, (p) => p.categories.has('studio')),
        },
      },
      recipients,
      truncated: eligible.length > recipients.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}