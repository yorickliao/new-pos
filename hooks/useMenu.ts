import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { MenuItem, UIModifierGroup } from '@/types/menu';

export function useMenu(storeId: string) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    async function fetchMenu() {
      try {
        setLoading(true);
        // 抓取產品、分類、以及客製化選項
        const { data, error: dbError } = await supabase
          .from('products')
          .select(`
            *,
            categories (name, sort_order),
            store_products!inner(store_id, is_available),
            product_modifiers (
              modifier_groups (
                id, name, allow_multiple, is_required,
                modifier_items (id, name, price_extra)
              )
            )
          `)
          .eq('store_products.store_id', storeId) // 只抓這家店
          .eq('store_products.is_available', true) // 只抓上架的
          .order('category_id', { ascending: true })
          .order('id', { ascending: true });

        if (dbError) throw dbError;

        // 資料轉換 (DB結構 -> UI結構)
        const transformed: MenuItem[] = (data as any[]).map((item) => {
          const uiModifiers: UIModifierGroup[] = item.product_modifiers?.map((pm: any) => {
            const group = pm.modifier_groups;
            if (!group) return null;
            return {
              id: group.id,
              title: group.name,
              type: group.allow_multiple ? 'toggle' : 'choice',
              required: group.is_required,
              options: group.modifier_items.map((opt: any) => ({
                id: opt.id,
                label: opt.name,
                price: opt.price_extra
              })).sort((a: any, b: any) => a.price - b.price)
            };
          }).filter(Boolean) || [];

          return {
            id: item.id,
            name: item.name,
            description: item.description,
            base_price: item.base_price,
            image_url: item.image_url,
            category_id: item.category_id,
            categoryName: item.categories?.name || '其他',
            modifiers: uiModifiers
          };
        });

        setMenu(transformed);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [storeId]);

  return { menu, loading, error };
}