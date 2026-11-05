import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import ShopProductCard from '@/components/shop/ShopProductCard';
import ShopVariantFilters from '@/components/shop/ShopVariantFilters';
import ShopDocuments from '@/components/shop/ShopDocuments';
import { useCart } from '@/components/shop/CartProvider';
import { variantsOf } from '@/lib/shop';

export default function Shop() {
  const { count } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeCollection, setActiveCollection] = useState('');
  const [query, setQuery] = useState('');
  const [variantFilters, setVariantFilters] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.ShopCategory.filter({ is_active: true }, 'order', 100).catch(() => []),
      base44.entities.ShopCollection.filter({ is_active: true }, 'order', 100).catch(() => []),
      base44.entities.ShopProduct.filter({ is_active: true }, 'order', 300).catch(() => []),
    ]).then(([cats, cols, prods]) => {
      setCategories(cats);
      setCollections(cols);
      setProducts(prods);
    }).finally(() => setLoading(false));
  }, []);

  const collection = collections.find(c => c.id === activeCollection);
  let list = products;
  if (activeCollection) list = list.filter(p => (p.collection_ids || []).includes(activeCollection) || (collection?.product_ids || []).includes(p.id));
  if (activeCategory) list = list.filter(p => p.category_id === activeCategory);
  if (query.trim()) {
    const q = query.toLowerCase();
    list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.short_description || '').toLowerCase().includes(q));
  }

  // Opcje filtrów budowane z wariantów produktów w aktualnym widoku
  const facetMap = {};
  list.forEach(p => variantsOf(p).forEach(v => (v.options || []).forEach(o => {
    if (!o?.name || !o?.value) return;
    (facetMap[o.name] = facetMap[o.name] || new Set()).add(o.value);
  })));
  const facets = Object.entries(facetMap).map(([name, values]) => ({ name, values: [...values].sort((a, b) => a.localeCompare(b, 'pl')) }));

  Object.entries(variantFilters).forEach(([axis, values]) => {
    if (!values || values.length === 0) return;
    list = list.filter(p => variantsOf(p).some(v => (v.options || []).some(o => o.name === axis && values.includes(o.value))));
  });

  const toggleFilter = (axis, value) => {
    setVariantFilters(prev => {
      const current = prev[axis] || [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [axis]: next };
    });
  };

  const changeCategory = (id) => { setActiveCategory(id); setVariantFilters({}); };
  const changeCollection = (id) => { setActiveCollection(id); setActiveCategory(''); setVariantFilters({}); };

  return (
    <PageLayout>
      <div className="pt-32 md:pt-40 pb-24 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
            <div>
              <p className="text-micro" style={{ fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.22em', marginBottom: '10px' }}>SKLEP STUDIA</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 7vw, 5rem)', lineHeight: 0.92, letterSpacing: '0.02em' }}>
                RZECZY<br /><span style={{ color: 'var(--brand)', fontSize: '0.55em', letterSpacing: '0.08em' }}>Z NASZEGO ŚWIATA</span>
              </h1>
            </div>
            <Link to="/sklep/koszyk" className="btn-ghost-parchment flex items-center gap-2 self-start md:self-auto" style={{ padding: '11px 20px' }}>
              <ShoppingBag size={13} /> KOSZYK {count > 0 ? `(${count})` : ''}
            </Link>
          </div>

          {/* Kolekcje */}
          {collections.length > 0 && (
            <div className="py-6" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
              <p className="text-micro" style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.18em', marginBottom: '12px' }}>KOLEKCJE</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {collections.map(c => {
                  const active = activeCollection === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => changeCollection(active ? '' : c.id)}
                      className="relative shrink-0 overflow-hidden transition-all duration-500"
                      style={{ width: '190px', height: '110px', border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`, borderRadius: 'var(--radius)' }}
                    >
                      {c.image_url && <img src={c.image_url} alt="" className="absolute inset-0 w-full h-full object-cover media-darken-soft" />}
                      <span className="absolute inset-0" style={{ background: active ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.45)' }} />
                      <span className="absolute bottom-3 left-3 right-3 text-left" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em', color: '#F5F0EB', lineHeight: 1.1 }}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtry */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-6" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => changeCategory('')}
                className="text-micro"
                style={{
                  fontSize: '10px', letterSpacing: '0.14em', padding: '8px 16px',
                  border: `0.5px solid ${!activeCategory ? 'var(--brand)' : 'hsl(var(--border))'}`,
                  color: !activeCategory ? 'var(--brand)' : 'hsl(var(--muted-foreground))',
                  background: !activeCategory ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                  borderRadius: 'var(--radius)',
                }}
              >WSZYSTKO</button>
              {categories.map(cat => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => changeCategory(active ? '' : cat.id)}
                    className="text-micro"
                    style={{
                      fontSize: '10px', letterSpacing: '0.14em', padding: '8px 16px',
                      border: `0.5px solid ${active ? 'var(--brand)' : 'hsl(var(--border))'}`,
                      color: active ? 'var(--brand)' : 'hsl(var(--muted-foreground))',
                      background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                      borderRadius: 'var(--radius)',
                    }}
                  >{(cat.name || '').toUpperCase()}</button>
                );
              })}
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Szukaj produktu..."
              style={{ background: 'transparent', border: 'none', borderBottom: '0.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))', padding: '8px 0', fontSize: '13px', outline: 'none', minWidth: '200px', fontFamily: 'var(--font-body)' }}
              onFocus={e => { e.target.style.borderBottomColor = 'var(--brand)'; }}
              onBlur={e => { e.target.style.borderBottomColor = 'hsl(var(--border))'; }}
            />
          </div>

          {/* Filtry wariantów */}
          <ShopVariantFilters
            facets={facets}
            selected={variantFilters}
            onToggle={toggleFilter}
            onClear={() => setVariantFilters({})}
          />

          {collection && (
            <div className="flex items-center gap-3 pt-6">
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'hsl(var(--foreground))' }}>{collection.name}</p>
              <button onClick={() => changeCollection('')} className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={11} /> WSZYSTKIE
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>
          ) : list.length === 0 ? (
            <div className="py-24 text-center mt-10" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
              <ShoppingBag size={26} style={{ color: 'hsl(var(--muted-foreground))', margin: '0 auto 14px' }} />
              <p className="text-micro" style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.14em' }}>
                {products.length === 0 ? 'SKLEP JEST W PRZYGOTOWANIU' : 'BRAK PRODUKTÓW W TYM WIDOKU'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-10">
              {list.map(p => <ShopProductCard key={p.id} product={p} />)}
            </div>
          )}

          <ShopDocuments />
        </div>
      </div>
    </PageLayout>
  );
}