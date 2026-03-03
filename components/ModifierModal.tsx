'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check, ChevronDown } from 'lucide-react';
import { MenuItem } from '@/types/menu';
import { useCart } from '@/hooks/useCart';

// =============================================================================
// 1. 飲品與套餐設定 (維持原樣)
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

const COMMON_TEMPS: DrinkTemp[] = ['ice', 'no_ice', 'hot'];
const COLD_ONLY: DrinkTemp[] = ['ice', 'no_ice'];

const DRINK_META: Record<string, DrinkConfig> = {
  '紅茶':       { base: 15, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:15, M:20, L:25 }, temps: COMMON_TEMPS },
  '無糖紅茶':   { base: 15, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:15, M:20, L:25 }, temps: COMMON_TEMPS },
  '奶茶':       { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS, hasSugar: true },
  '豆漿':       { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '無糖豆漿':   { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '薏仁漿':     { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '米漿':       { base: 20, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:20, M:25, L:35 }, temps: COMMON_TEMPS },
  '冬瓜茶':     { base: 25, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:25, L:30 },       temps: COLD_ONLY },
  '柳橙汁':     { base: 30, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:30, M:35, L:40 }, temps: COLD_ONLY },
  '蔓越莓汁':   { base: 30, baseSize: 'M', sizes: ['S', 'M', 'L'], prices: { S:30, M:35, L:40 }, temps: COLD_ONLY },
  '冷泡茶':     { base: 25, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:25, L:35 },       temps: COLD_ONLY },
  '鮮奶茶':     { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS, hasSugar: true },
  '薏仁牛奶':   { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS },
  '可可亞牛奶': { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS, hasSugar: false },
  '豆奶茶':     { base: 30, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:30, L:40 },       temps: COMMON_TEMPS, hasSugar: true },
  '泰式奶茶':   { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:45 },       temps: COMMON_TEMPS, hasSugar: false },
  '美式咖啡':   { base: 35, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:35, L:55 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
  '拿鐵咖啡':   { base: 50, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:50, L:75 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
  '特調咖啡':   { base: 40, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:40, L:60 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
  '鴛鴦奶茶':   { base: 40, baseSize: 'M', sizes: ['M', 'L'],      prices: { M:40, L:60 },       temps: COMMON_TEMPS, isCoffee: true, hasSugar: true },
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
// 2. 商業邏輯規則 (Hardcoded)
// =============================================================================

const CAT_MAP: Record<string, string> = {
  '套餐': 'setmeal', '漢堡': 'burger', '烤土司': 'toast', '蛋餅': 'omelet',
  '總匯': 'club', '店長推薦': 'special', '帕瑪森/捲餅/香頌/燒餅': 'custom',
  '美味小點': 'snacks', '鍋燒系列': 'hotpot', '飲料': 'drinks', '研磨咖啡': 'coffee',
};

// --- 一般共用加肉選項 (已移除嫩雞、杏鮑菇) ---
const MEAT_OPTIONS = [
  {label:'加火腿', price:15},
  {label:'加漢堡肉', price:20},
  {label:'加麥香雞', price:25},
  {label:'加薯餅', price:25},
  {label:'加培根', price:30},
  {label:'加牛肉', price:30},
  {label:'加里肌', price:30},
  {label:'加卡拉雞', price:45},
  {label:'加厚牛', price:60}
];

// --- 包含「不加蛋」的客製選項 (給漢堡、吐司、蔥抓餅加蛋用) ---
const CUSTOM_OPTIONS = [
  {label:'不加蛋', price:-5},
  {label:'不加菜', price:0},
  {label:'不加醬', price:0},
  {label:'菜多', price:10}
];

// --- ★ 新增：沒有「不加蛋」的客製選項 (給總匯、帕瑪森系列用) ---
const CUSTOM_OPTIONS_NO_EGG = [
  {label:'不加菜', price:0},
  {label:'不加醬', price:0},
  {label:'菜多', price:10}
];

const COMMON_ADDONS = [
  { type:'toggle', key:'egg',    label:'加蛋',   price:15 },
  { type:'toggle', key:'cheese', label:'加起司', price:10 },
  { type:'toggle', key:'meat',   label:'加肉',   options: MEAT_OPTIONS }
];

const CATEGORY_OPTION_RULES: any = {
  burger: [
    { type:'choice', key:'bread',  label:'麵包體', options:[{ label:'漢堡', price:0 }, { label:'圓形帕瑪森', price:10 }] },
    ...COMMON_ADDONS,
    { type:'toggle', key:'remove', label:'客製',   options: CUSTOM_OPTIONS }
  ],
  toast: [
    ...COMMON_ADDONS,
    { type:'toggle', key:'remove', label:'客製',   options: CUSTOM_OPTIONS }
  ],
  omelet: [
    ...COMMON_ADDONS
  ],
  // ★ 總匯：改用 CUSTOM_OPTIONS_NO_EGG
  club: [
    ...COMMON_ADDONS,
    { type:'toggle', key:'remove', label:'客製',   options: CUSTOM_OPTIONS_NO_EGG }
  ],
  // ★ 帕瑪森系列：改用 CUSTOM_OPTIONS_NO_EGG
  custom: [
    { type:'choice', key:'bread', label:'麵包體', isRequired: true, options:[{label:'帕瑪森', price:10}, {label:'捲餅', price:5}, {label:'香頌', price:5}, {label:'燒餅', price:0}] },
    ...COMMON_ADDONS,
    { type:'toggle', key:'remove', label:'客製',   options: CUSTOM_OPTIONS_NO_EGG }
  ],
  // 美味小點是純單點，無加料
  snacks: [],
  hotpot: [
    { type:'toggle', key:'add', label:'加料', options:[{label:'加起司', price:10}, {label:'加沙茶', price:10}, {label:'加麵', price:15}] }
  ],
  setmeal: [], drinks: [], coffee: [], special: []
};

const ITEM_OPTION_RULES: any = {
  '蔥抓餅加蛋': [
    ...COMMON_ADDONS,
    { type:'toggle', key:'remove', label:'客製', options: CUSTOM_OPTIONS }
  ],
  '荷包蛋': [
    { type:'choice', key:'doneness', label:'熟度', options:[{label:'全熟', price:0}, {label:'半熟', price:0}] }
  ]
};

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
  
  // selections 結構: { "group_key": { "label": price } }
  const [selections, setSelections] = useState<Record<string, Record<string, number>>>({});

  // 飲品狀態
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

  // 初始化
  useEffect(() => {
    if (isSet) {
      setSetDrinkId('tea'); 
      setDrinkName('紅茶');
      setDrinkSize('S');
    } else if (isDrink || isCoffee) {
      setDrinkName(product.name); 
      const meta = DRINK_META[product.name];
      if (meta) setDrinkSize(meta.baseSize || 'M');
    }
  }, [isSet, isDrink, isCoffee, product.name]);

  // ★★★ 核心邏輯：規則篩選與替換 ★★★
  const modifierGroups = useMemo(() => {
    const catKey = CAT_MAP[product.categoryName || ''] || 'snacks';
    
    // 1. 培根/火腿/鮪魚「焗烤厚片」：沒有任何加點選項
    if (catKey === 'toast' && product.name.includes('焗烤厚片')) {
      return [];
    }

    // 2. 果醬吐司/厚片吐司 (完全替換規則)
    if (catKey === 'toast' && (product.name.includes('果醬') || product.name.includes('厚片'))) {
      const customRules: any[] = [
        {
          key: 'flavor',
          label: '口味選擇',
          type: 'choice', // 單選口味
          isRequired: true, 
          options: [
            { label: '草莓', price: 0 },
            { label: '奶酥', price: 0 },
            { label: '巧克力', price: 0 },
            { label: '奶油', price: 0 },
            { label: '花生', price: 0 },
            { label: '藍莓', price: 0 },
            { label: '香蒜', price: 5 },
            { label: '煉乳', price: 10 },
          ]
        }
      ];

      // 果醬吐司專屬：多一個加厚選項
      if (product.name.includes('果醬')) {
        customRules.push({
          key: 'thickness',
          label: '厚度選擇',
          type: 'toggle',
          isRequired: false,
          options: [{ label: '加厚', price: 10 }]
        });
      }

      return customRules;
    }

    // 3. 標準邏輯
    const base = CATEGORY_OPTION_RULES[catKey] || [];
    const extra = ITEM_OPTION_RULES[product.name] || [];
    let rules = [...base, ...extra];

    // 4. 漢堡與一般烤土司類：只有「蛋堡」與「蛋吐司」才能「不加蛋」
    if (catKey === 'burger' || catKey === 'toast') {
      rules = rules.map((rule: any) => {
        if (rule.key === 'remove') {
          return {
            ...rule,
            options: (rule.options || []).filter((opt: any) => {
              // 因為只有 CUSTOM_OPTIONS (有不加蛋) 才會進來判斷，總匯跟帕瑪森已經沒有這個選項了
              if (opt.label === '不加蛋') {
                if (catKey === 'burger') return product.name.includes('蛋堡');
                if (catKey === 'toast') return product.name.includes('蛋吐司');
              }
              return true;
            })
          };
        }
        return rule;
      });
    }

    return rules;
  }, [product]);

  // 切換選項
  const toggleSelection = (groupKey: string, itemKey: string, price: number, type: 'choice'|'toggle') => {
    setSelections(prev => {
      const next = { ...prev };
      
      if (type === 'choice') {
        next[groupKey] = { [itemKey]: price };
      } else {
        const nextGroup = { ...(next[groupKey] || {}) };
        if (nextGroup[itemKey] !== undefined) {
          delete nextGroup[itemKey];
        } else {
          nextGroup[itemKey] = price;
        }
        next[groupKey] = nextGroup;
      }
      return next;
    });
  };

  // 計算飲料價格
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

  // 計算總金額
  const total = useMemo(() => {
    let p = product.base_price;
    Object.values(selections).forEach(grp => {
      Object.values(grp).forEach(v => p += v);
    });
    
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
  }, [product.base_price, selections, upgradeId, drinkName, drinkSize, isSet, setDrinkId, isDrink, isCoffee, quantity]);

  // 送出表單
  const handleSubmit = () => {
    // 檢查必選項目 (例如：帕瑪森麵包體、果醬口味)
    for (const group of modifierGroups) {
      if (group.isRequired) {
        const selectedInGroup = selections[group.key];
        if (!selectedInGroup || Object.keys(selectedInGroup).length === 0) {
          alert(`請選擇「${group.label}」`);
          return; // 阻擋送出
        }
      }
    }

    const options: any[] = [];

    // 處理一般加料
    modifierGroups.forEach((group: any) => {
      const selectedInGroup = selections[group.key];
      if (selectedInGroup) {
        Object.entries(selectedInGroup).forEach(([itemKey, price]) => {
          options.push({ id: itemKey, label: itemKey, price: Number(price) });
        });
      }
    });

    // 處理飲品
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
      <div className="bg-slate-50 w-full max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200 z-10">
          <h2 className="text-xl font-black text-black">{product.name}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-black"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* 一般選項 */}
          {(!isDrink && !isCoffee) && modifierGroups.map((group: any) => (
            <div key={group.key}>
              <h3 className="font-black text-black mb-2.5 flex items-center gap-2 text-base">
                {group.label}
                {group.isRequired && <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">*必填</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(group.options || [{label: group.label, price: group.price}]).map((opt: any) => {
                   const isSelected = selections[group.key]?.[opt.label] !== undefined;
                   
                   return (
                    <button 
                      key={opt.label} 
                      onClick={() => toggleSelection(group.key, opt.label, opt.price, group.type)}
                      // 樣式：純粹用黑白底色切換，確保寬度永遠固定不跑位
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors active:scale-95 flex items-center gap-1 
                        ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}
                      `}
                    >
                      {opt.label} 
                      {opt.price !== 0 && <span className={`text-xs ml-0.5 ${isSelected?'text-white/80':'text-slate-400'}`}>
                        {opt.price > 0 ? `+${opt.price}` : opt.price}
                      </span>}
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
                        setDrinkSize('M'); 
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
                          setDrinkSize('M'); 
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

        {/* Footer */}
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