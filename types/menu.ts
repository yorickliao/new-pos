// types/menu.ts

// 1. 選項細項 (對應資料庫 modifier_items)
export interface ModifierItem {
  id: string;          // UUID
  name: string;        // 選項名稱 (如: 微糖, 加蛋)
  price_extra: number; // 加價金額
}

// 2. 選項群組 (對應資料庫 modifier_groups)
export interface ModifierGroup {
  id: string;          // UUID
  name: string;        // 群組名稱 (如: 甜度, 加料區)
  is_required: boolean;   // 是否必選
  allow_multiple: boolean; // true=多選(Checkbox), false=單選(Radio)
  items: ModifierItem[];  // 群組內的選項列表
}

// 3. 菜單商品 (對應資料庫 products + 關聯資料)
export interface MenuItem {
  id: string;          // UUID
  name: string;
  description?: string | null; // ? 表示可選，對應 Supabase 可能回傳 null
  base_price: number;  // 基礎價格
  image_url?: string | null;
  category_id?: number;
  categoryName?: string; // ★ 關鍵：用來判斷是否為「飲料/套餐」以隱藏升級區塊
  modifier_groups?: ModifierGroup[]; // ★ 巢狀結構：該商品可用的選項群組
}

// 4. 購物車內的已選選項 (前端 UI 使用，對應之前的 UIModifierOption)
export interface CartOption {
  id: string;    // 選項 ID 或特殊 ID (如 upgrade_xxx)
  label: string; // 顯示文字 (如: "加蛋", "升級: 熱狗+紅茶")
  price: number; // 實際加價金額
}

// 為了相容之前的程式碼，我們可以導出一個別名 (Alias)
// 這樣就不用急著改 hooks/useCart.ts 裡面的引用名稱
export type UIModifierOption = CartOption;

// 5. 購物車項目 (繼承 MenuItem，加上數量與已選內容)
export interface CartItem extends MenuItem {
  cartId: string; // 購物車專用的唯一 ID (前端生成)
  quantity: number;
  selectedOptions: CartOption[]; // ★ 這裡存使用者選了什麼
  subtotal: number; // 小計 (單價 + 選項加價) * 數量
  note?: string;    // 備註
}