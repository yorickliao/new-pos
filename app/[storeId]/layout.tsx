'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, // 改用這個 icon 代表中控台
  Store, 
  ClipboardList, 
  LogOut, 
  Menu,
  ChefHat,
  Loader2,
  // UtensilsCrossed, // 移除：因為整合進 Dashboard 了
  // Settings         // 移除：因為整合進 Dashboard 了
} from 'lucide-react';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const storeId = params.storeId as string;
  const pathname = usePathname();
  const router = useRouter();
  
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('載入中...');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkUser() {
      // 1. 公開頁面 (POS / 廚房) 不檢查
      if (pathname?.endsWith('/pos') || pathname?.endsWith('/orders')) {
        setLoading(false);
        return; 
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, assigned_store_id')
          .eq('id', user.id)
          .single();

        if (!profile || (profile.role !== 'brand_owner' && profile.assigned_store_id !== storeId)) {
          alert('無權限存取此分店資料');
          router.push('/login');
          return;
        }

        setRole(profile.role);

        const { data: store } = await supabase
          .from('stores')
          .select('name')
          .eq('id', storeId)
          .single();
        
        if (store) setStoreName(store.name);

      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkUser();
  }, [storeId, router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- ★ 簡化後的側邊欄選單 ---
  const navItems = [
    // 1. 營運中控 (Dashboard) - 包含 概況/菜單/設定
    // 只有店長或總部看得到，這是管理後台的核心
    ...(['store_manager', 'brand_owner'].includes(role) ? [
      { name: '營運中控', href: `/${storeId}/dashboard`, icon: LayoutDashboard },
    ] : []),

    // 2. 廚房接單 (KDS) - 所有員工都看得到
    { name: '廚房接單', href: `/${storeId}/orders`, icon: ClipboardList },

    // 3. POS 點餐機 - 所有員工都看得到
    { name: 'POS 點餐機', href: `/${storeId}/pos`, icon: Store },
  ];

  // 1. 載入中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-bold gap-2">
        <Loader2 className="animate-spin" /> 
        系統載入中...
      </div>
    );
  }

  // 2. 全螢幕模式 (POS / Orders 不顯示側邊欄)
  // 注意：這裡我把 orders 也加入了全螢幕模式，因為廚房螢幕通常不需要側邊欄干擾
  if (pathname?.endsWith('/pos') || pathname?.endsWith('/orders')) {
    return <>{children}</>;
  }

  // 3. 一般後台 (Dashboard)
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-2 font-bold">
          <ChefHat size={20} /> {storeName}
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          <Menu />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 transform 
        md:translate-x-0 md:static md:flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-900/50">
              <ChefHat size={20} />
            </div>
            <h1 className="text-lg font-black tracking-wide text-white">POS System</h1>
          </div>
          <p className="text-sm font-bold text-white pl-1">{storeName}</p>
          <div className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-blue-400 border border-slate-700">
            {role === 'store_manager' ? '店長權限' : role === 'brand_owner' ? '總部巡店' : '員工權限'}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            // 判斷是否 active：如果是根路徑，要精確比對
            const isActive = item.href === `/${storeId}` 
              ? pathname === item.href 
              : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-950/30 hover:text-red-300 w-full transition-colors"
          >
            <LogOut size={20} />
            登出系統
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-0 overflow-y-auto h-screen bg-slate-100 scroll-smooth">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}