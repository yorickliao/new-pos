"use client";

import { useParams } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { useCart } from '@/hooks/useCart';
import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import ModifierModal from '@/components/ModifierModal';
import { MenuItem, CartItem } from '@/types/menu';
import { 
  ChefHat, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  ChevronDown, 
  User, 
  Phone,
  Trash2,
  MapPin,
  Clock,
  Utensils,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  Receipt,
  Store // 新增店家圖示
} from 'lucide-react';

interface SuccessOrderData {
  pickupNumber: number;
  pickupTime: string | null;
  diningOption: 'dine_in' | 'take_out';
  total: number;
  items: CartItem[];
  isNextDay: boolean;
}

export default function POSPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const { menu, loading: menuLoading, error: menuError } = useMenu(storeId);
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  
  // --- UI 狀態 ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isScrolled, setIsScrolled] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<SuccessOrderData | null>(null);

  // --- 店家資訊 & 訂單狀態 ---
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  
  const [diningOption, setDiningOption] = useState<'dine_in' | 'take_out'>('take_out');
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetDateLabel, setTargetDateLabel] = useState('今日');

  // 1. 讀取店家資訊
  useEffect(() => {
    async function fetchStore() {
      try {
        const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).single();
        if (error) throw error;
        setStoreInfo(data);
        document.title = `${data.name} - 線上點餐`; 
      } catch (err) {
        console.error('無法讀取店家資訊', err);
      } finally {
        setLoadingStore(false);
      }
    }
    if (storeId) fetchStore();
  }, [storeId]);

  // 2. 監聽捲動
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ★ 新增：計算「現在是否營業中」(isOpenNow)
  const isOpenNow = useMemo(() => {
    if (!storeInfo?.opening_time || !storeInfo?.closing_time) return false;
    
    const now = new Date();
    const [openH, openM] = storeInfo.opening_time.split(':').map(Number);
    const [closeH, closeM] = storeInfo.closing_time.split(':').map(Number);
    
    // 設定今天的開店/打烊時間
    const openDate = new Date(); openDate.setHours(openH, openM, 0, 0);
    const closeDate = new Date(); closeDate.setHours(closeH, closeM, 0, 0);
    
    // 判斷現在是否在區間內
    return now >= openDate && now <= closeDate;
  }, [storeInfo]);

  // 如果非營業時間，強制切換回外帶 (避免客人原本選內用，結果過了一分鐘打烊了)
  useEffect(() => {
    if (!isOpenNow && diningOption === 'dine_in') {
      setDiningOption('take_out');
    }
  }, [isOpenNow, diningOption]);

  // 3. 計算取餐時間 (包含隔日預點邏輯)
  const timeSlots = useMemo(() => {
    if (!storeInfo?.opening_time || !storeInfo?.closing_time) return [];
    
    const slots: string[] = [];
    const now = new Date();
    
    const [openH, openM] = storeInfo.opening_time.split(':').map(Number);
    const [closeH, closeM] = storeInfo.closing_time.split(':').map(Number);
    
    let openDate = new Date(); openDate.setHours(openH, openM, 0, 0);
    let closeDate = new Date(); closeDate.setHours(closeH, closeM, 0, 0);
    
    const allowNextDay = storeInfo.settings?.preorder_next_day_after_close || false;
    let isNextDay = false;

    if (now > closeDate && allowNextDay) {
      isNextDay = true;
      openDate.setDate(openDate.getDate() + 1);
      closeDate.setDate(closeDate.getDate() + 1);
      setTargetDateLabel('明日'); 
    } else {
      setTargetDateLabel('今日');
    }

    if (now > closeDate && !isNextDay) {
       return []; 
    }

    let startSlot;
    if (isNextDay) {
      startSlot = openDate;
    } else {
      const bufferTime = new Date(now.getTime() + 15 * 60000); 
      const remainder = bufferTime.getMinutes() % 15;
      if (remainder !== 0) bufferTime.setMinutes(bufferTime.getMinutes() + (15 - remainder));
      bufferTime.setSeconds(0);
      startSlot = bufferTime > openDate ? bufferTime : openDate;
    }

    let currentSlot = startSlot;
    while (currentSlot <= closeDate) {
      slots.push(currentSlot.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      currentSlot = new Date(currentSlot.getTime() + 15 * 60000);
    }
    
    return slots;
  }, [storeInfo]);

  const categories = useMemo(() => {
    const cats = new Set(menu.map(m => m.categoryName || '其他'));
    return Array.from(cats);
  }, [menu]);

  const displayedItems = useMemo(() => {
    if (selectedCategory === 'All') return menu;
    return menu.filter(item => (item.categoryName || '其他') === selectedCategory);
  }, [menu, selectedCategory]);

  const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
  const formatPrice = (price: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(price);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 5. 送出訂單
  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    // ★ 擋住內用：如果非營業時間，禁止送出內用單
    if (diningOption === 'dine_in' && !isOpenNow) {
      alert("抱歉，目前非營業時間，無法使用內用點餐。\n請選擇外帶預約。");
      return;
    }

    if (diningOption === 'take_out') {
      if (!customerName || !customerPhone) { alert("外帶請輸入姓名與電話"); return; }
      if (!pickupTime) { alert("請選擇取餐時間"); return; }
    }
    if (diningOption === 'dine_in' && !tableNumber) {
      if(!confirm("未輸入桌號，確定要送出嗎？")) return;
    }

    setIsSubmitting(true);
    try {
      let fullPickupTime = null;

      if (diningOption === 'take_out' && pickupTime) {
        const dateRef = new Date();
        if (targetDateLabel === '明日') {
          dateRef.setDate(dateRef.getDate() + 1);
        }
        
        const year = dateRef.getFullYear();
        const month = String(dateRef.getMonth() + 1).padStart(2, '0');
        const day = String(dateRef.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        fullPickupTime = `${dateStr} ${pickupTime}`;
      }

      const { data: orderResult, error: orderError } = await supabase.rpc('submit_order', {
        p_store_id: storeId,
        p_total_amount: total,
        p_dining_option: diningOption,
        p_pickup_time: fullPickupTime, 
        p_table_no: diningOption === 'dine_in' ? tableNumber : null,
        p_customer_name: diningOption === 'take_out' ? customerName : null,
        p_customer_phone: diningOption === 'take_out' ? customerPhone : null
      });

      if (orderError) throw orderError;

      const newOrderId = orderResult.id;
      const newPickupNum = orderResult.pickup_number;

      const orderItemsPayload = items.map(item => ({
        order_id: newOrderId,
        product_id: item.id,
        name: item.name,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.base_price,
        price_at_time: item.base_price,
        subtotal: item.subtotal,
        options: item.selectedOptions || []
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
      if (itemsError) throw itemsError;

      setOrderSuccess({
        pickupNumber: newPickupNum,
        pickupTime: fullPickupTime || pickupTime, 
        diningOption: diningOption,
        total: total,
        items: [...items],
        isNextDay: targetDateLabel === '明日'
      });
      
      clearCart();
      setIsMobileCartOpen(false);
      setCustomerName(""); setCustomerPhone(""); setTableNumber(""); setPickupTime("");

    } catch (err: any) {
      console.error('結帳錯誤:', err);
      alert(`結帳失敗: ${err.message || '請稍後再試'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setOrderSuccess(null);
  };

  if (menuLoading || loadingStore) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-bold bg-slate-50"><Loader2 className="animate-spin mr-2"/> 載入中...</div>;
  if (menuError) return <div className="p-10 text-center text-red-500 font-bold">發生錯誤: {menuError}</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      {/* 左側：菜單區 */}
      <div className="w-full md:w-2/3 flex flex-col h-full relative z-10">
        <div className={`absolute top-0 left-0 right-0 z-10 border-b border-slate-200 pt-4 pb-2 px-6 shadow-sm transition-all duration-200 ${isScrolled ? 'bg-white/95 backdrop-blur-md' : 'bg-slate-100/90 backdrop-blur-md'}`}>
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200 mt-0.5"><ChefHat size={24} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{storeInfo?.name || '...'}</h1>
              {storeInfo?.opening_time && (
                <div className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                  <Clock size={10}/> 
                  {storeInfo.opening_time.slice(0,5)} - {storeInfo.closing_time.slice(0,5)}
                  {!isOpenNow && <span className="ml-2 text-red-500 bg-red-50 px-1 rounded border border-red-100">已打烊</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <button onClick={() => handleCategoryClick('All')} className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition ${selectedCategory === 'All' ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent"}`}>全部餐點</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => handleCategoryClick(cat)} className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition ${selectedCategory === cat ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent"}`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-44 bg-slate-100 pb-32 scroll-smooth">
          <div className="space-y-10 animate-fade-in">
            {categories.map((cat) => {
              if (selectedCategory !== 'All' && selectedCategory !== cat) return null;
              const itemsInCat = menu.filter(item => (item.categoryName || '其他') === cat);
              if (itemsInCat.length === 0) return null;
              return (
                <div key={cat} ref={(el) => { categoryRefs.current[cat] = el; }}>
                  <div className="flex items-center mb-4 pl-1"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></div><h2 className="text-xl font-black text-slate-800 tracking-wide">{cat}</h2></div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {itemsInCat.map(item => (
                      <ProductCard 
                        key={item.id} 
                        product={item} 
                        onClick={() => setSelectedProduct(item)} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-24 md:hidden"></div>
        </div>
      </div>

      {/* 手機版底部 & 右側購物車 */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-30">
        <button onClick={() => setIsMobileCartOpen(true)} className="w-full bg-slate-900 text-white py-4 px-6 rounded-full shadow-2xl flex justify-between items-center transition active:scale-95 border border-slate-700">
          <div className="flex items-center gap-3"><div className="bg-white text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{totalQty}</div><span className="font-bold text-lg">查看購物車</span></div>
          <span className="font-bold text-xl">{formatPrice(total)}</span>
        </button>
      </div>

      <div className={`fixed inset-0 z-50 bg-white transition-transform duration-300 transform md:relative md:transform-none md:w-1/3 md:flex md:flex-col md:h-full md:z-auto md:shadow-2xl md:border-l md:border-slate-200 md:inset-auto md:translate-y-0 ${isMobileCartOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="md:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">訂單明細</h2>
          <button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-white rounded-full shadow text-slate-600"><ChevronDown /></button>
        </div>
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="p-6 pb-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex mb-6 relative">
               {/* ★ 修改按鈕邏輯：如果沒營業(isOpenNow=false)，內用按鈕變成灰色且不能按 */}
               <button 
                  onClick={() => isOpenNow && setDiningOption('dine_in')} 
                  className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 z-10 
                    ${!isOpenNow 
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-transparent' 
                        : diningOption === 'dine_in' 
                            ? 'bg-white text-blue-600 shadow-md scale-100' 
                            : 'text-slate-400 hover:text-slate-600'
                    }`}
               >
                 <Utensils size={16} /> 內用 {!isOpenNow && "(休息中)"}
               </button>
               
               <button onClick={() => setDiningOption('take_out')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 z-10 ${diningOption === 'take_out' ? 'bg-white text-green-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}><ShoppingBag size={16} /> 外帶</button>
            </div>
            <div className="space-y-4 animate-fade-in">
              {diningOption === 'dine_in' ? (
                 <div className="relative group">
                    <div className="absolute left-3 top-3.5 text-slate-400"><MapPin size={18} /></div>
                    <input type="text" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="請輸入桌號 (選填)" className="w-full bg-slate-50 rounded-2xl py-3 pl-10 pr-3 font-bold text-slate-800 outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition placeholder:text-slate-400" />
                 </div>
              ) : (
                 <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative group">
                      <div className="absolute left-3 top-3.5 text-slate-400"><User size={18} /></div>
                      <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="您的姓名" className="w-full bg-slate-50 rounded-2xl py-3 pl-10 pr-3 font-bold text-slate-800 outline-none focus:bg-white border-2 border-transparent focus:border-green-500 transition placeholder:text-slate-400" />
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-3.5 text-slate-400"><Phone size={18} /></div>
                      <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="您的電話" className="w-full bg-slate-50 rounded-2xl py-3 pl-10 pr-3 font-bold text-slate-800 outline-none focus:bg-white border-2 border-transparent focus:border-green-500 transition placeholder:text-slate-400" />
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-3 top-3.5 text-slate-400"><Clock size={18} /></div>
                    <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-slate-50 rounded-2xl py-3 pl-10 pr-3 font-bold text-slate-800 outline-none focus:bg-white border-2 border-transparent focus:border-green-500 transition appearance-none cursor-pointer">
                      <option value="">請選擇取餐時間 ({targetDateLabel})</option>
                      {timeSlots.length > 0 ? (
                        timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {targetDateLabel === '明日' ? `明日 ${time}` : time}
                          </option>
                        ))
                      ) : (
                        <option disabled>
                          {storeInfo?.settings?.preorder_next_day_after_close 
                             ? "今日已打烊 (系統未開放明日預點)" 
                             : "今日已打烊"}
                        </option>
                      )}
                    </select>
                    <div className="absolute right-3 top-4 text-slate-400 pointer-events-none"><ChevronDown size={16} /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white pb-32 md:pb-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50"><div className="bg-slate-50 p-6 rounded-full"><ShoppingCart size={48} /></div><p className="font-bold">尚未點餐</p><button onClick={() => setIsMobileCartOpen(false)} className="md:hidden text-blue-500 font-bold hover:underline">← 返回菜單</button></div>
            ) : (
              items.map((item) => (
                <div key={item.cartId} className="group flex flex-col bg-white border border-slate-100 p-3 rounded-2xl hover:border-slate-300 transition-colors shadow-sm relative">
                  <button onClick={() => removeItem(item.cartId)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><X size={16} /></button>
                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{item.name}</div>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (<div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-1">{item.selectedOptions.map(opt => (<span key={opt.id} className="bg-slate-50 px-1.5 py-0.5 rounded text-xs">{opt.label}</span>))}</div>)}
                    </div>
                    <div className="text-right"><div className="font-bold text-slate-900">{formatPrice(item.subtotal)}</div><div className="text-xs text-slate-400">單價 ${item.base_price}</div></div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-100 flex justify-between items-center">
                    <div className="text-xs text-slate-400 font-bold">數量</div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.cartId, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600 active:scale-95"><Minus size={14} /></button>
                      <span className="font-black text-slate-800 w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600 active:scale-95"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {items.length > 0 && <div className="flex justify-center mt-4"><button onClick={clearCart} className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-xs font-bold py-2 px-4 rounded-full hover:bg-red-50 transition"><Trash2 size={14} /> 清空購物車</button></div>}
          </div>
          <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30 flex-shrink-0 pb-20 md:pb-6">
            <div className="flex justify-between items-end mb-6"><span className="text-slate-500 font-bold text-sm">訂單總金額</span><div className="flex items-baseline gap-1"><span className="text-4xl font-black text-slate-900">{formatPrice(total)}</span></div></div>
            <button onClick={handleCheckout} disabled={items.length === 0 || isSubmitting} className={`w-full py-4 rounded-2xl text-xl font-bold shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 ${items.length === 0 || isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : diningOption === 'take_out' ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-green-200 shadow-green-100" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-200 shadow-blue-100"}`}>
              {isSubmitting ? (<><Loader2 className="animate-spin" /> 處理中...</>) : (diningOption === 'take_out' ? '確認外帶下單' : '確認內用點餐')}
            </button>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ModifierModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      {/* 訂單成功彈窗 */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-scale-in">
            {/* 裝飾背景 */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-green-400 to-emerald-600"></div>
            
            <div className="relative pt-10 px-6 pb-6 flex flex-col items-center">
              {/* 打勾圖示 */}
              <div className="bg-white p-3 rounded-full shadow-lg mb-4">
                <CheckCircle2 size={64} className="text-green-500 fill-green-50" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 mb-1">下單成功！</h2>
              <p className="text-slate-500 font-bold text-sm mb-6">我們會盡快為您準備餐點</p>

              {/* 取餐號碼卡片 */}
              <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-xl">取餐號碼</div>
                <div className="text-7xl font-black text-slate-800 tracking-tighter">#{orderSuccess.pickupNumber}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
                  {orderSuccess.diningOption === 'take_out' ? (
                    <>
                      <Clock size={14} className="text-green-600"/> 
                      {orderSuccess.pickupTime} 取餐
                    </>
                  ) : (
                    <><Utensils size={14} className="text-blue-600"/> 內用</>
                  )}
                </div>
              </div>

              {/* 訂單明細 (可捲動) */}
              <div className="w-full mb-6 max-h-40 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                  <Receipt size={14}/> 訂單明細
                </div>
                {orderSuccess.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <div className="flex-1 text-slate-700 font-bold">
                      {item.name} <span className="text-slate-400 font-normal">x{item.quantity}</span>
                      {item.selectedOptions?.length > 0 && (
                        <div className="text-xs text-slate-400 font-normal truncate max-w-[200px]">
                          {item.selectedOptions.map(o => o.label).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-900 font-bold">${item.subtotal}</div>
                  </div>
                ))}
              </div>

              {/* 總金額 */}
              <div className="w-full flex justify-between items-center border-t border-slate-100 pt-4 mb-6">
                <span className="font-bold text-slate-500">總金額</span>
                <span className="text-3xl font-black text-slate-900">{formatPrice(orderSuccess.total)}</span>
              </div>

              {/* 關閉按鈕 */}
              <button 
                onClick={handleCloseSuccessModal}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}