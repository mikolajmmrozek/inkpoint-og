import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext) || { items: [], count: 0, add: async () => {}, setQty: async () => {}, remove: async () => {}, clear: async () => {}, loading: false };

export default function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [cartId, setCartId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.email) { setItems([]); setCartId(null); return; }
    setLoading(true);
    try {
      const carts = await base44.entities.ShopCart.filter({ user_email: user.email });
      if (carts.length > 0) {
        setCartId(carts[0].id);
        setItems(Array.isArray(carts[0].items) ? carts[0].items : []);
      } else {
        setCartId(null);
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (nextItems) => {
    if (!user?.email) return;
    if (cartId) {
      await base44.entities.ShopCart.update(cartId, { items: nextItems });
    } else {
      const created = await base44.entities.ShopCart.create({ user_email: user.email, items: nextItems });
      setCartId(created.id);
    }
    setItems(nextItems);
  }, [cartId, user?.email]);

  const add = useCallback(async (product, variant, quantity = 1) => {
    if (!isAuthenticated) return false;
    const key = variant?.key || '';
    const existing = items.find(i => i.product_id === product.id && (i.variant_key || '') === key);
    const next = existing
      ? items.map(i => i === existing
        ? { ...i, quantity: Math.min(99, Number(i.quantity) + quantity) }
        : i)
      : [...items, {
        product_id: product.id,
        product_name: product.name,
        slug: product.slug || '',
        image_url: product.image_url || '',
        variant_key: key,
        variant_label: variant ? (variant.options || []).map(o => `${o.name}: ${o.value}`).join(' · ') || 'Standard' : 'Standard',
        unit_price: Number(variant?.price) || Number(product.price) || 0,
        quantity,
      }];
    await persist(next);
    return true;
  }, [items, persist, isAuthenticated]);

  const setQty = useCallback(async (product_id, variant_key, quantity) => {
    const q = Math.max(0, Math.min(99, quantity));
    const next = q === 0
      ? items.filter(i => !(i.product_id === product_id && (i.variant_key || '') === (variant_key || '')))
      : items.map(i => (i.product_id === product_id && (i.variant_key || '') === (variant_key || '')) ? { ...i, quantity: q } : i);
    await persist(next);
  }, [items, persist]);

  const remove = useCallback(async (product_id, variant_key) => {
    await persist(items.filter(i => !(i.product_id === product_id && (i.variant_key || '') === (variant_key || ''))));
  }, [items, persist]);

  const clear = useCallback(async () => { await persist([]); }, [persist]);

  const count = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <CartContext.Provider value={{ items, count, loading, add, setQty, remove, clear, reload: load }}>
      {children}
    </CartContext.Provider>
  );
}