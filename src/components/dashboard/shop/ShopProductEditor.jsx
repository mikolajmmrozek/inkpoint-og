import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/pages/dashboard/Dashboard';
import { Plus, X, Trash2, Upload, RefreshCw, Check } from 'lucide-react';
import { shopTheme, mono, display, inputStyle, labelStyle } from './shopTheme';
import { slugify, money } from '@/lib/shop';

const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/webp'];

export default function ShopProductEditor({ product, categories, collections, onClose, onSaved }) {
  const { theme } = useTheme();
  const t = shopTheme(theme);

  const [form, setForm] = useState(() => ({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    category_id: '',
    collection_ids: [],
    price: 0,
    compare_at_price: 0,
    pricing_mode: 'fixed',
    slider_min: 100,
    slider_max: 2000,
    slider_step: 10,
    shipping_form_ids: [],
    unlimited_stock: false,
    stock: 0,
    restock: false,
    shipping_cost: 0,
    shipping_info: '',
    shipping_options: [],
    image_url: '',
    images: [],
    variant_axes: [],
    variants: [],
    is_active: true,
    is_featured: false,
    order: 999,
    ...(product || {}),
  }));
  const [axesText, setAxesText] = useState(() => (product?.variant_axes || []).map(a => ({ name: a.name, values: (a.values || []).join(', ') })));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [forms, setForms] = useState([]);

  useEffect(() => {
    base44.entities.ShippingForm.filter({ is_active: true }, 'order', 100)
      .then(setForms)
      .catch(() => setForms([]));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buildVariants = (axes, existing, basePrice, explicit = []) => {
    const clean = explicit.filter(a => (a.name || '').trim() && (a.values || '').split(',').map(v => v.trim()).filter(Boolean).length);
    if (clean.length === 0) return [];
    const parsed = clean.map(a => ({ name: a.name.trim(), values: a.values.split(',').map(v => v.trim()).filter(Boolean) }));
    let combos = [[]];
    for (const axis of parsed) {
      combos = combos.flatMap(c => axis.values.map(v => [...c, { name: axis.name, value: v }]));
    }
    return combos.map(opts => {
      const key = opts.map(o => `${o.name}:${o.value}`).join('|');
      const prev = (existing || []).find(v => v.key === key);
      return prev ? { ...prev, key, options: opts } : { key, options: opts, price: Number(basePrice) || 0, stock: 0, sku: '', is_active: true };
    });
  };

  const updateAxes = (next) => {
    setAxesText(next);
    const clean = next.filter(a => (a.name || '').trim() && (a.values || '').trim());
    const axes = clean.map(a => ({ name: a.name.trim(), values: a.values.split(',').map(v => v.trim()).filter(Boolean) }));
    setForm(f => ({ ...f, variant_axes: axes, variants: buildVariants(axes, f.variants, f.price, next) }));
  };

  const addAxis = () => updateAxes([...axesText, { name: '', values: '' }]);
  const removeAxis = (i) => updateAxes(axesText.filter((_, idx) => idx !== i));
  const setAxis = (i, field, value) => updateAxes(axesText.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const updateVariant = (key, field, value) => {
    setForm(f => ({ ...f, variants: (f.variants || []).map(v => v.key === key ? { ...v, [field]: field === 'price' || field === 'stock' ? Number(value) || 0 : value } : v) }));
  };

  const upload = async (file, target) => {
    if (!file) return;
    if (!ALLOWED_IMG.includes(file.type)) { alert('Dodaj plik JPG, PNG lub WEBP.'); return; }
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      if (target === 'main') set('image_url', res.file_url);
      else set('images', [...(form.images || []), res.file_url]);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { alert('Podaj nazwę produktu.'); return; }
    setSaving(true);
    try {
      const category = categories.find(c => c.id === form.category_id);
      const payload = {
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        short_description: form.short_description || '',
        description: form.description || '',
        category_id: form.category_id || '',
        category_name: category?.name || '',
        collection_ids: form.collection_ids || [],
        price: Number(form.price) || 0,
        compare_at_price: Number(form.compare_at_price) || 0,
        pricing_mode: form.pricing_mode === 'slider' ? 'slider' : 'fixed',
        slider_min: Math.max(0, Number(form.slider_min) || 0),
        slider_max: Math.max(0, Number(form.slider_max) || 0),
        slider_step: Math.max(0, Number(form.slider_step) || 0),
        unlimited_stock: !!form.unlimited_stock,
        stock: Math.max(0, Number(form.stock) || 0),
        restock: !!form.restock,
        shipping_form_ids: form.shipping_form_ids || [],
        shipping_cost: Math.max(0, Number(form.shipping_cost) || 0),
        shipping_info: form.shipping_info || '',
        shipping_options: [],
        image_url: form.image_url || '',
        images: form.images || [],
        variant_axes: form.variant_axes || [],
        variants: form.variants || [],
        is_voucher: form.pricing_mode === 'slider',
        is_active: form.is_active !== false,
        is_featured: !!form.is_featured,
        order: Number(form.order) || 999,
      };
      if (product?.id) await base44.entities.ShopProduct.update(product.id, payload);
      else await base44.entities.ShopProduct.create(payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '5px' }}>{product?.id ? 'EDYCJA' : 'NOWY PRODUKT'}</p>
            <h3 style={{ ...display, fontSize: '1.7rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1 }}>{form.name || 'Produkt'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        <div className="p-6 space-y-7">
          {/* Podstawy */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label style={labelStyle(t)}>Nazwa *</label><input value={form.name} onChange={e => { set('name', e.target.value); if (!product?.id) set('slug', slugify(e.target.value)); }} style={inputStyle(t)} /></div>
              <div><label style={labelStyle(t)}>Adres URL (slug)</label><input value={form.slug} onChange={e => set('slug', slugify(e.target.value))} style={inputStyle(t)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle(t)}>Kategoria</label>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={{ ...inputStyle(t), colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                  <option value="">Brak</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label style={labelStyle(t)}>{form.pricing_mode === 'slider' ? 'Cena od (PLN) *' : 'Cena (PLN) *'}</label><input type="number" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle(t)} /></div>
                <div><label style={labelStyle(t)}>Cena przekreślona</label><input type="number" value={form.compare_at_price} onChange={e => set('compare_at_price', e.target.value)} style={inputStyle(t)} /></div>
              </div>
            </div>
            <div><label style={labelStyle(t)}>Krótki opis</label><input value={form.short_description} onChange={e => set('short_description', e.target.value)} style={inputStyle(t)} /></div>
            <div><label style={labelStyle(t)}>Opis</label><textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inputStyle(t), resize: 'vertical', border: `0.5px solid ${t.border}`, padding: '10px', borderRadius: 'var(--radius)' }} /></div>
          </div>

          {/* Sposób ceny */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '12px' }}>SPOSÓB CENY</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[{ id: 'fixed', label: 'Stała cena + warianty' }, { id: 'slider', label: 'Suwak — klient wybiera kwotę' }].map(m => {
                const active = (form.pricing_mode || 'fixed') === m.id;
                return (
                  <button key={m.id} onClick={() => set('pricing_mode', m.id)}
                    style={{ border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {form.pricing_mode === 'slider' ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div><label style={labelStyle(t)}>Kwota od (PLN)</label><input type="number" value={form.slider_min ?? 100} onChange={e => set('slider_min', e.target.value)} style={inputStyle(t)} /></div>
                  <div><label style={labelStyle(t)}>Kwota do (PLN)</label><input type="number" value={form.slider_max ?? 2000} onChange={e => set('slider_max', e.target.value)} style={inputStyle(t)} /></div>
                  <div><label style={labelStyle(t)}>Skok (PLN)</label><input type="number" value={form.slider_step ?? 10} onChange={e => set('slider_step', e.target.value)} style={inputStyle(t)} /></div>
                </div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '6px', lineHeight: 1.7 }}>
                  Klient wybiera kwotę suwakiem w tym zakresie — warianty nie są używane, stan magazynowy nie obowiązuje.
                </p>
              </>
            ) : (
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
                Cena stała; rozmiary, kolory i ich stany ustawiasz jako warianty poniżej.
              </p>
            )}
          </div>

          {/* Kolekcje */}
          {collections.length > 0 && (
            <div>
              <p style={{ ...labelStyle(t) }}>KOLEKCJE</p>
              <div className="flex flex-wrap gap-2">
                {collections.map(c => {
                  const active = (form.collection_ids || []).includes(c.id);
                  return (
                    <button key={c.id} onClick={() => set('collection_ids', active ? (form.collection_ids || []).filter(id => id !== c.id) : [...(form.collection_ids || []), c.id])}
                      style={{ border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.08em', padding: '6px 11px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Zdjęcia */}
          <div>
            <p style={{ ...labelStyle(t) }}>ZDJĘCIA</p>
            <div className="flex items-center gap-4 flex-wrap">
              {form.image_url && <img src={form.image_url} alt="" style={{ width: '80px', height: '100px', objectFit: 'cover', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} />}
              <label style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 14px', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={12} /> {uploading ? 'WYSYŁANIE...' : 'ZDJĘCIE GŁÓWNE'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0], 'main')} />
              </label>
              <label style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 14px', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={12} /> DODAJ DO GALERII
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0], 'gallery')} />
              </label>
            </div>
            {(form.images || []).length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {form.images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" style={{ width: '56px', height: '70px', objectFit: 'cover', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} />
                    <button onClick={() => set('images', form.images.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#0A0A0A', border: `0.5px solid ${t.border}`, color: t.muted, borderRadius: '9999px', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warianty — tylko przy stałej cenie */}
          {form.pricing_mode !== 'slider' && (
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>WARIANTY</p>
              <button onClick={addAxis} className="flex items-center gap-1.5" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Plus size={11} /> DODAJ WARIANT (OŚ)
              </button>
            </div>

            {axesText.length === 0 && (
              <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
                Brak wariantów — produkt sprzedawany jest jako jedna pozycja. Dodaj oś (np. Rozmiar, Kolor), aby utworzyć kombinacje.
              </p>
            )}

            <div className="space-y-3">
              {axesText.map((axis, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1"><label style={labelStyle(t)}>Nazwa osi</label><input value={axis.name} onChange={e => setAxis(i, 'name', e.target.value)} placeholder="np. Rozmiar" style={inputStyle(t)} /></div>
                  <div className="flex-[2]"><label style={labelStyle(t)}>Wartości (oddziel przecinkiem)</label><input value={axis.values} onChange={e => setAxis(i, 'values', e.target.value)} placeholder="S, M, L, XL" style={inputStyle(t)} /></div>
                  <button onClick={() => removeAxis(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '10px 4px' }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            {(form.variants || []).length > 0 && (
              <div className="mt-5" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                <div className="grid grid-cols-12 gap-2 px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                  <span className="col-span-5" style={labelStyle(t)}>Kombinacja</span>
                  <span className="col-span-2" style={labelStyle(t)}>Cena</span>
                  <span className="col-span-2" style={labelStyle(t)}>Stan</span>
                  <span className="col-span-3" style={labelStyle(t)}>SKU</span>
                </div>
                {(form.variants || []).map(v => (
                  <div key={v.key} className="grid grid-cols-12 gap-2 px-3 py-2 items-center" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                    <span className="col-span-5" style={{ fontSize: '11px', color: t.text }}>{(v.options || []).map(o => o.value).join(' / ') || v.key}</span>
                    <input className="col-span-2" type="number" value={v.price ?? ''} onChange={e => updateVariant(v.key, 'price', e.target.value)} style={{ ...inputStyle(t), fontSize: '12px' }} />
                    <input className="col-span-2" type="number" value={v.stock ?? 0} onChange={e => updateVariant(v.key, 'stock', e.target.value)} style={{ ...inputStyle(t), fontSize: '12px' }} />
                    <input className="col-span-3" value={v.sku || ''} onChange={e => updateVariant(v.key, 'sku', e.target.value)} style={{ ...inputStyle(t), fontSize: '12px' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Stan i dostawa */}
          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '14px' }}>STAN I DOSTAWA</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle(t)}>Stan magazynowy (szt.)</label>
                <input type="number" value={form.stock ?? 0} onChange={e => set('stock', e.target.value)} disabled={!!form.unlimited_stock} style={{ ...inputStyle(t), opacity: form.unlimited_stock ? 0.45 : 1 }} />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', lineHeight: 1.6 }}>
                  {form.unlimited_stock
                    ? 'Produkt nielimitowany — stan nie jest pilnowany.'
                    : (form.variants || []).length > 0
                      ? 'Produkt ma warianty — stan ustawiasz przy każdym wariancie.'
                      : 'Liczba dostępnych sztuk. 0 = wyprzedane.'}
                </p>
              </div>
              <div>
                <label style={labelStyle(t)}>Koszt dostawy (PLN)</label>
                <input type="number" value={form.shipping_cost ?? 0} onChange={e => set('shipping_cost', e.target.value)} style={inputStyle(t)} />
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '4px', lineHeight: 1.6 }}>
                  0 = darmowa dostawa tego produktu. W koszyku liczy się najwyższy koszt.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label style={labelStyle(t)}>Wysyłka i pakowanie</label>
              <input value={form.shipping_info || ''} onChange={e => set('shipping_info', e.target.value)} placeholder="np. Wysyłka 24–48 h / odbiór w studio" style={inputStyle(t)} />
            </div>
            <div className="mt-6">
              <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px' }}>FORMY WYSYŁKI</p>
              {forms.length === 0 ? (
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', lineHeight: 1.7 }}>
                  Brak form wysyłki. Dodaj je w zakładce Sklep → Wysyłka, aby przypisywać je do produktów.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {forms.map(f => {
                      const active = (form.shipping_form_ids || []).includes(f.id);
                      return (
                        <button key={f.id} onClick={() => set('shipping_form_ids', active ? (form.shipping_form_ids || []).filter(id => id !== f.id) : [...(form.shipping_form_ids || []), f.id])}
                          style={{ border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', ...mono, fontSize: '9px', letterSpacing: '0.08em', padding: '6px 11px', cursor: 'pointer', borderRadius: 'var(--radius)' }}>
                          {f.name} · {Number(f.cost) > 0 ? money(f.cost) : 'gratis'}{f.international ? ' + zagranica' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '8px', lineHeight: 1.7 }}>
                    Wybrane formy klient zobaczy jako przyciski dostawy. Listę i ceny form (także zagraniczne) edytujesz w zakładce Wysyłka.
                  </p>
                </>
              )}
            </div>
            <button onClick={() => set('unlimited_stock', !form.unlimited_stock)} style={{ marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.unlimited_stock ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.unlimited_stock ? '#16a34a' : t.border}`, background: form.unlimited_stock ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.unlimited_stock && <Check size={9} color="#fff" />}</span>
              Bez stanu magazynowego (nielimitowany)
            </button>
            <button onClick={() => set('restock', !form.restock)} style={{ marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.restock ? '#f59e0b' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.restock ? '#f59e0b' : t.border}`, background: form.restock ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.restock && <Check size={9} color="#fff" />}</span>
              Wkrótce dostępne (zamiast „Wyprzedane")
            </button>
          </div>

          {/* Ustawienia */}
          <div className="flex flex-wrap gap-5 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
            <button onClick={() => set('is_active', !form.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active !== false ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active !== false ? '#16a34a' : t.border}`, background: form.is_active !== false ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_active !== false && <Check size={9} color="#fff" />}</span>
              Widoczny w sklepie
            </button>
            <button onClick={() => set('is_featured', !form.is_featured)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_featured ? '#16a34a' : t.muted, display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_featured ? '#16a34a' : t.border}`, background: form.is_featured ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_featured && <Check size={9} color="#fff" />}</span>
              Polecany
            </button>
            <div style={{ width: '90px' }}><label style={labelStyle(t)}>Kolejność</label><input type="number" value={form.order} onChange={e => set('order', e.target.value)} style={inputStyle(t)} /></div>
          </div>
        </div>

        <div className="flex gap-3 p-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={save} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ padding: '11px' }}>
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} {saving ? 'ZAPISYWANIE...' : 'ZAPISZ PRODUKT'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </div>
    </div>
  );
}