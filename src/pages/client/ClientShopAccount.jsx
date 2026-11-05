import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, X, Pencil, Trash2, MapPin, Receipt, Building2 } from 'lucide-react';
import AddressFields from '@/components/shop/AddressFields';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

const SECTIONS = [
  { type: 'shipping', title: 'Adresy dostawy', icon: MapPin },
  { type: 'billing', title: 'Adres rozliczeniowy', icon: Receipt },
  { type: 'invoice', title: 'Dane do faktury', icon: Building2 },
];

export default function ClientShopAccount() {
  const { user, theme } = useOutletContext();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.6)', panelBg: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.7)', panelBg: '#141414' };

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteFor, setDeleteFor] = useState(null);

  const load = () => {
    if (!user?.email) return;
    base44.entities.ShopAddress.filter({ user_email: user.email }, '-created_date', 100)
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.email]);

  const openNew = (type) => {
    setEditing('new');
    setForm({ type, country: 'Polska', user_email: user.email, first_name: '', last_name: '', is_default: false });
  };

  const openEdit = (a) => { setEditing(a.id); setForm({ ...a }); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        user_email: user.email,
        type: form.type,
        label: form.label || '',
        first_name: form.first_name || '',
        last_name: form.last_name || '',
        company: form.company || '',
        nip: form.nip || '',
        street: form.street || '',
        postal_code: form.postal_code || '',
        city: form.city || '',
        country: form.country || 'Polska',
        phone: form.phone || '',
        is_default: !!form.is_default,
      };
      if (editing === 'new') {
        await base44.entities.ShopAddress.create(payload);
      } else {
        await base44.entities.ShopAddress.update(editing, payload);
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.ShopAddress.delete(id);
    setDeleteFor(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>SKLEP</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Dane sklepu</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.05em', marginTop: '10px', maxWidth: '480px', lineHeight: 1.6 }}>
          Adresy dostawy, dane rozliczeniowe i dane do faktury.
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          const list = addresses.filter(a => a.type === section.type);
          return (
            <div key={section.type} style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '22px', borderRadius: 'var(--radius)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <Icon size={14} color="var(--brand)" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: t.title, letterSpacing: '0.04em' }}>{section.title}</h3>
                </div>
                <button onClick={() => openNew(section.type)} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 14px', border: `0.5px solid var(--brand)`, color: 'var(--brand)', background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                  <Plus size={11} /> DODAJ
                </button>
              </div>

              {list.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>BRAK ZAPISANYCH DANYCH</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map(a => (
                    <div key={a.id} className="p-3.5" style={{ border: `0.5px solid ${t.border}`, background: t.panelBg, borderRadius: 'var(--radius)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {a.label && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px' }}>{a.label}</p>}
                          {a.company ? (
                            <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>
                              {a.company}{a.nip ? ` · NIP ${a.nip}` : ''}<br />
                              {a.street}<br />{a.postal_code} {a.city}<br />{a.country}
                            </p>
                          ) : (
                            <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>
                              {a.first_name} {a.last_name}<br />
                              {a.street}<br />{a.postal_code} {a.city}<br />{a.country}
                              {a.phone ? <><br />{a.phone}</> : null}
                            </p>
                          )}
                          {a.is_default && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '6px' }}>DOMYŚLNY</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Pencil size={13} /></button>
                          <button onClick={() => setDeleteFor(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em' }}>
                {editing === 'new' ? 'Nowe dane' : 'Edytuj dane'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={17} /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Etykieta (np. Dom)</label>
                <input value={form.label || ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.border}`, color: t.text, padding: '10px 0', fontSize: '14px', outline: 'none' }} />
              </div>
              <AddressFields
                value={form}
                onChange={setForm}
                t={{ border: t.border, text: t.text, muted: t.muted }}
                fields={form.type}
                showCompany={form.type === 'invoice'}
              />
              <button onClick={() => setForm(f => ({ ...f, is_default: !f.is_default }))} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_default ? '#16a34a' : t.muted }}>
                <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_default ? '#16a34a' : t.border}`, background: form.is_default ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_default && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</span>
                Ustaw jako domyślny
              </button>
            </div>

            <div className="flex gap-3 mt-8 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={save} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '11px', fontSize: '10px', opacity: saving ? 0.6 : 1 }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
              <button onClick={() => setEditing(null)} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteFor}
        title="Usuń dane"
        message="Czy na pewno chcesz usunąć ten wpis?"
        onConfirm={() => remove(deleteFor.id)}
        onCancel={() => setDeleteFor(null)}
        theme={theme}
      />
    </div>
  );
}