'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, UtensilsCrossed, Settings, DollarSign, Receipt } from 'lucide-react';
import MenuManager from '@/components/store/MenuManager';
import SettingsManager from '@/components/store/SettingsManager';

export default function StoreDashboard() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'settings'>('overview');

  // 概況數據狀態
  const [stats, setStats] = useState({ revenue: 0, orders: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // 讀取今日營收 (只有在 Overview Tab 時才讀取)
  useEffect(() => {
    if (activeTab === 'overview') {
      const fetchStats = async () => {
        setLoadingStats(true);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('store_id', storeId)
          .gte('created_at', today.toISOString())
          .neq('status', 'cancelled');
        
        const revenue = data?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
        const orders = data?.length || 0;
        setStats({ revenue, orders });
        setLoadingStats(false);
      };
      fetchStats();
    }
  }, [activeTab, storeId]);

  const tabs = [
    { id: 'overview', label: '營運概況', icon: LayoutDashboard },
    { id: 'menu', label: '菜單管理', icon: UtensilsCrossed },
    { id: 'settings', label: '營業設定', icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      {/* 1. 頂部頁籤切換 */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200
              ${activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
            `}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. 內容區域 */}
      <div className="animate-fade-in">
        
        {/* TAB 1: 營運概況 */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
              <div className="flex items-center gap-3 opacity-80 mb-2">
                <DollarSign size={20} />
                <span className="font-bold">今日營業額</span>
              </div>
              <div className="text-5xl font-black">
                {loadingStats ? '...' : `$${stats.revenue.toLocaleString()}`}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 text-slate-400 font-bold mb-2">
                <Receipt size={20} />
                <span>今日訂單數</span>
              </div>
              <div className="text-5xl font-black text-slate-800">
                {loadingStats ? '...' : stats.orders} <span className="text-xl text-slate-400">單</span>
              </div>
            </div>
            
            <div className="md:col-span-2 bg-slate-50 rounded-3xl p-8 text-center border border-slate-200 border-dashed">
              <p className="text-slate-400 font-bold">更多圖表與分析功能開發中...</p>
            </div>
          </div>
        )}

        {/* TAB 2: 菜單管理 */}
        {activeTab === 'menu' && <MenuManager storeId={storeId} />}

        {/* TAB 3: 營業設定 */}
        {activeTab === 'settings' && <SettingsManager storeId={storeId} />}

      </div>
    </div>
  );
}