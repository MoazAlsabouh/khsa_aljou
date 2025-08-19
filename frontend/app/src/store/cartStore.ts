import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { CartItem, MenuItem } from '../types';

interface Customization {
    excluded_ingredients: string[];
    notes: string;
}

interface CartState {
  items: CartItem[];
  restaurantId: number | null;
  addItem: (item: MenuItem, restaurantId: number, customization: Customization) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      addItem: (item, newRestaurantId, customization) => {
        const { items, restaurantId } = get();
        
        if (restaurantId !== null && restaurantId !== newRestaurantId) {
          toast.error('لا يمكنك إضافة وجبات من مطاعم مختلفة في نفس الطلب.');
          return;
        }

        const existingItem = items.find(
          cartItem =>
            cartItem.id === item.id &&
            cartItem.notes === customization.notes &&
            JSON.stringify(cartItem.excluded_ingredients.sort()) === JSON.stringify(customization.excluded_ingredients.sort())
        );

        if (existingItem) {
          set({
            items: items.map((cartItem) =>
              cartItem.cartItemId === existingItem.cartItemId
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            ),
          });
        } else {
          const newCartItem: CartItem = {
            ...item,
            cartItemId: uuidv4(),
            quantity: 1,
            ...customization,
          };
          set({
            items: [...items, newCartItem],
            restaurantId: newRestaurantId,
          });
        }
        toast.success(`تمت إضافة "${item.name}" إلى العربة.`);
      },
      removeItem: (cartItemId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.cartItemId !== cartItemId);
          return {
            items: newItems,
            restaurantId: newItems.length > 0 ? state.restaurantId : null,
          };
        });
      },
      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
        } else {
          set({
            items: get().items.map((item) =>
              item.cartItemId === cartItemId ? { ...item, quantity } : item
            ),
          });
        }
      },
      clearCart: () => set({ items: [], restaurantId: null }),
      totalPrice: () => {
        return get().items.reduce((total, item) => total + parseFloat(item.price) * item.quantity, 0);
      },
      totalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);