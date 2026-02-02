'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat, 
  Utensils, 
  ShoppingBag,
  User,
  Phone,
  Coffee,
  Star
} from 'lucide-react';

// --- 型別定義 ---
type OrderItem = {
  id: number;
  name: string;
  item_name?: string;
  quantity: number;
  unit_price: number; 
  options: any;
};

type Order = {
  id: number;
  store_id: string;
  pickup_number: number;
  table_no?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount: number | string;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  dining_option: 'dine_in' | 'take_out';
  created_at: string;
  pickup_time?: string | null;
  order_items: OrderItem[];
};

export default function OrdersPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [stats, setStats] = useState({ revenue: 0, count: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 讀取數據
  const fetchData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('store_id', storeId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const orderList = (data || []) as Order[];
      
      const validOrders = orderList.filter(o => o.status !== 'cancelled');
      const revenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      
      setStats({ revenue, count: validOrders.length });
      
      // 排序邏輯
      const sortedList = orderList.sort((a, b) => {
        const statusPriority: any = { pending: 1, preparing: 1, completed: 3, cancelled: 4 };
        return statusPriority[a.status] - statusPriority[b.status];
      });

      setOrders(sortedList);

    } catch (err) {
      console.error('讀取訂單失敗', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. 初始讀取 & 即時監聽
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    const interval = setInterval(fetchData, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [storeId]);

  // 3. 更新訂單狀態
  const updateStatus = async (orderId: number, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchData(); 
  };

  const formatPrice = (p: number | string) => Number(p).toLocaleString();
  const formatTime = (t: string) => new Date(t).toLocaleTimeString('zh-TW', { hour: '2-digit', minute:'2-digit' });

  // 狀態標籤
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200 shadow-sm animate-pulse">新訂單</span>;
      case 'preparing': return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">製作中</span>;
      case 'completed': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200">已完成</span>;
      case 'cancelled': return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">已取消</span>;
      default: return null;
    }
  };

  // 渲染選項
  const renderOptions = (options: any[]) => {
    if (!options || options.length === 0) return null;

    const upgrades: any[] = [];
    const drinks: any[] = [];
    const modifiers: any[] = [];
    const notes: any[] = [];

    options.forEach(opt => {
      const label = opt.label || opt.name || '';
      const id = String(opt.id || '');

      if (id.startsWith('up_') || id.startsWith('upgrade_') || label.includes('升級')) {
        upgrades.push(opt);
      } else if (id === 'set_drink' || id === 'spec' || label.includes('飲品') || label.includes('冰') || label.includes('熱') || label.includes('糖')) {
        drinks.push(opt);
      } else if (id === 'note' || label.startsWith('備')) {
        notes.push(opt);
      } else {
        modifiers.push(opt);
      }
    });

    return (
      <div className="mt-1.5 space-y-1.5">
        {modifiers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {modifiers.map((opt, i) => (
              <span key={i} className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {opt.label}
              </span>
            ))}
          </div>
        )}
        {drinks.length > 0 && (
          <div className="flex flex-col gap-1">
            {drinks.map((opt, i) => (
              <div key={i} className="flex items-start gap-1.5 text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">
                <Coffee size={14} className="mt-0.5 shrink-0"/>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}
        {upgrades.length > 0 && (
          <div className="flex flex-col gap-1">
            {upgrades.map((opt, i) => (
              <div key={i} className="flex items-start gap-1.5 text-sm font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 shadow-sm w-fit">
                <Star size={14} className="mt-0.5 shrink-0 fill-purple-700"/>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}
        {notes.length > 0 && (
          <div className="text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 break-words w-fit">
            {notes.map(n => n.label).join('，')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Dashboard */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between h-28 relative overflow-hidden">
           <div className="absolute right-[-10px] top-[-10px] opacity-10"><DollarSign size={100}/></div>
           <div className="flex items-center gap-2 text-slate-300 text-sm font-bold"><DollarSign size={16}/> 今日營業額</div>
           <div className="text-3xl font-black tracking-tight z-10">${formatPrice(stats.revenue)}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-28 relative">
           <div className="flex items-center gap-2 text-slate-500 text-sm font-bold"><Receipt size={16}/> 今日單量</div>
           <div className="text-3xl font-black text-slate-800">{stats.count} <span className="text-lg text-slate-400 font-bold">單</span></div>
        </div>
      </div>

      {/* 訂單列表 */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
          <ChefHat size={24} className="text-blue-600"/> 廚房接單
        </h2>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">載入訂單中...</div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
             <p className="text-slate-400 font-bold">目前還沒有訂單</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => {
              const isDineIn = order.dining_option === 'dine_in';
              const cardStyle = isDineIn ? 'border-orange-200 bg-white ring-orange-50' : 'border-blue-200 bg-white ring-blue-50';
              const headerStyle = isDineIn ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
              const isInactive = order.status === 'completed' || order.status === 'cancelled';

              return (
                <div 
                  key={order.id} 
                  className={`
                    rounded-2xl border-2 shadow-sm flex flex-col justify-between overflow-hidden transition-all duration-200
                    ${isInactive ? 'border-slate-200 opacity-60 grayscale' : cardStyle}
                    ${order.status === 'pending' ? 'ring-4 shadow-md scale-[1.01]' : ''}
                  `}
                >
                  {/* Header */}
                  <div className={`p-3 flex justify-between items-start ${!isInactive ? headerStyle : 'bg-slate-100 text-slate-500'}`}>
                     <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black tracking-tighter leading-none">
                            {isDineIn ? `${order.table_no || '?'}` : `#${order.pickup_number}`}
                          </span>
                          <span className="text-xs font-bold opacity-90 border border-white/30 px-1.5 py-0.5 rounded">
                            {isDineIn ? '內用' : '外帶'}
                          </span>
                        </div>
                        {!isDineIn && order.pickup_time && (
                          <div className="mt-1 text-[11px] font-bold opacity-90 flex items-center gap-1"><Clock size={10}/> {order.pickup_time} 取餐</div>
                        )}
                        {isDineIn && <div className="mt-1 text-[11px] font-bold opacity-80">{formatTime(order.created_at)} 下單</div>}
                     </div>
                     <div className="flex flex-col items-end">
                        <div className="text-3xl font-black leading-none mb-1">${formatPrice(order.total_amount)}</div>
                        {getStatusBadge(order.status)}
                     </div>
                  </div>

                  {!isDineIn && (order.customer_name || order.customer_phone) && (
                    <div className="px-3 py-1.5 bg-blue-50/50 border-b border-blue-100 text-xs font-bold text-slate-600 flex justify-between items-center">
                      <div className="flex gap-3">
                        {order.customer_name && <span className="flex items-center gap-1"><User size={12}/> {order.customer_name}</span>}
                        {order.customer_phone && <span className="flex items-center gap-1"><Phone size={12}/> {order.customer_phone}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatTime(order.created_at)} 下單</span>
                    </div>
                  )}

                  {/* 訂單內容 */}
                  <div className="p-4 flex-1 space-y-4 bg-white">
                    {order.order_items?.map((item, idx) => {
                      let optionsArray = [];
                      try {
                        if (typeof item.options === 'string') optionsArray = JSON.parse(item.options);
                        else if (Array.isArray(item.options)) optionsArray = item.options;
                      } catch (e) { optionsArray = []; }

                      // ★ 核心修正：計算真實價格 (含選項)
                      const optionsTotal = optionsArray.reduce((acc: number, opt: any) => acc + (Number(opt.price) || 0), 0);
                      const realUnitPrice = (Number(item.unit_price) || 0) + optionsTotal;
                      const itemSubtotal = realUnitPrice * item.quantity;

                      return (
                        <div key={idx} className="border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div className="font-black text-slate-800 text-lg leading-tight flex-1">
                              {item.item_name || item.name}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-2">
                              {/* 顯示加總後的小計 */}
                              <div className="text-sm font-bold text-slate-400">
                                ${formatPrice(itemSubtotal)}
                              </div>
                              <div className="font-black text-xl text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap min-w-[32px] text-center">
                                x{item.quantity}
                              </div>
                            </div>
                          </div>
                          
                          {renderOptions(optionsArray)}
                        </div>
                      );
                    })}
                  </div>

                  {/* 底部按鈕區 */}
                  {!isInactive && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                      <button 
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-blue-200 shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20}/> 完成
                      </button>
                      
                      <button 
                        onClick={() => {
                          if(confirm('確定要取消此訂單嗎？')) updateStatus(order.id, 'cancelled');
                        }}
                        className="px-4 rounded-xl font-bold text-slate-400 bg-white border-2 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition active:scale-95"
                      >
                        <XCircle size={24}/>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}