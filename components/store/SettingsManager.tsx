'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Power, Save, Clock, Loader2 } from 'lucide-react';

export default function SettingsManager({ storeId }: { storeId: string }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    address: '',
    phone: '',
    opening_time: '',
    closing_time: '',
    is_active: true, 
  });

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('stores').select('*').eq('id', storeId).single();
      if (data) {
        setSettings({
          name: data.name,
          address: data.address,
          phone: data.phone || '',
          opening_time: data.opening_time,
          closing_time: data.closing_time,
          is_active: data.is_active ?? true,
        });
      }
      setLoading(false);
    }
    fetchSettings();
  }, [storeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          phone: settings.phone,
          opening_time: settings.opening_time,
          closing_time: settings.closing_time,
          is_active: settings.is_active
        })
        .eq('id', storeId);
      if (error) throw error;
      alert('設定已儲存！');
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">載入設定中...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
      {/* 營業開關 */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="font-black text-slate-800 text-lg">接單狀態</div>
          <div className={`text-sm font-bold mt-1 ${settings.is_active ? 'text-green-600' : 'text-red-500'}`}>
            {settings.is_active ? '● 目前正常營業中' : '● 目前暫停接單中'}
          </div>
        </div>
        <button
          onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
          className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${settings.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
        >
          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 flex items-center justify-center ${settings.is_active ? 'translate-x-8' : 'translate-x-0'}`}>
            <Power size={12} className={settings.is_active ? 'text-green-500' : 'text-slate-400'} />
          </div>
        </button>
      </div>

      {/* 表單 */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-500 ml-1">分店名稱</label>
             <input disabled value={settings.name} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-500 cursor-not-allowed" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">開店時間</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                  <input type="time" value={settings.opening_time} onChange={e => setSettings({...settings, opening_time: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-blue-500 outline-none" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">打烊時間</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                  <input type="time" value={settings.closing_time} onChange={e => setSettings({...settings, closing_time: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-blue-500 outline-none" />
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-500 ml-1">門市電話</label>
             <input type="tel" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-blue-500 outline-none" />
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> 儲存設定</>}
          </button>
        </form>
      </div>
    </div>
  );
}