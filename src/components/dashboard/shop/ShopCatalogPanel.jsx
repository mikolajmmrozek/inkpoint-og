import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, Pencil, Trash2, X, Check, Upload, FolderOpen, Layers, Settings2, Sparkles } from 'lucide-react';
import { slugify } from '@/lib/shop';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import ShopPiercingPanel from './ShopPiercingPanel';

const TABS = [
  { id: 'categories', label: 'Kategorie', icon: FolderOpen },
  { id: 'collections', label: 'Kolekcje', icon: Layers },
  { id: 'piercing', label: 'Przekłucia', icon: Sparkles },
  { id: 'settings', label: 'Ustawienia', icon: Settings2 },
];

export default function ShopCatalogPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [tab, setTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { kind, data }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteFor, setDeleteFor] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.ShopCategory.list('order', 100).catch(() => []),
      base44.entities.ShopCollection.list('order', 100).catch(() => []),
      base44.entities.ShopProduct.list('order', 300).catch(() => []),
      base44.entities.ShopSettings.filter({ key: 'default' }).catch(() => []),
    ]).then(([c, col, p, s]) => {
      setCategories(c);
      setCollections(col);
      setProducts(p);
      setSettings(s[0] || { key: 'default', shipping_cost: 0, free_shipping_from: 0, shipping_note: '', contact_email: '', is_open: true });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = (kind) => {
    setEditing({ kind, id: null });
    setForm(kind === 'categories'
      ? { name: '', slug: '', description: '', image_url: '', order: 999, is_active: true, filter_group: 'none' }
      : { name: '', slug: '', description: '', image_url: '', order: 999, is_active: true, product_ids: [] });
  };

  const openEdit = (kind, record) => {
    setEditing({ kind, id: record.id });
    setForm({ ...record });
  };

  const upload = async (file) => {
    if (!file) return;
    const res = await base44.integrations.Core.UploadPublicFile({ file });
    setForm(f => ({ ...f, image_url: res.file_url }));
  };

  const save = async () => {
    if (!form.name?.trim()) { alert('Podaj nazwę.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        description: form.description || '',
        image_url: form.image_url || '',
        order: Number(form.order) || 999,
        is_active: form.is_active !== false,
        ...(editing.kind === 'collections' ? { product_ids: form.product_ids || [] } : {}),
        ...(editing.kind === 'categories' ? { filter_group: form.filter_group === 'piercing' ? 'piercing' : 'none' } : {}),
      };
      const entity = editing.kind === 'categories' ? base44.entities.ShopCategory : base44.entities.ShopCollection;
      if (editing.id) await entity.update(editing.id, payload);
      else await entity.create(payload);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (kind, id) => {
    const entity = kind === 'categories' ? base44.entities.ShopCategory : base44.entities.ShopCollection;
    await entity.delete(id);
    setDeleteFor(null);
    load();
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        key: 'default',
        shipping_cost: Number(settings.shipping_cost) || 0,
        free_shipping_from: Number(settings.free_shipping_from) || 0,
        shipping_note: settings.shipping_note || '',
        contact_email: settings.contact_email || '',
        is_open: settings.is_open !== false,
      };
      if (settings.id) await base44.entities.ShopSettings.update(settings.id, payload);
      else await base44.entities.ShopSettings.create(payload);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
      load();
    } finally {
      setSaving(false);
    }
  };

  const list = tab === 'categories' ? categories : collections;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6 items-center justify-between">
        <div className="flex gap-2">
          {TABS.map(tb => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} className="flex items-center gap-2"
                style={{ border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                <Icon size={11} /> {tb.label}
              </button>
            );
          })}
        </div>
        {tab !== 'settings' && tab !== 'piercing' && (
          <button onClick={() => openNew(tab)} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
            <Plus size={13} /> {tab === 'categories' ? 'NOWA KATEGORIA' : 'NOWA KOLEKCJA'}
          </button>
        )}
      </div>

      {tab === 'piercing' ? (
        <ShopPiercingPanel />
      ) : tab === 'settings' ? (
        <div className="max-w-lg p-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '18px' }}>USTAWIENIA SKLEPU</p>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><label style={labelStyle(t)}>Koszt dostawy (zł)</label><input type="number" value={settings.shipping_cost ?? 0} onChange={e => setSettings(s => ({ ...s, shipping_cost: e.target.value }))} style={inputStyle(t)} /></div>
              <div><label style={labelStyle(t)}>Darmowa dostawa od (zł)</label><input type="number" value={settings.free_shipping_from ?? 0} onChange={e => setSettings(s => ({ ...s, free_shipping_from: e.target.value }))} style={inputStyle(t)} /></div>
            </div>
            <div><label style={labelStyle(t)}>Informacja o dostawie</label><input value={settings.shipping_note || ''} onChange={e => setSettings(s => ({ ...s, shipping_note: e.target.value }))} placeholder="np. Wysyłka w 3-5 dni roboczych" style={inputStyle(t)} /></div>
            <div><label style={labelStyle(t)}>E-mail kontaktowy sklepu</label><input value={settings.contact_email || ''} onChange={e => setSettings(s => ({ ...s, contact_email: e.target.value }))} style={inputStyle(t)} /></div>
            <button onClick={() => setSettings(s => ({ ...s, is_open: s.is_open === false }))} style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: settings.is_open !== false ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${settings.is_open !== false ? '#16a34a' : t.border}`, background: settings.is_open !== false ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{settings.is_open !== false && <Check size={9} color="#fff" />}</span>
              Sklep przyjmuje zamówienia
            </button>
            <button onClick={saveSettings} disabled={saving} className="btn-oxblood flex items-center gap-2" style={{ padding: '10px 18px' }}>
              {settingsSaved ? <><Check size={12} /> ZAPISANO</> : 'ZAPISZ USTAWIENIA'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.length === 0 && (
            <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em', padding: '30px 0' }}>BRAK WPISÓW</p>
          )}
          {list.map(item => {
            const count = tab === 'categories'
              ? products.filter(p => p.category_id === item.id).length
              : products.filter(p => (p.collection_ids || []).includes(item.id) || (item.product_ids || []).includes(p.id)).length;
            return (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)', opacity: item.is_active === false ? 0.6 : 1 }}>
                <div className="flex items-center gap-3 min-w-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={14} color={t.muted} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p style={{ ...display, fontSize: '1.15rem', color: t.title, letterSpacing: '0.03em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '3px' }}>{count} produktów · /{item.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(tab, item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Pencil size={13} /></button>
                  <button onClick={() => setDeleteFor({ kind: tab, item })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h3 style={{ ...display, fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em' }}>
                {editing.id ? 'Edytuj' : 'Nowy'} {editing.kind === 'categories' ? 'kategorię' : 'kolekcję'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={17} /></button>
            </div>

            <div className="space-y-5">
              <div><label style={labelStyle(t)}>Nazwa *</label><input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} style={inputStyle(t)} /></div>
              <div><label style={labelStyle(t)}>Adres URL (slug)</label><input value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} style={inputStyle(t)} /></div>
              <div><label style={labelStyle(t)}>Opis</label><textarea rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle(t), resize: 'vertical', border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }} /></div>
              {editing.kind === 'categories' && (
                <div>
                  <label style={labelStyle(t)}>Filtry kategorii</label>
                  <select value={form.filter_group || 'none'} onChange={e => setForm(f => ({ ...f, filter_group: e.target.value }))} style={{ ...inputStyle(t), colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                    <option value="none">Brak dodatkowych filtrów</option>
                    <option value="piercing">Przekłucia — miejsce i rodzaj</option>
                  </select>
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', lineHeight: 1.6 }}>
                    Opcje filtrów edytujesz w zakładce „Przekłucia”. Produktom w tej kategorii przypiszesz je w edycji produktu.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4">
                {form.image_url && <img src={form.image_url} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} />}
                <label style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 14px', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={12} /> ZDJĘCIE
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} />
                </label>
              </div>

              {editing.kind === 'collections' && (
                <div>
                  <label style={labelStyle(t)}>Produkty w kolekcji</label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {products.map(p => {
                      const active = (form.product_ids || []).includes(p.id);
                      return (
                        <button key={p.id} onClick={() => setForm(f => ({ ...f, product_ids: active ? (f.product_ids || []).filter(id => id !== p.id) : [...(f.product_ids || []), p.id] }))}
                          className="flex items-center gap-2 w-full text-left"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', color: active ? 'var(--brand)' : t.muted, fontSize: '12px' }}>
                          <span style={{ width: '12px', height: '12px', border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, background: active ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{active && <Check size={9} color="#fff" />}</span>
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-5">
                <div style={{ width: '100px' }}><label style={labelStyle(t)}>Kolejność</label><input type="number" value={form.order ?? 999} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} style={inputStyle(t)} /></div>
                <button onClick={() => setForm(f => ({ ...f, is_active: f.is_active === false }))} style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active !== false ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px', marginTop: '14px' }}>
                  <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active !== false ? '#16a34a' : t.border}`, background: form.is_active !== false ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_active !== false && <Check size={9} color="#fff" />}</span>
                  Widoczna
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-7 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={save} disabled={saving} className="btn-oxblood flex-1" style={{ padding: '11px' }}>{saving ? 'ZAPISYWANIE...' : 'ZAPISZ'}</button>
              <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteFor}
        title="Usuń wpis"
        message={`Czy na pewno usunąć „${deleteFor?.item?.name}"?`}
        onConfirm={() => remove(deleteFor.kind, deleteFor.item.id)}
        onCancel={() => setDeleteFor(null)}
        theme={theme}
      />
    </div>
  );
}