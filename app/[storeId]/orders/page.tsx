'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { UIModifierOption } from '@/types/menu'; 
import { History, X, Trash2, Undo2, Search, CheckCircle2, DollarSign , Clock, Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- 型別定義 ---
type OrderItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number | string; 
  price_at_time: number; 
  options: UIModifierOption[] | string | null; 
};

type Order = {
  id: string;
  store_id: string;
  pickup_number: number;
  table_no?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount: number | string;
  status: 'pending' | 'preparing' | 'served' | 'completed' | 'cancelled'; 
  dining_option: 'dine_in' | 'take_out';
  created_at: string;
  pickup_time?: string | null;
  order_items: OrderItem[];
};

// --- 解析選項工具 ---
function parseOptions(raw: any): UIModifierOption[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as UIModifierOption[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as UIModifierOption[];
      return []; 
    } catch {
      return [];
    }
  }
  return [];
}

// --- 時段與日期工具 ---
const SLOT_MINUTES = 15;

function pad2(n: number) { return String(n).padStart(2, '0'); }
function dateKeyLocal(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function formatHHmm(d: Date) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function floorToSlot(d: Date) {
  const ms = d.getTime();
  const slotMs = SLOT_MINUTES * 60 * 1000;
  return new Date(Math.floor(ms / slotMs) * slotMs);
}

// ★ 修改：改為動態函式，接收開始與結束時間參數
function buildServiceSlots(dateKey: string, start: {hh:number, mm:number}, end: {hh:number, mm:number}) {
  const startDate = new Date(`${dateKey}T${pad2(start.hh)}:${pad2(start.mm)}:00`);
  const endDate = new Date(`${dateKey}T${pad2(end.hh)}:${pad2(end.mm)}:00`);
  
  const slots: { key: string; label: string; start: Date }[] = [];
  
  // 防呆：如果跨日或設定錯誤，避免無窮迴圈
  if (startDate > endDate) return slots;

  for (let t = new Date(startDate); t <= endDate; t = new Date(t.getTime() + SLOT_MINUTES * 60 * 1000)) {
    const label = formatHHmm(t);
    const key = `${dateKey}T${label}:00`;
    slots.push({ key, label, start: new Date(t) });
  }
  return slots;
}

export default function KitchenPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 狀態
  const [selectedDate, setSelectedDate] = useState(() => dateKeyLocal(new Date()));
  const [search, setSearch] = useState('');
  const [showServedInMain, setShowServedInMain] = useState(true);

  // ★ 新增：營業時間狀態 (預設給個大概值，避免畫面一開始空的)
  const [storeHours, setStoreHours] = useState({ start: {hh:6, mm:0}, end: {hh:14, mm:0} });
  const [storeName, setStoreName] = useState('載入中...');

  // ★ 新增：讀取店家營業時間
  useEffect(() => {
    async function fetchStoreSettings() {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('name, opening_time, closing_time')
          .eq('id', storeId)
          .single();

        if (error) throw error;
        if (data) {
          setStoreName(data.name);
          if (data.opening_time && data.closing_time) {
            const [openH, openM] = data.opening_time.split(':').map(Number);
            const [closeH, closeM] = data.closing_time.split(':').map(Number);
            setStoreHours({
              start: { hh: openH, mm: openM },
              end: { hh: closeH, mm: closeM }
            });
          }
        }
      } catch (err) {
        console.error('讀取店家設定失敗', err);
      }
    }
    fetchStoreSettings();
  }, [storeId]);

  // 抓取「當日」訂單
  const fetchOrders = async () => {
    // 為了確保抓到「昨天預點今天」的單，我們放寬搜尋範圍
    const dateObj = new Date(selectedDate);
    const prevDate = new Date(dateObj); prevDate.setDate(prevDate.getDate() - 2); 
    const nextDateObj = new Date(dateObj); nextDateObj.setDate(nextDateObj.getDate() + 2);

    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('store_id', storeId)
      .gte('created_at', prevDate.toISOString()) 
      .lt('created_at', nextDateObj.toISOString())
      .in('status', ['pending', 'preparing', 'served', 'completed']);

    if (error) {
      console.error(error);
      return;
    }

    // ★ 前端精準過濾
    const targetYMD = selectedDate; 
    
    const filtered = (data || []).filter((o: Order) => {
      if (o.pickup_time) {
        // 外帶：檢查 pickup_time (例如 "2026-02-10 06:30")
        return o.pickup_time.startsWith(targetYMD);
      } else {
        // 內用：檢查 created_at
        const createdYMD = dateKeyLocal(new Date(o.created_at));
        return createdYMD === targetYMD;
      }
    });

    // 排序
    filtered.sort((a, b) => {
        const tA = a.pickup_time || '9999'; 
        const tB = b.pickup_time || '9999';
        return tA.localeCompare(tB) || (a.pickup_number - b.pickup_number);
    });

    setOrders(filtered);
  };

  // 抓歷史 (served/completed)
  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('store_id', storeId)
      .in('status', ['served', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) console.error('抓取歷史失敗:', error);
    else setHistoryOrders((data as any) || []);
  };

  // 標記完成 (Served)
  const markAsServed = async (orderId: string) => {
    setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? { ...o, status: 'served' } : o)));
    await supabase.from('orders').update({ status: 'served' }).eq('id', orderId);
    if (showHistory) fetchHistory();
  };

  // 復原 (Undo)
  const undoOrder = async (orderId: string) => {
    setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? { ...o, status: 'pending' } : o)));
    await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId);
    if (showHistory) fetchHistory();
  };

  // 刪除 (Delete)
  const deleteOrder = async (orderId: string) => {
    if (!confirm('確定要永久刪除這張訂單嗎？無法復原喔！')) return;
    await supabase.from('order_items').delete().eq('order_id', orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) alert('刪除失敗：' + error.message);
    else {
      setOrders((prev) => prev.filter((o) => String(o.id) !== String(orderId)));
      setHistoryOrders((prev) => prev.filter((o) => String(o.id) !== String(orderId)));
    }
  };

  // 即時監聽
  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        setTimeout(() => { fetchOrders(); if (showHistory) fetchHistory(); }, 500);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, showHistory, storeId]);

  // 統計數據
  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;
  const stats = useMemo(() => {
    const totalSales = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const count = orders.length;
    return { count, totalSales };
  }, [orders]);

  // 過濾與搜尋
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const pn = o.pickup_number != null ? String(o.pickup_number) : '';
      const name = (o.customer_name || '').toLowerCase();
      const phone = (o.customer_phone || '').toLowerCase();
      const table = (o.table_no || '').toLowerCase();
      return pn.includes(q) || name.includes(q) || phone.includes(q) || table.includes(q);
    });
  }, [orders, search]);

  // --- ★ 時段分組邏輯 (依賴 storeHours) ---
  const slots = useMemo(() => {
    // 傳入從資料庫讀取到的營業時間
    return buildServiceSlots(selectedDate, storeHours.start, storeHours.end);
  }, [selectedDate, storeHours]);
  
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const s of slots) map.set(s.key, []);
    const INSTANT_KEY = 'INSTANT';
    map.set(INSTANT_KEY, []);

    for (const o of filteredOrders) {
      if (!showServedInMain && (o.status === 'served' || o.status === 'completed')) continue;

      if (o.pickup_time) {
        // 處理格式相容性
        const dtStr = o.pickup_time.replace(' ', 'T') + ':00'; 
        const dt = new Date(dtStr); 
        
        if (isNaN(dt.getTime())) {
             map.get(INSTANT_KEY)!.push(o);
             continue;
        }
        
        const floored = floorToSlot(dt);
        const key = `${dateKeyLocal(floored)}T${formatHHmm(floored)}:00`;
        
        if (map.has(key)) {
          map.get(key)!.push(o);
        } else {
          // 如果早於營業時間或晚於營業時間，就放到即時單區
          map.get(INSTANT_KEY)!.push(o);
        }
      } else {
        map.get(INSTANT_KEY)!.push(o);
      }
    }
    return map;
  }, [filteredOrders, slots, showServedInMain]); 

  // 渲染選項 (共用函式)
  const renderItemOptions = (optionsRaw: any) => {
    const options = parseOptions(optionsRaw);
    if (options.length === 0) return null;

    return (
      <div className="mt-1 space-y-1 pl-2 border-l-2 border-gray-300">
        {options.map((opt, idx) => {
          const label = opt.label || '';
          const isUpgrade = label.includes('升級');
          const isDrink = label.includes('飲品') || label.match(/[冰熱糖]/);
          const isNote = label.startsWith('備') || label.startsWith('註');

          if (isUpgrade) {
            return <div key={idx} className="text-purple-600 text-xs font-bold bg-purple-50 px-1 rounded w-fit">{label}</div>;
          }
          if (isDrink) {
            return <div key={idx} className="text-blue-600 text-xs font-bold bg-blue-50 px-1 rounded w-fit">{label}</div>;
          }
          if (isNote) {
            return <div key={idx} className="text-red-500 text-xs italic">{label}</div>;
          }
          return <div key={idx} className="text-gray-500 text-xs">+ {label}</div>;
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6 text-white font-sans relative">
      
      {/* 頂部導覽列 */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-yellow-400 tracking-tight">{storeName} - KDS</h1>
            <span className="bg-red-600 px-3 py-1 rounded-full text-sm font-bold text-white shadow-lg animate-pulse">
              待處理: {pendingCount}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition border border-gray-700 text-sm font-bold"
            >
              <History size={18} />
              已完成紀錄
            </button>
          </div>
        </div>

        {/* 數據卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">今日訂單</div>
            <div className="mt-1 text-3xl font-black text-white">{stats.count}</div>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">營業額</div>
            <div className="mt-1 text-3xl font-black text-green-400">${stats.totalSales.toLocaleString()}</div>
          </div>
        </div>

        {/* 篩選工具列 */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center bg-gray-800 p-3 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-400 font-bold whitespace-nowrap">日期</div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white font-bold outline-none focus:border-yellow-500 transition"
            />
          </div>

          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Search size={18} />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋單號 / 姓名 / 電話..."
              className="w-full h-10 pl-10 pr-3 rounded-lg bg-gray-900 border border-gray-600 text-white font-bold placeholder:text-gray-600 outline-none focus:border-yellow-500 transition"
            />
          </div>

          <button
            onClick={() => setShowServedInMain((v) => !v)}
            className={`h-10 px-4 rounded-lg font-bold border transition text-sm whitespace-nowrap ${
              showServedInMain
                ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                : "bg-yellow-500 border-yellow-400 text-black hover:bg-yellow-400"
            }`}
          >
            {showServedInMain ? "隱藏已完成" : "顯示已完成"}
          </button>
        </div>
      </div>

      {/* 訂單顯示區 (分組) */}
      <div className="space-y-8">
        
        {/* 1. 即時單 (未指定時間/內用) */}
        {grouped.get('INSTANT') && grouped.get('INSTANT')!.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-700 pb-2">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span className="w-3 h-8 bg-red-500 rounded-full inline-block"></span>
                即時訂單 (內用/現場)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {grouped.get('INSTANT')!.map(order => renderOrderCard(order, deleteOrder, markAsServed, undoOrder))}
            </div>
          </div>
        )}

        {/* 2. 預約單 (按時段) */}
        {slots.map((slot) => {
          const list = grouped.get(slot.key) || [];
          // 如果該時段沒單，就不顯示標題，保持畫面乾淨
          if (list.length === 0) return null;

          return (
            <div key={slot.key} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-700 pb-2 mt-8">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span className="w-3 h-8 bg-blue-500 rounded-full inline-block"></span>
                  {slot.label} 取餐
                </h2>
                <span className="text-gray-500 text-sm font-bold bg-gray-800 px-2 py-1 rounded">
                  {list.length} 張單
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {list.map(order => renderOrderCard(order, deleteOrder, markAsServed, undoOrder))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 歷史紀錄 Drawer */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-gray-800 h-full p-6 overflow-y-auto shadow-2xl border-l border-gray-700 animate-slide-in-right">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <History /> 已出餐紀錄
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-700 rounded-full text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {historyOrders.map(order => renderOrderCard(order, deleteOrder, markAsServed, undoOrder, true))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 子元件：訂單卡片渲染 ---
function renderOrderCard(
  order: Order, 
  onDelete: (id: string) => void, 
  onServe: (id: string) => void, 
  onUndo: (id: string) => void,
  isHistoryView = false
) {
  const isDineIn = order.dining_option === 'dine_in';
  const isServed = order.status === 'served' || order.status === 'completed';
  
  // 視覺樣式
  const borderColor = isServed ? 'border-gray-600' : isDineIn ? 'border-orange-500' : 'border-green-500';
  const headerBg = isServed ? 'bg-gray-700' : isDineIn ? 'bg-orange-100' : 'bg-green-100';
  
  return (
    <div
      key={order.id}
      className={`
        bg-white rounded-xl overflow-hidden shadow-xl flex flex-col border-l-8 relative group transition-all duration-300
        ${borderColor}
        ${isServed ? 'opacity-70 grayscale-[0.5]' : 'opacity-100 hover:-translate-y-1 hover:shadow-2xl'}
      `}
    >
      {/* 刪除按鈕 */}
      <button
        onClick={() => onDelete(order.id)}
        className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full transition z-10 opacity-0 group-hover:opacity-100"
        title="刪除此單"
      >
        <Trash2 size={16} />
      </button>

      {/* Header */}
      <div className={`p-3 flex flex-col ${headerBg}`}>
        <div className="w-full pr-8">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isDineIn ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}`}>
              {isDineIn ? '內用' : '外帶'}
            </span>
            {order.pickup_time && (
              <span className="bg-yellow-300 text-black px-2 py-0.5 rounded text-[10px] font-bold flex items-center">
                <Clock size={10} className="mr-1"/> {order.pickup_time}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-black text-gray-900 truncate flex-1">
              {isDineIn ? `桌號 ${order.table_no}` : order.customer_name || '外帶顧客'}
            </div>
            <div className="text-3xl font-black text-gray-800/80 bg-white/40 px-2 rounded tracking-tighter">
              #{order.pickup_number}
            </div>
          </div>
          {!isDineIn && <div className="text-xs text-gray-500 font-mono font-bold mt-1">{order.customer_phone}</div>}
        </div>
      </div>

      {/* 內容清單 */}
      <div className="p-4 flex-1 bg-white">
        <ul className="space-y-4">
          {order.order_items.map((item, idx) => {
            // 計算包含選項的單價
            const opts = parseOptions(item.options);
            const optionsTotal = opts.reduce((sum, opt) => sum + (Number(opt.price) || 0), 0);
            
            // 暫時使用傳入的 price_at_time (如果有) 或 unit_price
            const unitP = Number(item.unit_price || item.price_at_time || 0);
            const finalUnitPrice = unitP + optionsTotal;
            const subtotal = finalUnitPrice * item.quantity;

            return (
              <li key={idx} className="flex justify-between items-start border-b border-dashed border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-base leading-tight text-gray-800">
                    {item.item_name}
                  </div>
                  {/* 選項細節 */}
                  {renderItemOptions(item.options)}
                </div>

                <div className="flex flex-col items-end">
                  <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-black text-lg min-w-[2rem] text-center">
                    x{item.quantity}
                  </span>
                  <div className="text-[10px] text-gray-400 mt-1 font-bold">
                    ${subtotal}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-gray-400 font-bold text-xs uppercase">Total</span>
          <span className="text-xl font-black text-gray-900">
            ${Number(order.total_amount).toLocaleString()}
          </span>
        </div>

        {!isServed ? (
          <button
            onClick={() => onServe(order.id)}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-lg text-base transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            出餐完成
          </button>
        ) : (
          <button
            onClick={() => onUndo(order.id)}
            className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-3 rounded-lg text-base transition active:scale-[0.98] flex items-center justify-center gap-2 border border-blue-200"
          >
            <Undo2 size={18} />
            復原訂單
          </button>
        )}
      </div>
    </div>
  );
}

// 輔助渲染選項 (放在最外層避免重複宣告)
function renderItemOptions(optionsRaw: any) {
  const options = parseOptions(optionsRaw);
  if (options.length === 0) return null;

  return (
    <div className="mt-1 space-y-1">
      {options.map((opt, idx) => {
        const label = opt.label || '';
        if (label.includes('升級')) return <div key={idx} className="text-purple-600 text-[11px] font-bold bg-purple-50 px-1.5 py-0.5 rounded w-fit">{label}</div>;
        if (label.includes('飲品') || label.match(/[冰熱糖]/)) return <div key={idx} className="text-blue-600 text-[11px] font-bold bg-blue-50 px-1.5 py-0.5 rounded w-fit">{label}</div>;
        if (label.startsWith('備')) return <div key={idx} className="text-red-500 text-[11px] font-bold">{label}</div>;
        return <div key={idx} className="text-gray-500 text-[11px]">+ {label}</div>;
      })}
    </div>
  );
}