import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, MenuItem, UIModifierOption } from '@/types/menu';

interface CartState {
  items: CartItem[];
  addItem: (product: MenuItem, selectedOptions: UIModifierOption[], quantity: number) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  clearCart: () => void;
  total: number; // 改成屬性而非函式，讓 Zustand 自動更新
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0, // 初始值

      addItem: (product, selectedOptions, quantity) => {
        const newItem: CartItem = {
          ...product,
          cartId: crypto.randomUUID(),
          selectedOptions,
          quantity,
          subtotal: (product.base_price + selectedOptions.reduce((sum, opt) => sum + (Number(opt.price) || 0), 0)) * quantity,
        };
        
        set((state) => {
          const newItems = [...state.items, newItem];
          return { 
            items: newItems,
            total: newItems.reduce((sum, item) => sum + item.subtotal, 0) // 立即更新總額
          };
        });
      },

      removeItem: (id) => set((state) => {
        const newItems = state.items.filter((i) => i.cartId !== id);
        return { 
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.subtotal, 0) 
        };
      }),

      updateQuantity: (id, delta) => set((state) => {
        const newItems = state.items.map((item) => {
          if (item.cartId === id) {
            const newQty = Math.max(1, item.quantity + delta);
            // 重新計算 subtotal (單價 * 新數量)
            const unitPrice = item.subtotal / item.quantity;
            return { ...item, quantity: newQty, subtotal: unitPrice * newQty };
          }
          return item;
        });
        return { 
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.subtotal, 0) 
        };
      }),

      clearCart: () => set({ items: [], total: 0 }),
    }),
    { name: 'pos-cart-storage', storage: createJSONStorage(() => localStorage) }
  )
);