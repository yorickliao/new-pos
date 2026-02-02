'use client';

import { MenuItem } from '@/types/menu';
import { Plus } from 'lucide-react';

interface Props {
  product: MenuItem;
  onClick?: () => void; // 新增這個 prop
}

export default function ProductCard({ product, onClick }: Props) {
  // 移除所有內部 addToCart 邏輯
  // 移除所有 useCart hook

  return (
    <div 
      // ★ 關鍵：點擊整個卡片時，呼叫 onClick (通知父層開彈窗)
      onClick={onClick} 
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between h-full transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-slate-200 cursor-pointer group"
    >
      <div>
        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1 group-hover:text-blue-700 transition-colors">
          {product.name}
        </h3>
        <p className="text-slate-400 text-xs line-clamp-2 min-h-[2.5em]">
          {product.description || ''}
        </p>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <span className="font-black text-xl text-slate-900">
          ${product.base_price}
        </span>
        <button 
          className="bg-slate-100 text-slate-600 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}