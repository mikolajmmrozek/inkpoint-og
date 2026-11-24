import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normEmail } from '../../shared/eventCore.ts';

// Przypisanie zapisów gościnnych do konta klienta: dopasowanie wyłącznie po
// własnym, zweryfikowanym adresie e-mail zalogowanego użytkownika.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = normEmail(user.email);
    const all = await base44.asServiceRole.entities.EventBooking.filter({ email });
    const unclaimed = all.filter((b: any) => !b.user_email);

    for (const booking of unclaimed) {
      await base44.asServiceRole.entities.EventBooking.update(booking.id, { user_email: email });
    }

    return Response.json({ claimed: unclaimed.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}