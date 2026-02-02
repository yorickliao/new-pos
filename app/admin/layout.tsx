'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Store, 
  UtensilsCrossed, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  ChefHat
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: '總部儀表板', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: '分店管理', href: '/admin/stores', icon: Store }, // 之後可做
    { name: '全域菜單', href: '/admin/menu', icon: UtensilsCrossed }, // 之後可做
    { name: '人員權限', href: '/admin/staff', icon: Users }, // 之後可做
    { name: '系統設定', href: '/admin/settings', icon: Settings }, // 之後可做
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2 font-black text-lg">
          <ChefHat size={24} /> 弘爺總部
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 transform 
        md:translate-x-0 md:static md:flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <ChefHat size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide">弘爺漢堡</h1>
            <p className="text-xs text-slate-400 font-bold">總部管理系統</p>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
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
      <main className="flex-1 pt-16 md:pt-0 overflow-y-auto h-screen">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
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