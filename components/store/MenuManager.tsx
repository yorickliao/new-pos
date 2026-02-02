'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw } from 'lucide-react';

export default function MenuManager({ storeId }: { storeId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'soldout'>('all');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, base_price, category_id,
          categories (name),
          store_products!inner (is_available)
        `)
        .eq('store_products.store_id', storeId)
        .order('category_id')
        .order('id');

      if (error) throw error;

      const formatted = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.base_price,
        category: p.categories?.name || '未分類',
        isAvailable: p.store_products[0]?.is_available,
      }));

      setProducts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    setUpdatingId(productId);
    try {
      const { error } = await supabase
        .from('store_products')
        .update({ is_available: !currentStatus })
        .eq('store_id', storeId)
        .eq('product_id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, isAvailable: !currentStatus } : p
      ));
    } catch (err) {
      alert('更新失敗');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.includes(searchTerm);
      if (filter === 'available') return matchesSearch && p.isAvailable;
      if (filter === 'soldout') return matchesSearch && !p.isAvailable;
      return matchesSearch;
    });
  }, [products, searchTerm, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 搜尋與篩選列 */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
          <input 
            type="text" 
            placeholder="搜尋商品..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${filter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>全部</button>
          <button onClick={() => setFilter('available')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${filter === 'available' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>供應中</button>
          <button onClick={() => setFilter('soldout')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${filter === 'soldout' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>已售完</button>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold animate-pulse">載入中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${product.isAvailable ? 'bg-white border-slate-100' : 'bg-slate-50 border-red-100 opacity-75'}`}>
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-400 mb-1">{product.category}</div>
                <div className="text-lg font-black text-slate-800">{product.name}</div>
                <div className="text-slate-500 font-bold mt-1">${product.price}</div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className={`text-sm font-bold ${product.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                  {product.isAvailable ? '● 供應中' : '✕ 已售完'}
                </span>
                <button
                  onClick={() => toggleAvailability(product.id, product.isAvailable)}
                  disabled={updatingId === product.id}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition border ${product.isAvailable ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100 border-green-100'}`}
                >
                  {updatingId === product.id ? <RefreshCw size={12} className="animate-spin" /> : product.isAvailable ? '設為售完' : '恢復供應'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}