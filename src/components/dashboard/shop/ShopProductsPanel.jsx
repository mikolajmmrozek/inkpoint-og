import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Power, ChevronDown, ChevronRight, ArrowUpRight } from 'lucide-react';
import { money, availability, shippingSummary } from '@/lib/shop';
import { shopTheme, mono, display } from './shopTheme';
import ShopProductEditor from './ShopProductEditor';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

export default function ShopProductsPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [search, setSearch] = useState('');
  const [openStocks, setOpenStocks] = useState([]);
  const toggleStocks = (id) => setOpenStocks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const load = () => {
    Promise.all([
      base44.entities.ShopProduct.list('order', 300).catch(() => []),
      base44.entities.ShopCategory.list('order', 100).catch(() => []),
      base44.entities.ShopCollection.list('order', 100).catch(() => []),
      base44.entities.ShippingForm.list('order', 100).catch(() => []),
    ]).then(([p, c, col, f]) => { setProducts(p); setCategories(c); setCollections(col); setForms(f); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (p) => {
    await base44.entities.ShopProduct.update(p.id, { is_active: p.is_active === false });
    load();
  };

  const remove = async (id) => {
    await base44.entities.ShopProduct.delete(id);
    setDeleteFor(null);
    load();
  };

  const filtered = search
    ? products.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.category_name || '').toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '7px 12px', borderRadius: 'var(--radius)', minWidth: '220px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj produktu..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '12px' }} />
        </div>
        <button onClick={() => setEditing({})} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
          <Plus size={13} /> NOWY PRODUKT
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <Package size={26} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK PRODUKTÓW</p>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {filtered.map((p, i) => {
            const avail = availability(p);
            const variants = Array.isArray(p.variants) ? p.variants : [];
            const hasVariants = variants.length > 0;
            const open = openStocks.includes(p.id);
            const stockColor = avail.state === 'sold_out' ? '#9ca3af' : avail.state === 'soon' ? '#f59e0b' : t.muted;
            const shipSummary = shippingSummary(p, forms);
            const shippingDetails = [
              ...forms.filter(f => (p.shipping_form_ids || []).includes(f.id)).map(f => `${f.name} · ${Number(f.cost) > 0 ? money(f.cost) : 'gratis'}${f.delivery_time ? ` · ${f.delivery_time}` : ''}`),
              ...(p.pickup_in_studio ? ['Odbiór w studio · gratis'] : []),
            ];
            const hasDetails = hasVariants || shippingDetails.length > 0;
            return (
              <div key={p.id} style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none', opacity: p.is_active === false ? 0.55 : 1 }}>
              <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                <div onClick={() => setEditing(p)} className="col-span-6 md:col-span-4 flex items-center gap-3 min-w-0" style={{ cursor: 'pointer' }} title="Edytuj produkt">
                  <div style={{ width: '42px', height: '52px', overflow: 'hidden', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', flexShrink: 0, background: t.panel }}>
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: '13px', color: t.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>{p.category_name || 'BEZ KATEGORII'}</p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <p style={{ ...mono, fontSize: '12px', color: 'var(--brand)' }}>{money(p.price)}</p>
                </div>
                <div className="col-span-2 md:col-span-2">
                  {p.unlimited_stock ? (
                    <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>∞ BEZ LIMITU</p>
                  ) : hasVariants ? (
                    <button onClick={() => toggleStocks(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px', textAlign: 'left' }} title="Pokaż stany wariantów">
                      <span style={{ ...mono, fontSize: '9px', color: stockColor, letterSpacing: '0.06em' }}>
                        {avail.state === 'in_stock' ? `${avail.stock ?? 0} szt.` : avail.state === 'soon' ? 'WKRÓTCE' : 'WYPRZEDANE'}
                      </span>
                      {open ? <ChevronDown size={11} color={t.muted} /> : <ChevronRight size={11} color={t.muted} />}
                    </button>
                  ) : (
                    <p style={{ ...mono, fontSize: '9px', color: stockColor, letterSpacing: '0.06em' }}>
                      {avail.state === 'in_stock' ? `${avail.stock ?? 0} szt.` : avail.state === 'soon' ? 'WKRÓTCE' : 'WYPRZEDANE'}
                    </p>
                  )}
                </div>
                <div className="col-span-2 md:col-span-2">
                  <button onClick={() => hasDetails && toggleStocks(p.id)} style={{ background: 'none', border: 'none', cursor: hasDetails ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', gap: '3px', textAlign: 'left' }} title="Pokaż szczegóły dostawy">
                    <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>
                      {shipSummary.cost > 0 ? `DOSTAWA ${shipSummary.text.toUpperCase()}` : 'DOSTAWA GRATIS'}
                    </span>
                    {hasDetails && (open ? <ChevronDown size={11} color={t.muted} /> : <ChevronRight size={11} color={t.muted} />)}
                  </button>
                </div>
                <div className="col-span-3 md:col-span-2 flex items-center gap-1.5 justify-end">
                  <Link to={`/sklep/produkt/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer" title="Otwórz stronę produktu w sklepie"
                    style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${t.border}`, color: t.muted, borderRadius: 'var(--radius)', textDecoration: 'none' }}>
                    <ArrowUpRight size={12} />
                  </Link>
                  <button onClick={() => toggleActive(p)} title="Włącz/wyłącz" style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_active === false ? t.muted : '#16a34a', padding: '4px' }}><Power size={13} /></button>
                  <button onClick={() => setEditing(p)} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Pencil size={13} /></button>
                  <button onClick={() => setDeleteFor(p)} title="Usuń" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>
              {hasDetails && open && (
                <div className="grid grid-cols-12 gap-3 px-4 pb-4">
                  <div className="hidden md:block md:col-span-4" />
                  <div className="hidden md:block md:col-span-2" />
                  <div className="col-span-6 md:col-span-2 flex flex-col gap-1">
                    {hasVariants && variants.map(v => {
                      const label = (v.options || []).map(o => o.value).join(' / ') || v.key;
                      const qty = Number(v.stock) || 0;
                      return (
                        <span key={v.key} style={{ ...mono, fontSize: '9px', letterSpacing: '0.06em', color: qty > 0 ? t.text : '#9ca3af' }}>
                          {label}: {qty} szt.
                        </span>
                      );
                    })}
                  </div>
                  <div className="col-span-6 md:col-span-2 flex flex-col gap-1">
                    {shippingDetails.map((txt, idx) => (
                      <span key={idx} style={{ ...mono, fontSize: '9px', letterSpacing: '0.06em', color: t.muted }}>{txt}</span>
                    ))}
                  </div>
                  <div className="hidden md:block md:col-span-2" />
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ShopProductEditor
          product={editing.id ? editing : null}
          categories={categories}
          collections={collections}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteFor}
        title="Usuń produkt"
        message={`Czy na pewno usunąć „${deleteFor?.name}"?`}
        onConfirm={() => remove(deleteFor.id)}
        onCancel={() => setDeleteFor(null)}
        theme={theme}
      />
    </div>
  );
}