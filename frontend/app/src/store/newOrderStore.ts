import { create } from 'zustand';
import type { Order } from '../types';

interface NewOrderState {
  orderQueue: Order[];
  currentOrder: Order | null;
  isModalOpen: boolean;
  addOrdersToQueue: (newOrders: Order[]) => void;
  processNextOrder: () => void;
  closeModalAndProcessNext: () => void;
}

export const useNewOrderStore = create<NewOrderState>((set, get) => ({
  orderQueue: [],
  currentOrder: null,
  isModalOpen: false,

  addOrdersToQueue: (newOrders) => {
    const { orderQueue, currentOrder } = get();
    const existingIds = new Set([...orderQueue.map(o => o.id), currentOrder?.id]);
    const uniqueNewOrders = newOrders.filter(order => !existingIds.has(order.id));

    if (uniqueNewOrders.length > 0) {
      set(state => ({
        orderQueue: [...state.orderQueue, ...uniqueNewOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }));
      get().processNextOrder();
    }
  },

  processNextOrder: () => {
    const { orderQueue, isModalOpen } = get();
    if (!isModalOpen && orderQueue.length > 0) {
      const nextOrder = orderQueue[0];
      set(state => ({
        currentOrder: nextOrder,
        orderQueue: state.orderQueue.slice(1),
        isModalOpen: true,
      }));
    }
  },

  closeModalAndProcessNext: () => {
    set({ isModalOpen: false, currentOrder: null });
    setTimeout(() => {
      get().processNextOrder();
    }, 500);
  },
}));