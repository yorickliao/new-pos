'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChefHat, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  // 變數名稱改為 usernameInput 比較直觀，雖然實際上它可能包含 email
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // ★ 1. 自動補全 Email 後綴邏輯
      let finalEmail = usernameInput.trim();
      
      // 如果使用者沒有輸入 @，就自動加上 @hongya.com
      if (!finalEmail.includes('@')) {
        finalEmail = `${finalEmail}@hongya.com`;
      }

      console.log('嘗試登入:', finalEmail); // 方便你除錯看結果

      // 2. Supabase Auth 驗證 (使用處理過的 Email)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (authError) throw new Error('帳號或密碼錯誤');
      if (!authData.user) throw new Error('登入失敗，請重試');

      // 3. 查詢使用者的角色 (Profile)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, assigned_store_id, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('找不到使用者權限資料，請聯繫管理員');
      }

      console.log('登入成功，角色:', profile.role);

      // 4. 三層權限導向邏輯
      switch (profile.role) {
        case 'brand_owner': 
          // 👑 Admin -> 去總部後台
          router.push('/admin/dashboard'); 
          break;

        case 'store_manager':
          // 🏠 店長 -> 改為直接去「訂單管理頁」
          if (!profile.assigned_store_id) throw new Error('此店長帳號未綁定分店');
          router.push(`/${profile.assigned_store_id}/orders`); // ★ 修改這裡
          break;

        case 'cashier':
          // ⚡ 店員 -> 去 POS 機
          if (!profile.assigned_store_id) throw new Error('此店員帳號未綁定分店');
          router.push(`/${profile.assigned_store_id}/pos`);
          break;

        default:
          throw new Error('未知的角色權限');
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '登入發生錯誤');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-sm md:max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          {/* 背景裝飾 */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50"></div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-6 text-slate-900 transform rotate-3 hover:rotate-0 transition-all duration-300">
              <ChefHat size={40} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">POS 系統</h1>
            <p className="text-slate-400 text-sm font-bold mt-2 tracking-wide uppercase">員工專用入口</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 md:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {errorMsg && (
              <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl border border-red-100 flex items-start gap-2 animate-pulse">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-wider">帳號 (Username)</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  {/* 圖示改用 User 比較符合帳號的感覺 */}
                  <User size={20} />
                </div>
                <input
                  type="text" 
                  // ★ 改為 text，移除 email 格式限制
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="請輸入帳號 (如: admin)"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm focus:shadow-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-wider">密碼 (Password)</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm focus:shadow-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  驗證中...
                </>
              ) : (
                <>
                  登入系統
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
           <p className="text-xs text-slate-400 font-bold">© 2026 POS System Inc.</p>
        </div>
      </div>
    </div>
  );
}