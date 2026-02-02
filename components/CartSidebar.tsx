"use client";

import { useCart } from "@/hooks/useCart";
import { X, Minus, Plus, ShoppingBag, ChevronDown, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean; 
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: Props) {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(price);

  return (
    <>
      {/* 遮罩 - 只有打開時顯示 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed z-50 bg-white shadow-2xl transition-transform duration-300 ease-out
          /* 手機版樣式: 底部抽屜 */
          inset-x-0 bottom-0 rounded-t-[2rem] h-[90dvh] transform
          ${isOpen ? "translate-y-0" : "translate-y-full"}

          /* 電腦版樣式: 右側側邊欄 */
          md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:w-96 md:h-screen md:rounded-none md:border-l md:border-slate-200
          md:${isOpen ? "translate-x-0" : "translate-x-0"} /* 電腦版其實一直都在，或是由父層控制顯示 */
          ${!isOpen && "md:translate-x-full"} /* 如果電腦版也要能收合 */
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2rem] md:rounded-none">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">購物車</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length} 項
            </span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={clearCart} 
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
              title="清空購物車"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
              <ChevronDown size={24} />
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 h-[calc(90dvh-180px)] md:h-[calc(100vh-180px)]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-60">
              <div className="bg-slate-100 p-8 rounded-full"><ShoppingBag size={48} /></div>
              <p className="font-bold text-lg">還沒點餐喔</p>
              <button onClick={onClose} className="md:hidden text-blue-600 font-bold">去點餐</button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartId} className="group flex flex-col bg-white border border-slate-100 p-4 rounded-2xl shadow-sm relative">
                {/* 刪除按鈕 */}
                <button 
                  onClick={() => removeItem(item.cartId)}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-2 -mr-2 -mt-2"
                >
                  <X size={20} />
                </button>
                
                <div className="flex justify-between items-start pr-8 mb-3">
                  <div>
                    <div className="font-bold text-slate-800 text-lg leading-tight">{item.name}</div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.selectedOptions.map(opt => (
                          <span key={opt.id} className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {opt.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                   <div className="font-black text-lg text-slate-900">{formatPrice(item.subtotal)}</div>
                   
                   {/* 數量控制器 (加大按鈕範圍) */}
                   <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                      <button onClick={() => updateQuantity(item.cartId, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-slate-700 active:scale-90 transition"><Minus size={16}/></button>
                      <span className="w-6 text-center font-mono font-bold text-slate-800">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-slate-700 active:scale-90 transition"><Plus size={16}/></button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-8 md:pb-6 rounded-t-2xl">
          <div className="flex justify-between items-end mb-4 px-2">
            <span className="text-slate-500 font-bold">總金額</span>
            <span className="text-3xl font-black text-slate-900">{formatPrice(total)}</span>
          </div>
          <button 
            className="w-full py-4 rounded-xl text-xl font-bold shadow-xl shadow-blue-200 transition-all transform active:scale-[0.98] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-slate-300"
            disabled={items.length === 0}
            onClick={() => alert('訂單已送出！')}
          >
            確認送出
          </button>
        </div>
      </div>
    </>
  );
}