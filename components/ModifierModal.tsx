'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check, ChevronDown } from 'lucide-react';
import { MenuItem } from '@/types/menu';
import { useCart } from '@/hooks/useCart';

// =============================================================================
// 1. 型別與資料結構
// =============================================================================

type DrinkSize = 'S' | 'M' | 'L';
type DrinkTemp = 'ice' | 'no_ice' | 'hot';

type DrinkConfig = {
  sizes: DrinkSize[];           
  prices: Record<string, number>; 
  temps: DrinkTemp[];           
  hasSugar?: boolean;           
  isSoup?: boolean;             
  isCoffee?: boolean; 
  baseSize?: DrinkSize; 
  base: number; 
};

type SetMealDrink = {
  id: string;
  name: string;
  add: number; 
};

// =============================================================================
// 2. 商業邏輯規則
// =============================================================================

const CAT_MAP: Record<string, string> = {
  '套餐': 'setmeal', '漢堡': 'burger', '烤土司': 'toast', '蛋餅': 'omelet',
  '總匯': 'club', '店長推薦': 'special', '帕瑪森/捲餅/香頌/燒餅': 'custom',
  '美味小點': 'snacks', '鍋燒系列': 'hotpot', '飲料': 'drinks', '研磨咖啡': 'coffee',
};

const CATEGORY_OPTION_RULES: any = {
  burger: [
    { type:'choice', key:'bread',  label:'麵包體', options:[{ label:'漢堡', price:0 }, { label:'圓形帕瑪森', price:10 }] },
    { type:'toggle', key:'egg',    label:'加蛋',   price:15 },
    { type:'toggle', key:'cheese', label:'加起司', price:10 },
    { type:'toggle', key:'meat',   label:'加肉',   options: [{label:'加火腿', price:15}, {label:'加培根', price:25}, {label:'加里肌', price:30}, {label:'加卡拉雞', price:45}] },
    { type:'toggle', key:'remove', label:'客製',   options: [{label:'不加蛋', price:-5}, {label:'不加菜', price:0}, {label:'不加醬', price:0}] }
  ],
  toast: [
    { type:'toggle', key:'add', label:'加料', options:[{label:'加起司', price:10}, {label:'換鬆餅', price:15}, {label:'加火腿', price:15}, {label:'加厚', price:10}] },
    { type:'toggle', key:'remove', label:'客製', options: [{label:'不加蛋', price:-5}, {label:'不加菜', price:0}, {label:'不加醬', price:0}] }
  ],
  omelet: [
    { type:'toggle', key:'add', label:'加料', options:[{label:'加起司', price:10}, {label:'雙蛋', price:15}, {label:'加火腿', price:15}] }
  ],
  custom: [
    { type:'choice', key:'bread', label:'麵包體', options:[{label:'帕瑪森', price:10}, {label:'捲餅', price:5}, {label:'香頌', price:5}, {label:'燒餅', price:0}] },
    { type:'toggle', key:'add', label:'加料', options:[{label:'加蛋', price:15}, {label:'加起司', price:10}] },
    { type:'toggle', key:'remove', label:'客製', options: [{label:'不加菜', price:0}, {label:'不加醬', price:0}] }
  ],
  hotpot: [
    { type:'toggle', key:'add', label:'加料', options:[{label:'加起司', price:10}, {label:'加沙茶', price:10}, {label:'加麵', price:15}] }
  ],
  setmeal: [], drinks: [], coffee: [], snacks: [], club: [], special: []
};

const ITEM_OPTION_RULES: any = {
  '蔥抓餅加蛋': [
    { type:'toggle', key:'add', label:'加料', options:[{label:'加起司', price:10}, {label:'加火腿', price:15}] },
    { type:'toggle', key:'remove', label:'客製', options:[{label:'不加蛋', price:-5}, {label:'不加醬', price:0}] }
  ],
  '荷包蛋': [
    { type:'choice', key:'doneness', label:'熟度', options:[{label:'全熟', price:0}, {label:'半熟', price:0}] }
  ]
};

// --- ★ 飲品詳細規則 ---
const COMMON_TEMPS: DrinkTemp[] = ['ice', 'no_ice', 'hot'];
const COLD_ONLY: DrinkTemp[] = ['ice', 'no_ice'];

