'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  ShoppingBag, 
  Store, 
  DollarSign, 
  Calendar,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    storeCount: 0,
  });
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // 1. 抓取所有分店
        const { data: storesData } = await supabase
          .from('stores')
          .select('*')
          .order('name');

        setStores(storesData || []);

        // 2. 抓取「今天」的所有訂單 (跨分店)
        // 取得今日 00:00 的時間戳記
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const { data: ordersData } = await supabase
          .from('orders')
          .select('total_amount, store_id')
          .gte('created_at', todayStr) // 只抓今天的
          .neq('status', 'cancelled'); // 排除已取消的

        // 3. 計算數據
        const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const totalOrders = ordersData?.length || 0;
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        setStats({
          totalRevenue,
          totalOrders,
          avgOrderValue,
          storeCount: storesData?.length || 0,
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(price);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400 font-bold animate-pulse">載入總部數據中...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800">總部儀表板</h2>
        <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">
          <Calendar size={16} /> 
          今日概況：{new Date().toLocaleDateString('zh-TW')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: 總營收 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={80} className="text-blue-600" />
          </div>
          <div className="text-slate-500 font-bold text-sm">今日品牌總營收</div>
          <div className="text-4xl font-black text-slate-900">{formatPrice(stats.totalRevenue)}</div>
          <div className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-50 w-fit px-2 py-1 rounded-full">
            <TrendingUp size={12} /> 即時更新
          </div>
        </div>

        {/* Card 2: 訂單數 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="text-slate-500 font-bold text-sm">今日總訂單數</div>
          <div className="text-4xl font-black text-slate-900">{stats.totalOrders} <span className="text-lg text-slate-400">單</span></div>
          <div className="text-xs text-slate-400 font-bold">全品牌累計</div>
        </div>

        {/* Card 3: 客單價 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="text-slate-500 font-bold text-sm">平均客單價 (AOV)</div>
          <div className="text-4xl font-black text-slate-900">${stats.avgOrderValue}</div>
          <div className="text-xs text-slate-400 font-bold">每筆訂單平均收益</div>
        </div>

        {/* Card 4: 分店數 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="text-slate-500 font-bold text-sm">營運中分店</div>
          <div className="text-4xl font-black text-slate-900">{stats.storeCount} <span className="text-lg text-slate-400">間</span></div>
          <div className="text-blue-600 text-xs font-bold cursor-pointer hover:underline">管理分店 →</div>
        </div>
      </div>

      {/* Stores List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Store size={20} className="text-blue-600" /> 分店營運列表
          </h3>
          <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
            查看全部
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">分店名稱</th>
                <th className="px-6 py-4">地址</th>
                <th className="px-6 py-4">營業時間</th>
                <th className="px-6 py-4 text-right">今日營收 (預估)</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold">
                    目前沒有分店資料
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{store.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{store.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                      {store.address}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">
                        {store.opening_time?.slice(0,5)} - {store.closing_time?.slice(0,5)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                      {/* 這裡未來可以做成該分店的即時加總，現在先顯示 '- ' */}
                      -
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-blue-600 transition-colors">
                        <ArrowRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}