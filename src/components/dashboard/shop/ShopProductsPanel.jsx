import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, Pencil, Trash2, Package, Power } from 'lucide-react';
import { money, totalStock, isSoldOut } from '@/lib/shop';
import { shopTheme, mono, display } from './shopTheme';
import ShopProductEditor from './ShopProductEditor';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';

export default function ShopProductsPanel() {
  const { theme } = useTheme();
  const t = shopTheme(theme);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    Promise.all([
      base44.entities.ShopProduct.list('order', 300).catch(() => []),
      base44.entities.ShopCategory.list('order', 100).catch(() => []),
      base44.entities.ShopCollection.list('order', 100).catch(() => []),
    ]).then(([p, c, col]) => { setProducts(p); setCategories(c); setCollections(col); }).finally(() => setLoading(false));
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
          {filtered.map((p, i) => (
            <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center" style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none', opacity: p.is_active === false ? 0.55 : 1 }}>
              <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
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
              <div className="col-span-1 md:col-span-2">
                {isSoldOut(p) ? (
                  <span style={{ ...mono, fontSize: '8px', color: '#ef4444', letterSpacing: '0.08em' }}>WYPRZEDANE</span>
                ) : (
                  <span style={{ ...mono, fontSize: '9px', color: t.muted }}>{(p.variants || []).length > 0 ? `${totalStock(p)} szt.` : '—'}</span>
                )}
              </div>
              <div className="col-span-2 md:col-span-3 flex items-center gap-1.5 justify-end">
                <button onClick={() => toggleActive(p)} title="Włącz/wyłącz" style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_active === false ? t.muted : '#16a34a', padding: '4px' }}><Power size={13} /></button>
                <button onClick={() => setEditing(p)} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '4px' }}><Pencil size={13} /></button>
                <button onClick={() => setDeleteFor(p)} title="Usuń" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '4px' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
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