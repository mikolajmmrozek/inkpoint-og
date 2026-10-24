import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Publiczny podgląd dostępu do vouchera po kodzie (dla klienta bez logowania).
// Zwraca wyłącznie to, czy voucher o danym kodzie istnieje i czy jest przypisany
// do konta klienta — bez żadnych danych vouchera (kwota, saldo, e-mail itd.).
export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const code = String(body.code || '').trim().toUpperCase();
    if (!code || code.length > 16) return Response.json({ error: 'Podaj kod' }, { status: 400 });
    const base44 = createClientFromRequest(req);
    const list = await base44.asServiceRole.entities.Promotion.filter({ code });
    const voucher = list.find((p: any) => p.type === 'voucher');
    if (!voucher) return Response.json({ exists: false });
    return Response.json({ exists: true, assigned: !!voucher.assigned_client_email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}