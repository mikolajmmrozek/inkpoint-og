import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Power, ChevronDown, ChevronRight, ArrowUpRight, BarChart2 } from 'lucide-react';
import { money, availability, shippingSummary } from '@/lib/shop';
import { shopTheme, mono, display } from './shopTheme';
import ShopProductEditor from './ShopProductEditor';
import ShopProductsFilters from './ShopProductsFilters';
import ShopProductsBulkBar from './ShopProductsBulkBar';
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
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

  const q = search.trim().toLowerCase();
  const filtered = products.filter(p => {
    if (q) {
      const haystack = `${p.name || ''} ${p.sku || ''} ${p.category_name || ''} ${(p.variants || []).map(v => v.sku || '').join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (categoryFilter && (p.category_name || '') !== categoryFilter) return false;
    if (statusFilter === 'active' && p.is_active === false) return false;
    if (statusFilter === 'inactive' && p.is_active !== false) return false;
    if (availabilityFilter && availability(p).state !== availabilityFilter) return false;
    return true;
  });

  const visibleIds = filtered.map(p => p.id);
  const allFilteredSelected = visibleIds.length > 0 && visibleIds.every(id => selected.includes(id));
  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelected(allFilteredSelected ? [] : visibleIds);
  const invertSelection = () => setSelected(visibleIds.filter(id => !selected.includes(id)));

  // Zaznaczenie dotyczy tylko widocznych produktów — zmiana filtrów odznacza ukryte.
  useEffect(() => {
    setSelected(prev => prev.filter(id => visibleIds.includes(id)));
  }, [search, categoryFilter, statusFilter, availabilityFilter]);

  const bulkSetActive = async (isActive) => {
    if (selected.length === 0) return;
    setBulkBusy(true);
    try {
      await base44.entities.ShopProduct.bulkUpdate(selected.map(id => ({ id, is_active: isActive })));
      setSelected([]);
      load();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkRemove = async () => {
    if (selected.length === 0) return;
    setBulkBusy(true);
    try {
      await base44.entities.ShopProduct.deleteMany({ id: { $in: selected } });
      setSelected([]);
      setBulkDelete(false);
      load();
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <ShopProductsFilters
          search={search}
          onSearch={setSearch}
          category={categoryFilter}
          onCategory={setCategoryFilter}
          status={statusFilter}
          onStatus={setStatusFilter}
          availability={availabilityFilter}
          onAvailability={setAvailabilityFilter}
          categories={categories}
          theme={theme}
          t={t}
        />
        <button onClick={() => setEditing({})} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
          <Plus size={13} /> NOWY PRODUKT
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
          <Package size={26} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
            {products.length === 0 ? 'BRAK PRODUKTÓW' : 'BRAK PRODUKTÓW DLA TYCH FILTRÓW'}
          </p>
        </div>
      ) : (
        <div>
          <ShopProductsBulkBar
            count={selected.length}
            total={filtered.length}
            allSelected={allFilteredSelected}
            onToggleAll={toggleSelectAll}
            onEnable={() => bulkSetActive(true)}
            onDisable={() => bulkSetActive(false)}
            onDelete={() => setBulkDelete(true)}
            onClear={() => setSelected([])}
            onInvert={invertSelection}
            busy={bulkBusy}
            t={t}
          />
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
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    title="Zaznacz produkt"
                    style={{ accentColor: 'var(--brand)', width: '13px', height: '13px', cursor: 'pointer' }}
                  />
                </div>
                <div onClick={() => setEditing(p)} className="col-span-5 md:col-span-3 flex items-center gap-3 min-w-0" style={{ cursor: 'pointer' }} title="Edytuj produkt">
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
                  <Link to="/dashboard/stats?view=shop" title="Statystyki sprzedaży produktu" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${t.border}`, color: t.muted, borderRadius: 'var(--radius)', textDecoration: 'none' }}>
                    <BarChart2 size={12} />
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

      <ConfirmDeleteDialog
        open={bulkDelete}
        title={`Usuń ${selected.length} ${selected.length === 1 ? 'produkt' : selected.length < 5 ? 'produkty' : 'produktów'}`}
        message={`Czy na pewno usunąć zaznaczone produkty (${selected.length})? Tej operacji nie można cofnąć.`}
        onConfirm={bulkRemove}
        onCancel={() => setBulkDelete(false)}
        theme={theme}
      />
    </div>
  );
}