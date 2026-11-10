import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, Pencil, Trash2, Truck, Power } from 'lucide-react';
import { money } from '@/lib/shop';
import { shopTheme, mono } from './shopTheme';
import ShopShippingEditor from './ShopShippingEditor';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

export default function ShopShippingPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);

  const load = () => {
    base44.entities.ShippingForm.list('order', 100)
      .then(setForms)
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (f) => {
    await base44.entities.ShippingForm.update(f.id, { is_active: f.is_active === false });
    load();
  };

  const remove = async (id) => {
    await base44.entities.ShippingForm.delete(id);
    setDeleteFor(null);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.1em', lineHeight: 1.8, maxWidth: '520px' }}>
          LISTA FORM WYSYŁKI — PRZYPISUJESZ JE DO PRODUKTÓW. CZAS DOSTAWY NALEŻY DO FORMY. FORMA MOŻE MIEĆ OPCJĘ ZAGRANICZNĄ Z WŁASNĄ CENĄ I CZASEM DOSTAWY.
        </p>
        <button onClick={() => setEditing({})} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
          <Plus size={13} /> NOWA FORMA
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : forms.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <Truck size={26} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK FORM WYSYŁKI</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {forms.map((f, i) => {
            const variants = f.international ? (f.international_variants || []) : [];
            return (
              <div key={f.id} className="px-4 py-3" style={{ borderBottom: i < forms.length - 1 ? `0.5px solid ${t.border}` : 'none', opacity: f.is_active === false ? 0.55 : 1 }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p style={{ fontSize: '13px', color: t.title }}>{f.name}</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '3px' }}>
                      KRAJ: {Number(f.cost) > 0 ? money(f.cost) : 'GRATIS'}{Number(f.free_from) > 0 ? ` · GRATIS OD ${money(f.free_from)}` : ''}{f.delivery_time ? ` · ${f.delivery_time}` : ''}
                      {f.international ? ` · ZAGRANICA: ${variants.length > 0 ? variants.map(v => `${v.label} ${money(v.cost)}${Number(v.free_from) > 0 ? ` (gratis od ${money(v.free_from)})` : ''}${v.delivery_time ? ` (${v.delivery_time})` : ''}`).join(' · ') : 'BRAK STREF'}` : ''}
                    </p>
                    {f.info && <p style={{ fontSize: '11px', color: t.muted, marginTop: '4px' }}>{f.info}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleActive(f)} title="Włącz/wyłącz" style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.is_active === false ? t.muted : '#16a34a', padding: '4px' }}><Power size={13} /></button>
                    <button onClick={() => setEditing(f)} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Pencil size={13} /></button>
                    <button onClick={() => setDeleteFor(f)} title="Usuń" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ShopShippingEditor
          shippingForm={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteFor}
        title="Usuń formę wysyłki"
        message={`Czy na pewno usunąć „${deleteFor?.name}"? Produkty, które ją mają, wrócą do własnego kosztu dostawy.`}
        onConfirm={() => remove(deleteFor.id)}
        onCancel={() => setDeleteFor(null)}
        theme={theme}
      />
    </div>
  );
}