const DRINK_META: Record<string, DrinkConfig> = {
  // 1. 一般飲料
  '紅茶':       { base: 15, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:15, M:20, L:25 }, temps: COMMON_TEMPS },
  '無糖紅茶':   { base: 15, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:15, M:20, L:25 }, temps: COMMON_TEMPS },
  
  // 2. 奶茶/豆漿類
  '奶茶':       { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS, hasSugar: true },
  '豆漿':       { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '無糖豆漿':   { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '薏仁漿':     { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '米漿':       { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },

  // 3. 冬瓜茶
  '冬瓜茶':     { base: 25, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:25, L:30 },       temps: COMMON_TEMPS },

  // 4. 果汁/冷泡茶 (★ 修正：移除尾端重複的 base)
  '柳橙汁':     { base: 30, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:30, M:35, L:40 }, temps: COLD_ONLY },
  '蔓越莓汁':   { base: 30, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:30, M:35, L:40 }, temps: COLD_ONLY },
  '冷泡茶':     { base: 25, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:25, L:35 },       temps: COLD_ONLY },

  // 5. 鮮奶/特調類
  '鮮奶茶':     { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS, hasSugar: true },
  '薏仁牛奶':   { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS },
  '可可亞牛奶': { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS, hasSugar: false },
  
  // 6. 豆奶茶
  '豆奶茶':     { base: 30, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:30, L:40 },       temps: COMMON_TEMPS, hasSugar: true },

  // 7. 泰式奶茶
  '泰式奶茶':   { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS, hasSugar: false },

  // 8. 咖啡類
  '美式咖啡':   { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:55 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
  '拿鐵咖啡':   { base: 50, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:50, L:75 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
  '特調咖啡':   { base: 40, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:40, L:60 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
  '鴛鴦奶茶':   { base: 40, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:40, L:60 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },

  // 9. 湯品
  '玉米濃湯':   { base: 40, baseSize: 'M', sizes: ['M'],           prices: { M:40 },             temps: ['hot'], isSoup: true }
};

const SET_MEAL_DRINKS: SetMealDrink[] = [
  { id:'tea',        name:'紅茶',       add:0 },
  { id:'green',      name:'無糖紅茶',   add:0 },
  { id:'milk',       name:'奶茶',       add:5 },
  { id:'winter',     name:'冬瓜茶',     add:10 },
  { id:'soy',        name:'豆漿',       add:5 },
  { id:'soy_ns',     name:'無糖豆漿',   add:5 },
  { id:'barley',     name:'薏仁漿',     add:5 },
  { id:'rice',       name:'米漿',       add:5 },
  { id:'orange',     name:'柳橙汁',     add:15 },
  { id:'cranberry',  name:'蔓越莓汁',   add:15 },
  { id:'fresh',      name:'鮮奶茶',     add:20 },
  { id:'barley_milk',name:'薏仁牛奶',   add:20 },
  { id:'soy_milk',   name:'豆奶茶',     add:15 },
  { id:'cocoa',      name:'可可亞牛奶', add:20 },
  { id:'thai',       name:'泰式奶茶',   add:20 },
  { id:'cold_brew',  name:'冷泡茶',     add:10 },
  { id:'americano',  name:'美式咖啡',   add:20 },
  { id:'latte',      name:'拿鐵咖啡',   add:35 },
  { id:'special_cof',name:'特調咖啡',   add:25 },
  { id:'yuanyang',   name:'鴛鴦奶茶',   add:25 },
  { id:'soup',       name:'玉米濃湯',   add:25 },
];

const UPGRADE_PLANS = [
  { id: '39_hotdog',   price: 39, label: '熱狗＋中紅',     credit: 15, defaultDrink: '紅茶', defaultSize: 'M' },
  { id: '49_garlic',   price: 49, label: '香蒜麵包＋中紅', credit: 15, defaultDrink: '紅茶', defaultSize: 'M' },
  { id: '59_tempura',  price: 59, label: '甜不辣＋中奶',   credit: 20, defaultDrink: '奶茶', defaultSize: 'M' },
  { id: '69_fish',     price: 69, label: '魚條＋中冬',     credit: 20, defaultDrink: '冬瓜茶', defaultSize: 'M' },
];

// =============================================================================
// 3. 元件本體
// =============================================================================

interface Props {
  product: MenuItem;
  onClose: () => void;
}

export default function ModifierModal({ product, onClose }: Props) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [selections, setSelections] = useState<Record<string, Record<string, number>>>({});

  // 飲品共用狀態
  const [drinkName, setDrinkName] = useState<string>('');
  const [drinkSize, setDrinkSize] = useState<DrinkSize>('M'); 
  const [drinkTemp, setDrinkTemp] = useState<DrinkTemp>('ice');
  const [drinkSugar, setDrinkSugar] = useState('normal');

  const [upgradeId, setUpgradeId] = useState<string>(''); 
  const [setDrinkId, setSetDrinkId] = useState<string>(''); 

  const isDrink  = (product.categoryName || '').includes('飲料');
  const isCoffee = (product.categoryName || '').includes('咖啡');
  const isSet    = (product.categoryName || '').includes('套餐');
  const isSoup   = product.name.includes('濃湯');

  // 自動修正規格
  useEffect(() => {
    if (!drinkName) return;
    const meta = DRINK_META[drinkName];
    if (!meta) return;

    if (!meta.sizes.includes(drinkSize)) {
      setDrinkSize(meta.sizes[0]); 
    }
    if (!meta.temps.includes(drinkTemp)) {
      setDrinkTemp(meta.temps[0]);
    }
  }, [drinkName, drinkSize, drinkTemp]);

  // 初始化
  useEffect(() => {
    if (isSet) {
      setSetDrinkId('tea'); 
      setDrinkName('紅茶');
      setDrinkSize('S'); // 套餐預設小杯
    } else if (isDrink || isCoffee) {
      setDrinkName(product.name); 
      const meta = DRINK_META[product.name];
      if (meta) setDrinkSize(meta.baseSize || 'M');
    }
  }, [isSet, isDrink, isCoffee, product.name]);

  const rules = useMemo(() => {
    const catKey = CAT_MAP[product.categoryName || ''] || 'snacks';
    const base = CATEGORY_OPTION_RULES[catKey] || [];
    const extra = ITEM_OPTION_RULES[product.name] || [];
    return [...base, ...extra];
  }, [product]);

  // ★ 修正重點：確保狀態更新是 Deep Copy，並正確處理選項
  const toggleSelection = (key: string, label: string, price: number, type: 'choice'|'toggle') => {
    setSelections(prev => {
      // 1. 淺拷貝外層
      const next = { ...prev };
      
      // 2. 淺拷貝內層目標物件 (如果不存在就給空物件)
      const nextGroup = { ...(next[key] || {}) };

      if (type === 'choice') {
        // 單選：直接替換整個 group
        next[key] = { [label]: price };
      } else {
        // 複選：修改拷貝後的 group
        if (nextGroup[label] !== undefined) {
          delete nextGroup[label]; // 取消選取
        } else {
          nextGroup[label] = price; // 新增選取
        }
        // 將修改後的 group 放回 next
        next[key] = nextGroup;
      }
      return next;
    });
  };

  // --- 計算飲料價格 ---
  const calcDrinkPrice = (dName: string, dSize: DrinkSize, context: 'upgrade'|'set'|'single') => {
    if (!dName) return 0;
    const meta = DRINK_META[dName];
    if (!meta) return 0;
    
    const actualPrice = meta.prices[dSize] || Object.values(meta.prices)[0] || 0;

    if (context === 'upgrade') {
      const plan = UPGRADE_PLANS.find(p => p.id === upgradeId);
      if (!plan) return 0;
      if (dName === plan.defaultDrink && dSize === plan.defaultSize) return 0;
      return Math.max(0, actualPrice - (plan?.credit || 0));
    } 
    
    if (context === 'set') return Math.max(0, actualPrice - 15);

    const minPrice = Math.min(...Object.values(meta.prices));
    return Math.max(0, actualPrice - minPrice);
  };

  // --- 總金額 ---
  const total = useMemo(() => {
    let p = product.base_price;
    // 計算所有一般選項的價格
    Object.values(selections).forEach(grp => Object.values(grp).forEach(v => p += v));
    
    if (upgradeId) {
      const plan = UPGRADE_PLANS.find(x => x.id === upgradeId);
      if (plan) {
        p += plan.price;
        p += calcDrinkPrice(drinkName, drinkSize, 'upgrade');
      }
    }

    if (isSet && setDrinkId) {
      const setDrink = SET_MEAL_DRINKS.find(x => x.id === setDrinkId);
      if (setDrink) p += calcDrinkPrice(drinkName, drinkSize, 'set');
    }

    if ((isDrink || isCoffee) && !isSet) {
      p += calcDrinkPrice(product.name, drinkSize, 'single');
    }

    return p * quantity;
  }, [product.base_price, selections, upgradeId, drinkName, drinkSize, isSet, setDrinkId, isDrink, isCoffee]);

  // --- 送出 ---
  const handleSubmit = () => {
    const options: any[] = [];

    Object.entries(selections).forEach(([k, vals]) => {
      Object.entries(vals).forEach(([label, price]) => {
        options.push({ id: k, label, price });
      });
    });

    const fmtDrink = (name: string) => {
      const szMap:any = {S:'小', M:'中', L:'大'};
      const tpMap:any = {ice:'冰', no_ice:'去冰', hot:'熱'};
      const sgMap:any = {normal:'正常糖', unsweet:'無糖'};
      
      const meta = DRINK_META[name];
      if (meta?.isSoup) return name;
      
      let str = `${name}(${szMap[drinkSize]}/${tpMap[drinkTemp]}`;
      if (meta?.hasSugar) str += `/${sgMap[drinkSugar]}`;
      str += ')';
      return str;
    };

    if (upgradeId) {
      const plan = UPGRADE_PLANS.find(p => p.id === upgradeId);
      const drinkExtra = calcDrinkPrice(drinkName, drinkSize, 'upgrade');
      const desc = `升級：${plan?.label.split('＋')[0]}＋${fmtDrink(drinkName)}`;
      options.push({ id: `up_${upgradeId}`, label: desc, price: plan!.price + drinkExtra });
    }

    if (isSet && setDrinkId) {
      const sd = SET_MEAL_DRINKS.find(x => x.id === setDrinkId);
      if (sd) {
        const extra = calcDrinkPrice(drinkName, drinkSize, 'set');
        const desc = `飲品：${fmtDrink(sd.name)}`;
        options.push({ id: 'set_drink', label: desc, price: extra });
      }
    }

    if ((isDrink || isCoffee) && !isSet && !isSoup) {
      const szMap:any = {S:'小', M:'中', L:'大'};
      const tpMap:any = {ice:'冰', no_ice:'去冰', hot:'熱'};
      const sgMap:any = {normal:'正常糖', unsweet:'無糖'};
      const meta = DRINK_META[product.name];
      const extra = calcDrinkPrice(product.name, drinkSize, 'single');
      
      let label = `${szMap[drinkSize]}/${tpMap[drinkTemp]}`;
      if (meta?.hasSugar) label += `/${sgMap[drinkSugar]}`;
      
      options.push({ id: 'spec', label, price: extra });
    }

    if (note) options.push({ id: 'note', label: `備: ${note}`, price: 0 });

    addItem(product, options, quantity);
    onClose();
  };

  const showSugarOption = useMemo(() => {
    const name = isSet ? (SET_MEAL_DRINKS.find(x=>x.id===setDrinkId)?.name || '') : drinkName;
    const meta = DRINK_META[name];
    return meta?.hasSugar;
  }, [isSet, setDrinkId, drinkName]);

  const currentDrinkMeta = DRINK_META[drinkName];
  const showUpgrade = !isDrink && !isCoffee && !isSet && !isSoup;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-50 w-full max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200 z-10">
          <h2 className="text-xl font-black text-black">{product.name}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-black"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* 一般選項 */}
          {(!isDrink && !isCoffee) && rules.map((rule: any) => (
            <div key={rule.key}>
              <h3 className="font-black text-black mb-2.5 flex items-center gap-2 text-base">
                {rule.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(rule.options || [{label:rule.label, price:rule.price}]).map((opt: any) => {
                   // ★ 修正：判斷選中狀態，使用 !== undefined 避免 0 元選項無法選中的問題
                   const isSelected = selections[rule.key]?.[opt.label] !== undefined;
                   
                   return (
                    <button key={opt.label} onClick={() => toggleSelection(rule.key, opt.label, opt.price, rule.type)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition-all active:scale-95 flex items-center gap-1 ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-black border-slate-300'}`}
                    >
                      {isSelected && <Check size={14} strokeWidth={4} />}
                      {opt.label} {opt.price !== 0 && <span className="opacity-80 text-xs">{opt.price>0?`+${opt.price}`:opt.price}</span>}
                    </button>
                   );
                })}
              </div>
            </div>
          ))}

          {/* 套餐飲品選擇區 */}
          {isSet && (
            <div className="bg-white p-4 rounded-2xl border border-slate-300 space-y-4 shadow-sm">
              <h3 className="font-black text-black text-base">套餐飲品</h3>
              <div className="relative">
                <select value={setDrinkId} 
                  onChange={(e) => { 
                    const id = e.target.value;
                    const d = SET_MEAL_DRINKS.find(x=>x.id===id);
                    setSetDrinkId(id); 
                    setDrinkName(d?.name||'');
                  }} 
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-black appearance-none text-base focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {SET_MEAL_DRINKS.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.add > 0 ? `(+$${d.add}起)` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-4 text-black pointer-events-none" size={20}/>
              </div>

              {currentDrinkMeta && !currentDrinkMeta.isSoup && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-black mb-1 block">杯型</label>
                      <select value={drinkSize} onChange={e=>setDrinkSize(e.target.value as DrinkSize)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-black text-sm">
                        {currentDrinkMeta.sizes.map(sz => (
                          <option key={sz} value={sz}>
                            {sz==='S'?'小':(sz==='M'?'中':'大')}
                            {calcDrinkPrice(drinkName, sz, 'set') > 0 ? ` +${calcDrinkPrice(drinkName, sz, 'set')}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black mb-1 block">溫度</label>
                      <select value={drinkTemp} onChange={e=>setDrinkTemp(e.target.value as DrinkTemp)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-black text-sm">
                        {currentDrinkMeta.temps.map(t => (
                          <option key={t} value={t}>{t==='ice'?'冰':(t==='no_ice'?'去冰':'熱')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {showSugarOption && (
                    <div>
                      <label className="text-xs font-bold text-black mb-1 block">甜度</label>
                      <div className="flex gap-2">
                        {['normal','unsweet'].map(s => (
                          <button key={s} onClick={()=>setDrinkSugar(s)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${drinkSugar===s?'bg-black text-white border-black':'bg-white text-black border-slate-300'}`}>
                            {s==='normal'?'正常糖':'無糖'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 超值升級區塊 */}
          {showUpgrade && (
            <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="font-black text-black text-base">✨ 超值升級套餐</h3>
              </div>
              <div className="p-2 space-y-1">
                {UPGRADE_PLANS.map(plan => (
                  <label key={plan.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border ${upgradeId===plan.id ? 'border-black bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}>
                    <span className="font-bold text-black flex items-center gap-2">
                      <span className="bg-black text-white text-xs px-1.5 py-0.5 rounded">+{plan.price}</span>
                      {plan.label}
                    </span>
                    <input type="radio" name="upgrade" checked={upgradeId === plan.id}
                      onChange={() => { 
                        setUpgradeId(plan.id); 
                        setDrinkName(plan.defaultDrink); 
                        setDrinkSize('M'); // 升級預設中杯
                      }}
                      className="w-5 h-5 accent-black"
                    />
                  </label>
                ))}
                <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                  <span className="font-bold text-slate-500">不升級</span>
                  <input type="radio" name="upgrade" checked={upgradeId === ''} onChange={() => { setUpgradeId(''); setDrinkName(''); }} className="w-5 h-5 accent-slate-400" />
                </label>
              </div>

              {upgradeId && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-black mb-1 block">更換飲品 (補差額)</label>
                    <div className="relative">
                      <select value={drinkName} onChange={e => {
                          setDrinkName(e.target.value);
                          setDrinkSize('M'); // 換飲料重置中杯
                        }} 
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-black appearance-none"
                      >
                        {Object.keys(DRINK_META).map(name => {
                          if (DRINK_META[name].isSoup && name !== '玉米濃湯') return null;
                          const plan = UPGRADE_PLANS.find(p => p.id === upgradeId);
                          const meta = DRINK_META[name];
                          const mPrice = meta.prices['M'] || meta.prices['S'] || 0;
                          
                          let diff = Math.max(0, mPrice - (plan?.credit || 0));
                          if (name === plan?.defaultDrink) diff = 0;
                          
                          return <option key={name} value={name}>{name} {diff > 0 ? `(+$${diff}起)` : ''}</option>;
                        })}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 text-black pointer-events-none" size={18}/>
                    </div>
                  </div>
                  
                  {currentDrinkMeta && !currentDrinkMeta.isSoup && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-black mb-1 block">杯型</label>
                          <select value={drinkSize} onChange={e=>setDrinkSize(e.target.value as DrinkSize)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-black text-sm">
                            {currentDrinkMeta.sizes.map(sz => (
                              <option key={sz} value={sz}>
                                {sz==='S'?'小':(sz==='M'?'中':'大')}
                                {calcDrinkPrice(drinkName, sz, 'upgrade') > 0 ? ` +${calcDrinkPrice(drinkName, sz, 'upgrade')}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-black mb-1 block">溫度</label>
                          <select value={drinkTemp} onChange={e=>setDrinkTemp(e.target.value as DrinkTemp)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-black text-sm">
                            {currentDrinkMeta.temps.map(t => (
                              <option key={t} value={t}>{t==='ice'?'冰':(t==='no_ice'?'去冰':'熱')}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {showSugarOption && (
                        <div>
                          <label className="text-xs font-bold text-black mb-1 block">甜度</label>
                          <div className="flex gap-2">
                            {['normal','unsweet'].map(s => (
                              <button key={s} onClick={()=>setDrinkSugar(s)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${drinkSugar===s?'bg-black text-white border-black':'bg-white text-black border-slate-300'}`}>
                                {s==='normal'?'正常糖':'無糖'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 單點飲品/咖啡 規格 */}
          {((isDrink || isCoffee) && !isSet && !isSoup) && currentDrinkMeta && (
            <div className="bg-white p-4 rounded-2xl border border-slate-300 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-black mb-1 block">杯型</label>
                  <select value={drinkSize} onChange={e=>setDrinkSize(e.target.value as DrinkSize)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-black text-sm">
                    {currentDrinkMeta.sizes.map(sz => (
                      <option key={sz} value={sz}>
                        {sz==='S'?'小':(sz==='M'?'中':'大')}
                        {calcDrinkPrice(drinkName, sz, 'single') > 0 ? ` +${calcDrinkPrice(drinkName, sz, 'single')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-black mb-1 block">溫度</label>
                  <select value={drinkTemp} onChange={e=>setDrinkTemp(e.target.value as DrinkTemp)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-black text-sm">
                    {currentDrinkMeta.temps.map(t => (
                      <option key={t} value={t}>{t==='ice'?'冰':(t==='no_ice'?'去冰':'熱')}</option>
                    ))}
                  </select>
                </div>
              </div>
              {showSugarOption && (
                <div>
                  <label className="text-xs font-bold text-black mb-1 block">甜度</label>
                  <div className="flex gap-2">
                    {['normal','unsweet'].map(s => (
                      <button key={s} onClick={()=>setDrinkSugar(s)} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${drinkSugar===s?'bg-black text-white border-black':'bg-white text-black border-slate-300'}`}>
                        {s==='normal'?'正常糖':'無糖'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="font-bold text-black mb-2 block">備註</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-black bg-white text-black placeholder:text-slate-400" placeholder="" rows={2} />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1"><Minus size={18} className="text-black"/></button>
            <span className="font-black text-xl w-8 text-center text-black">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="p-1"><Plus size={18} className="text-black"/></button>
          </div>
          <button onClick={handleSubmit} className="flex-1 bg-black text-white py-3.5 rounded-xl font-bold text-lg shadow-lg flex justify-between px-6 active:scale-95 transition-transform">
            <span>加入購物車</span>
            <span>${total.toLocaleString()}</span>
          </button>
        </div>

      </div>
    </div>
  );
}