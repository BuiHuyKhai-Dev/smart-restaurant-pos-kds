'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { create } from 'zustand';
import {
  Branch,
  RestaurantTable,
  MenuItem,
  Ingredient,
  InventoryAuditLog,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentRequest,
  OrderItemStatus,
  TableStatus,
} from './types';
import {
  INITIAL_BRANCHES,
  INITIAL_TABLES,
  INITIAL_MENU_ITEMS,
  INITIAL_INGREDIENTS,
  INITIAL_ORDERS,
} from './mock-data';
import { apiClient } from './api-client';
import { socketService } from './socket-client';

const STORAGE_KEYS = {
  BRANCH_ID: 'pos_kds_current_branch_id',
  BRANCHES: 'pos_kds_branches_v1',
  TABLES: 'pos_kds_tables_v1',
  MENU: 'pos_kds_menu_v1',
  INGREDIENTS: 'pos_kds_ingredients_v1',
  ORDERS: 'pos_kds_orders_v1',
  AUDIT_LOGS: 'pos_kds_audit_logs_v1',
  PAYMENT_REQUESTS: 'pos_kds_payment_requests_v1',
};

function getStoredOrInitial<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Lỗi lưu trữ state:', e);
  }
}

/** Chuyển đổi dữ liệu bảng thô từ Backend sang danh sách Tables và Orders */
function mapRawTablesToState(branchId: string, rawTables: any[]) {
  const backendOrders: Order[] = [];
  const tables: RestaurantTable[] = rawTables.map((t: any) => {
    const activeSession = t.orderSessions?.[0];
    const statusLower = t.status.toLowerCase() as TableStatus;

    if (activeSession?.orders && Array.isArray(activeSession.orders)) {
      activeSession.orders.forEach((o: any, oIdx: number) => {
        const mappedItems: OrderItem[] = (o.items || []).map((it: any) => ({
          id: it.id,
          menuItemId: it.productId || it.product?.id || '',
          name: it.product?.name || 'Món ăn',
          price: Number(it.price || 0),
          quantity: it.quantity || 1,
          station: (it.kitchenStationId || it.kitchenStation?.id || it.product?.kitchenStationId || 'hot').toLowerCase(),
          selectedSize: it.selectedSize || undefined,
          selectedSpicyLevel: it.selectedSpicyLevel || undefined,
          selectedToppings: it.selectedToppings || [],
          note: it.note || undefined,
          status: (it.status || 'PENDING').toLowerCase() as OrderItemStatus,
          orderedAt: it.createdAt || o.createdAt,
          startedCookingAt: it.startedAt || undefined,
          completedAt: it.completedAt || undefined,
          orderCode: o.orderCode || `ORD-${o.id.slice(-4)}`,
          batchIndex: oIdx + 1,
        }));

        const subtotal = mappedItems.reduce((s, item) => s + item.price * item.quantity, 0);
        const taxAmount = Math.round(subtotal * 0.08);

        backendOrders.push({
          id: o.id,
          orderCode: o.orderCode || `ORD-${o.id.slice(-4)}`,
          orderSessionId: activeSession.id,
          batchIndex: oIdx + 1,
          branchId: t.branchId,
          tableId: t.id,
          tableNumber: t.tableNumber,
          items: mappedItems,
          status: activeSession.status === 'PAYMENT_PENDING' ? 'ready' : 'in_progress',
          createdAt: o.createdAt || new Date().toISOString(),
          guestCount: activeSession.guestCount || 2,
          subtotal,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 8,
          taxAmount,
          finalAmount: subtotal + taxAmount,
        });
      });
    }

    return {
      id: t.id,
      branchId: t.branchId,
      number: t.tableNumber,
      displayName: t.displayName || `Bàn ${t.tableNumber}`,
      capacity: t.capacity || 4,
      area: t.area?.toLowerCase() || 'ground',
      status: statusLower,
      activeOrderId: activeSession?.orders?.[activeSession.orders.length - 1]?.id || activeSession?.orders?.[0]?.id || activeSession?.id,
      guestCount: activeSession?.guestCount,
      seatedAt: t.seatedAt || activeSession?.openedAt,
    };
  });

  return { tables, backendOrders };
}

interface LiveStoreState {
  currentBranchId: string;
  branches: Branch[];
  tables: RestaurantTable[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  orders: Order[];
  auditLogs: InventoryAuditLog[];
  paymentRequests: PaymentRequest[];
  isBackendConnected: boolean;
  isInitialized: boolean;

  // Actions
  init: () => void;
  setBranch: (branchId: string) => void;
  fetchTablesOnly: (branchId: string) => Promise<void>;
  debouncedFetchTables: (branchId: string) => void;
  fetchBackendData: (branchId: string) => Promise<void>;
  refreshBackend: () => Promise<void>;

  // Delta socket handlers (0ms in-memory update)
  handleOrderPlaced: (payload: any) => void;
  handleItemStatusUpdated: (item: any) => void;
  handleBatchItemsUpdated: (payload: any) => void;
  handlePaymentRequested: (payload: any) => void;
  handlePaymentCompleted: (payload: any) => void;

  // Operations
  placeOrder: (payload: {
    tableId: string;
    guestCount?: number;
    tableToken?: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      selectedSize?: string;
      selectedSpicyLevel?: string;
      selectedToppings?: string[];
      note?: string;
    }>;
  }) => Promise<any>;

  updateOrderItemStatus: (arg1: string, arg2: string, arg3?: OrderItemStatus) => Promise<void>;
  completeOrderTicket: (orderId: string, stationId?: string) => Promise<any>;
  addItemsToOrder: (tableIdOrOrderId: string, items: Array<{ menuItemId: string; quantity: number; note?: string }>) => Promise<any>;
  changeOrMergeTable: (fromTableId: string, toTableId: string, actionType: 'change' | 'merge') => Promise<void>;
  requestPayment: (tableId: string) => Promise<PaymentRequest | null>;
  clearPaymentRequest: (tableId: string) => void;
  processPayment: (
    tableId: string,
    paymentMethod: PaymentMethod,
    discountPercent?: number,
    cashGiven?: number
  ) => Promise<any>;
  restockIngredient: (ingredientId: string, amount: number, costPrice?: number) => Promise<void>;
  updateMenuItemBOM: (menuItemId: string, newBOM: MenuItem['bom']) => Promise<void>;
}

// Biến singleton giữ kết nối và debounce
let isSocketSubscribed = false;
let debounceTablesTimer: NodeJS.Timeout | null = null;

export const useLiveStoreBase = create<LiveStoreState>((set, get) => ({
  currentBranchId: 'branch-1',
  branches: INITIAL_BRANCHES,
  tables: INITIAL_TABLES,
  menuItems: INITIAL_MENU_ITEMS,
  ingredients: INITIAL_INGREDIENTS,
  orders: INITIAL_ORDERS,
  auditLogs: [],
  paymentRequests: [],
  isBackendConnected: false,
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    set({ isInitialized: true });

    const storedBranchId = getStoredOrInitial<string>(STORAGE_KEYS.BRANCH_ID, 'branch-1');
    set({ currentBranchId: storedBranchId });

    // 1. Tải toàn bộ dữ liệu ban đầu
    get().fetchBackendData(storedBranchId);

    // 2. Thiết lập duy nhất 1 bộ Socket Listener cho toàn bộ ứng dụng (Singleton)
    if (typeof window !== 'undefined' && !isSocketSubscribed) {
      isSocketSubscribed = true;
      const socket = socketService.getSocket();
      socketService.joinBranch(storedBranchId);
      socketService.joinPos(storedBranchId);
      socketService.joinKitchen(storedBranchId, 'hot');
      socketService.joinKitchen(storedBranchId, 'cold');
      socketService.joinKitchen(storedBranchId, 'bar');

      socket.on('order_item:status_updated', (item: any) => {
        get().handleItemStatusUpdated(item);
      });

      socket.on('order_items:batch_updated', (payload: any) => {
        get().handleBatchItemsUpdated(payload);
      });

      socket.on('order:placed', (data: any) => {
        console.log('⚡ Socket [order:placed]:', data?.orderCode || data);
        get().handleOrderPlaced(data);
        get().debouncedFetchTables(get().currentBranchId);
      });

      socket.on('kitchen:new_items', (payload: any) => {
        console.log('⚡ Socket [kitchen:new_items]:', payload);
        get().debouncedFetchTables(get().currentBranchId);
      });

      socket.on('payment:requested', (payload: any) => {
        get().handlePaymentRequested(payload);
      });

      socket.on('payment:completed', (payload: any) => {
        get().handlePaymentCompleted(payload);
      });

      socket.on('table:updated', (payload: any) => {
        get().debouncedFetchTables(get().currentBranchId);
      });
    }
  },

  setBranch: (branchId: string) => {
    saveToStorage(STORAGE_KEYS.BRANCH_ID, branchId);
    set({ currentBranchId: branchId });
    socketService.joinBranch(branchId);
    socketService.joinPos(branchId);
    get().fetchBackendData(branchId);
  },

  /** Tải riêng danh sách bàn và đơn (nhẹ, nhanh, không tải lại menu/branches) */
  fetchTablesOnly: async (branchId: string) => {
    try {
      const tableRes = await apiClient.get(`/tables?branchId=${branchId}`).catch(() => null);
      if (tableRes?.success && Array.isArray(tableRes.data)) {
        const { tables, backendOrders } = mapRawTablesToState(branchId, tableRes.data);
        set((state) => ({
          tables,
          orders: backendOrders.length > 0 ? backendOrders : state.orders,
          isBackendConnected: true,
        }));
      }
    } catch (err) {
      console.warn('Lỗi fetchTablesOnly:', err);
    }
  },

  /** Debounce 300ms chống bão request khi nhiều sự kiện bàn/đơn đến dồn dập */
  debouncedFetchTables: (branchId: string) => {
    if (debounceTablesTimer) clearTimeout(debounceTablesTimer);
    debounceTablesTimer = setTimeout(() => {
      get().fetchTablesOnly(branchId);
    }, 300);
  },

  /** Tải toàn diện hệ thống khi mở app hoặc đổi chi nhánh */
  fetchBackendData: async (branchId: string) => {
    try {
      // 1. Tải chi nhánh
      const branchRes = await apiClient.get('/branches').catch(() => null);
      let branches = get().branches;
      if (branchRes?.success && Array.isArray(branchRes.data) && branchRes.data.length > 0) {
        branches = branchRes.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          city: b.city || 'TP.HCM',
          phone: b.phoneNumber || '028 3822 1234',
          isActive: b.isActive,
          totalTables: b._count?.tables || 10,
        }));
      }

      // 2. Tải sơ đồ bàn và đơn
      const tableRes = await apiClient.get(`/tables?branchId=${branchId}`).catch(() => null);
      let tables = get().tables;
      let backendOrders = get().orders;
      if (tableRes?.success && Array.isArray(tableRes.data)) {
        const mapped = mapRawTablesToState(branchId, tableRes.data);
        tables = mapped.tables;
        if (mapped.backendOrders.length > 0) {
          backendOrders = mapped.backendOrders;
        }
      }

      // 3. Tải thực đơn (Chỉ tải nếu chưa có để tối ưu mạng)
      let menuItems = get().menuItems;
      const menuRes = await apiClient.get('/menu').catch(() => null);
      if (menuRes?.success && Array.isArray(menuRes.data)) {
        menuItems = menuRes.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category?.id?.replace('cat-', '') || 'noodles',
          station: m.kitchenStationId || m.kitchenStation?.id || 'hot',
          price: Number(m.price),
          description: m.description || '',
          image: m.pictureLink || '',
          isAvailable: m.isAvailable,
          standardPrepMinutes: m.standardPrepMinutes || 15,
          bom: m.recipes ? m.recipes.map((r: any) => ({ ingredientId: r.ingredientId, quantity: Number(r.amountNeeded) })) : [],
          options: {
            spicyLevels: ['Không cay', 'Cay vừa', 'Cay nồng'],
            toppings: m.modifiers ? m.modifiers.flatMap((mg: any) => mg.modifierGroup?.items?.map((it: any) => ({
              name: it.name,
              price: Number(it.extraPrice),
            })) || []) : [],
          },
        }));
      }

      // 4. Chỉ tải tồn kho nếu là nhân viên
      let hasStaffToken = false;
      if (typeof window !== 'undefined') {
        try {
          hasStaffToken = !!localStorage.getItem('pos_kds_access_token');
        } catch {}
      }

      let ingredients = get().ingredients;
      let auditLogs = get().auditLogs;

      if (hasStaffToken) {
        const invRes = await apiClient.get(`/inventory?branchId=${branchId}`).catch(() => null);
        if (invRes?.success && Array.isArray(invRes.data)) {
          ingredients = invRes.data.map((inv: any) => ({
            id: inv.ingredientId,
            branchId: inv.branchId,
            name: inv.name,
            unit: inv.unit,
            stock: inv.currentStock,
            minThreshold: inv.minSafetyStock,
            costPrice: inv.costPrice,
            supplier: inv.supplier,
            lastRestockedAt: inv.lastRestockedAt,
          }));
        }

        const auditRes = await apiClient.get(`/inventory/audit-logs?branchId=${branchId}`).catch(() => null);
        if (auditRes?.success && Array.isArray(auditRes.data)) {
          auditLogs = auditRes.data.map((a: any) => ({
            id: a.id,
            branchId: a.branchId,
            ingredientId: a.ingredientId,
            ingredientName: a.ingredient?.name || '',
            amountDeducted: Number(a.amountDeducted),
            unit: a.ingredient?.baseUnit || 'g',
            remainingStock: Number(a.remainingStock),
            orderId: a.orderItemId || '',
            orderItemName: a.orderItem?.product?.name || '',
            reason: a.reason,
            createdAt: a.createdAt,
          }));
        }
      }

      set({
        currentBranchId: branchId,
        branches,
        tables,
        orders: backendOrders,
        menuItems,
        ingredients,
        auditLogs,
        isBackendConnected: true,
      });
    } catch (err) {
      console.warn('Không thể nạp dữ liệu từ backend, sử dụng state offline:', err);
    }
  },

  refreshBackend: async () => {
    await get().fetchBackendData(get().currentBranchId);
  },

  /** Cập nhật Delta in-memory ngay lập tức khi có đơn hàng mới (0ms lag cho Bếp KDS & POS) */
  handleOrderPlaced: (payload: any) => {
    if (!payload?.order) return;
    const rawOrder = payload.order;
    const tableId = payload.tableId || rawOrder.orderSession?.tableId;
    const tableNumber = payload.tableNumber || rawOrder.orderSession?.table?.tableNumber || '';
    const branchId = payload.branchId || rawOrder.orderSession?.branchId || get().currentBranchId;

    const mappedItems: OrderItem[] = (rawOrder.items || []).map((it: any, idx: number) => ({
      id: it.id || `item-${Date.now()}-${idx}`,
      menuItemId: it.productId || it.product?.id || '',
      name: it.product?.name || 'Món ăn',
      price: Number(it.price || 0),
      quantity: it.quantity || 1,
      station: (it.kitchenStationId || it.kitchenStation?.id || it.product?.kitchenStationId || 'hot').toLowerCase(),
      selectedSize: it.selectedSize || undefined,
      selectedSpicyLevel: it.selectedSpicyLevel || undefined,
      selectedToppings: it.selectedToppings || [],
      note: it.note || undefined,
      status: (it.status || 'PENDING').toLowerCase() as OrderItemStatus,
      orderedAt: it.createdAt || rawOrder.createdAt || new Date().toISOString(),
      startedCookingAt: it.startedAt || undefined,
      completedAt: it.completedAt || undefined,
      orderCode: rawOrder.orderCode || payload.orderCode || `ORD-${rawOrder.id.slice(-4)}`,
      batchIndex: 1,
    }));

    const subtotal = mappedItems.reduce((s, item) => s + item.price * item.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.08);

    const newOrder: Order = {
      id: rawOrder.id,
      orderCode: rawOrder.orderCode || payload.orderCode || `ORD-${rawOrder.id.slice(-4)}`,
      orderSessionId: rawOrder.orderSessionId || payload.orderSessionId || `session-${tableId}`,
      batchIndex: 1,
      branchId,
      tableId,
      tableNumber,
      items: mappedItems,
      status: 'in_progress',
      createdAt: rawOrder.createdAt || new Date().toISOString(),
      guestCount: payload.guestCount || 2,
      subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 8,
      taxAmount,
      finalAmount: subtotal + taxAmount,
    };

    set((state) => {
      const exists = state.orders.some((o) => o.id === newOrder.id);
      const updatedOrders = exists
        ? state.orders.map((o) => (o.id === newOrder.id ? newOrder : o))
        : [newOrder, ...state.orders];
      const updatedTables = state.tables.map((t) =>
        t.id === tableId || t.number === tableNumber
          ? { ...t, status: 'occupied' as const, activeOrderId: newOrder.id }
          : t
      );
      return { orders: updatedOrders, tables: updatedTables };
    });
  },

  /** Cập nhật Delta in-memory khi 1 món thay đổi trạng thái (0ms lag, không gọi API) */
  handleItemStatusUpdated: (updatedItem: any) => {
    if (!updatedItem?.id) return;
    const newStatus = (updatedItem.status || 'pending').toLowerCase() as OrderItemStatus;

    set((state) => {
      let changed = false;
      const updatedOrders = state.orders.map((order) => {
        const itemIdx = order.items.findIndex((i) => i.id === updatedItem.id);
        if (itemIdx === -1) return order;

        changed = true;
        const newItems = order.items.map((it) => {
          if (it.id !== updatedItem.id) return it;
          return {
            ...it,
            status: newStatus,
            startedCookingAt: updatedItem.startedAt || it.startedCookingAt,
            completedAt: updatedItem.completedAt || it.completedAt,
          };
        });

        const hasUnfinished = newItems.some(
          (it) => it.status === 'pending' || it.status === 'cooking'
        );
        const newOrderStatus: OrderStatus = hasUnfinished ? 'in_progress' : 'ready';

        return { ...order, items: newItems, status: newOrderStatus };
      });

      if (!changed) return state;
      return { orders: updatedOrders };
    });
  },

  /** Cập nhật Delta in-memory khi toàn bộ vé hoàn tất (Batch Socket, 0ms lag) */
  handleBatchItemsUpdated: (payload: any) => {
    if (!payload?.items || !Array.isArray(payload.items) || payload.items.length === 0) return;
    const itemMap = new Map<string, any>(payload.items.map((it: any) => [it.id, it]));

    set((state) => {
      const updatedOrders = state.orders.map((order) => {
        if (payload.orderId && order.id !== payload.orderId) {
          const hasAny = order.items.some((i) => itemMap.has(i.id));
          if (!hasAny) return order;
        }

        const newItems = order.items.map((it) => {
          const updated = itemMap.get(it.id);
          if (!updated) return it;
          return {
            ...it,
            status: (updated.status || 'ready').toLowerCase() as OrderItemStatus,
            startedCookingAt: updated.startedAt || it.startedCookingAt,
            completedAt: updated.completedAt || it.completedAt || new Date().toISOString(),
          };
        });

        const hasUnfinished = newItems.some(
          (it) => it.status === 'pending' || it.status === 'cooking'
        );
        const newOrderStatus: OrderStatus = hasUnfinished ? 'in_progress' : 'ready';

        return { ...order, items: newItems, status: newOrderStatus };
      });

      return { orders: updatedOrders };
    });
  },

  /** Xử lý khách gọi thanh toán tại bàn */
  handlePaymentRequested: (payload: any) => {
    set((state) => {
      const updatedTables = state.tables.map((t) =>
        t.id === payload.tableId ? { ...t, status: 'pending_payment' as const } : t
      );
      const newReq: PaymentRequest = {
        id: `payreq-${Date.now()}`,
        branchId: payload.branchId,
        tableId: payload.tableId,
        tableNumber: payload.tableNumber,
        requestedAt: new Date(payload.requestedAt || Date.now()).toISOString(),
        status: 'pending',
      };
      const exists = state.paymentRequests.some((r) => r.tableId === payload.tableId);
      return {
        tables: updatedTables,
        paymentRequests: exists ? state.paymentRequests : [newReq, ...state.paymentRequests],
      };
    });
  },

  /** Xử lý thanh toán thành công giải phóng bàn */
  handlePaymentCompleted: (payload: any) => {
    set((state) => {
      const updatedTables = state.tables.map((t) =>
        t.id === payload.tableId
          ? { ...t, status: 'available' as const, activeOrderId: undefined, seatedAt: undefined }
          : t
      );
      const updatedReqs = state.paymentRequests.filter((r) => r.tableId !== payload.tableId);
      const updatedOrders = state.orders.map((o) =>
        o.tableId === payload.tableId && o.status !== 'cancelled'
          ? { ...o, status: 'completed' as const, paidAt: new Date().toISOString() }
          : o
      );
      return {
        tables: updatedTables,
        paymentRequests: updatedReqs,
        orders: updatedOrders,
      };
    });
  },

  /** Đặt món mới (Khách hoặc POS) */
  placeOrder: async (payload) => {
    const table = get().tables.find((t) => t.id === payload.tableId || t.number === payload.tableId);
    if (!table) return null;

    const apiPayload = {
      tableId: table.id,
      guestCount: payload.guestCount || table.guestCount || 2,
      items: payload.items.map((i) => ({
        productId: i.menuItemId,
        quantity: i.quantity,
        note: i.note,
        modifierIds: [],
      })),
    };

    try {
      const res = await apiClient.post('/orders', apiPayload, {
        tableToken: payload.tableToken,
      });

      if (res.success && res.data) {
        get().handleOrderPlaced({
          branchId: table.branchId,
          tableId: table.id,
          tableNumber: table.number,
          orderId: res.data.id,
          orderCode: res.data.orderCode,
          order: res.data,
        });
        get().debouncedFetchTables(get().currentBranchId);
        return res.data;
      }
    } catch (err: any) {
      console.warn('Lỗi gọi API đặt món, chuyển sang fallback:', err.message);
    }

    // Fallback Offline
    const orderId = `ord-${Date.now()}`;
    const orderCode = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = payload.items.map((item, idx) => {
      const menu = get().menuItems.find((m) => m.id === item.menuItemId);
      return {
        id: `item-${Date.now()}-${idx}`,
        menuItemId: item.menuItemId,
        name: menu ? menu.name : 'Món ăn',
        price: menu ? menu.price : 0,
        quantity: item.quantity,
        station: menu ? menu.station : 'hot',
        selectedSize: item.selectedSize,
        selectedSpicyLevel: item.selectedSpicyLevel,
        selectedToppings: item.selectedToppings,
        note: item.note,
        status: 'pending',
        orderedAt: now,
      };
    });

    const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const finalAmount = subtotal + Math.round(subtotal * 0.08);

    const existingTableOrders = get().orders.filter(
      (o) => (o.tableId === table.id || o.tableNumber === table.number) && o.status !== 'completed' && o.status !== 'cancelled'
    );
    const batchIdx = existingTableOrders.length + 1;

    const newOrder: Order = {
      id: orderId,
      orderCode,
      orderSessionId: existingTableOrders[0]?.orderSessionId || `session-${table.id}`,
      batchIndex: batchIdx,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      items: orderItems.map((it) => ({ ...it, batchIndex: batchIdx, orderCode })),
      status: 'pending',
      createdAt: now,
      guestCount: payload.guestCount || 2,
      subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 8,
      taxAmount: Math.round(subtotal * 0.08),
      finalAmount,
    };

    const updatedTables = get().tables.map((t) =>
      t.id === table.id
        ? { ...t, status: 'occupied' as const, activeOrderId: orderId, seatedAt: t.seatedAt || now }
        : t
    );

    const updatedOrders = [...get().orders, newOrder];
    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);

    set({ tables: updatedTables, orders: updatedOrders });
    return newOrder;
  },

  /** Cập nhật trạng thái món ăn với Optimistic UI (0ms phản hồi trên màn hình) */
  updateOrderItemStatus: async (arg1: string, arg2: string, arg3?: OrderItemStatus) => {
    const itemId = arg3 !== undefined ? arg2 : arg1;
    const newStatus = (arg3 !== undefined ? arg3 : arg2) as OrderItemStatus;
    const now = new Date().toISOString();

    // 1. Optimistic Update ngay lập tức trên UI (0ms)
    set((state) => {
      const updatedOrders = state.orders.map((order) => {
        const itemIndex = order.items.findIndex((i) => i.id === itemId);
        if (itemIndex === -1) return order;

        const updatedItems = order.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            status: newStatus,
            startedCookingAt: newStatus === 'cooking' && !item.startedCookingAt ? now : item.startedCookingAt,
            completedAt: (newStatus === 'ready' || newStatus === 'served') && !item.completedAt ? now : item.completedAt,
          };
        });

        const hasUnfinished = updatedItems.some(
          (it) => it.status === 'pending' || it.status === 'cooking'
        );
        const orderStatus: OrderStatus = hasUnfinished ? 'in_progress' : 'ready';

        return { ...order, items: updatedItems, status: orderStatus };
      });

      return { orders: updatedOrders };
    });

    // 2. Gửi request ngầm lên Backend
    try {
      await apiClient.patch(`/orders/items/${itemId}/status`, {
        status: newStatus.toUpperCase(),
      });
    } catch (err: any) {
      console.warn('Lỗi gọi API cập nhật trạng thái món:', err.message);
      get().debouncedFetchTables(get().currentBranchId);
      if (err.message && err.message.includes('không đủ nguyên liệu')) {
        throw err;
      }
    }
  },

  /**
   * BẾP HOÀN TẤT TOÀN BỘ VÉ (BATCH KDS COMPLETE)
   * 1 Request duy nhất, 1 Transaction DB, Optimistic UI 0ms
   */
  completeOrderTicket: async (orderId: string, stationId?: string) => {
    const now = new Date().toISOString();

    // 1. Optimistic UI: Đổi trạng thái vé sang Xanh/Ready ngay tức thì (0ms)
    set((state) => {
      const updatedOrders = state.orders.map((order) => {
        if (order.id !== orderId) return order;
        const newItems = order.items.map((it) => {
          if (stationId && it.station !== stationId) return it;
          if (it.status === 'served' || it.status === 'cancelled') return it;
          return {
            ...it,
            status: 'ready' as OrderItemStatus,
            completedAt: now,
          };
        });

        const hasUnfinished = newItems.some(
          (it) => it.status === 'pending' || it.status === 'cooking'
        );
        const orderStatus: OrderStatus = hasUnfinished ? 'in_progress' : 'ready';

        return { ...order, items: newItems, status: orderStatus };
      });

      return { orders: updatedOrders };
    });

    // 2. Gửi duy nhất 1 Request Batch đến Backend
    try {
      const queryParam = stationId ? `?stationId=${stationId}` : '';
      const res = await apiClient.patch(`/orders/${orderId}/complete-all${queryParam}`, {});
      return res;
    } catch (err: any) {
      console.error('Lỗi khi hoàn tất toàn bộ vé:', err.message);
      // Rollback lại dữ liệu từ server nếu có lỗi kho
      get().fetchTablesOnly(get().currentBranchId);
      throw err;
    }
  },

  addItemsToOrder: async (tableIdOrOrderId: string, items: Array<{ menuItemId: string; quantity: number; note?: string }>) => {
    // 1. Kiểm tra nếu là tableId hoặc tableNumber
    const table = get().tables.find((t) => t.id === tableIdOrOrderId || t.number === tableIdOrOrderId);
    if (table) {
      return get().placeOrder({
        tableId: table.id,
        items,
      });
    }

    // 2. Nếu là orderId
    const existingOrder = get().orders.find((o) => o.id === tableIdOrOrderId);
    if (existingOrder) {
      return get().placeOrder({
        tableId: existingOrder.tableId,
        items,
      });
    }
  },

  changeOrMergeTable: async (fromTableId: string, toTableId: string, actionType: 'change' | 'merge') => {
    try {
      if (actionType === 'change') {
        await apiClient.post('/tables/transfer', { fromTableId, toTableId });
      } else {
        await apiClient.post('/tables/merge', { fromTableId, toTableId });
      }
      get().fetchTablesOnly(get().currentBranchId);
    } catch (err: any) {
      console.warn('Lỗi chuyển/gộp bàn từ backend:', err.message);
    }
  },

  requestPayment: async (tableId: string) => {
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return null;

    try {
      await apiClient.post(`/tables/${tableId}/request-payment`);
    } catch (err: any) {
      console.warn('Lỗi gửi request payment backend:', err.message);
    }

    const updatedTables = get().tables.map((t) =>
      t.id === tableId ? { ...t, status: 'pending_payment' as const } : t
    );

    const newRequest: PaymentRequest = {
      id: `payreq-${Date.now()}`,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };

    set({
      tables: updatedTables,
      paymentRequests: [newRequest, ...get().paymentRequests],
    });

    return newRequest;
  },

  clearPaymentRequest: (tableId: string) => {
    const updated = get().paymentRequests.filter((req) => req.tableId !== tableId);
    set({ paymentRequests: updated });
  },

  processPayment: async (
    tableId: string,
    paymentMethod: PaymentMethod,
    discountPercent: number = 0,
    cashGiven?: number
  ) => {
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return null;

    try {
      // 1. Tạo phiếu tạm tính
      const provRes = await apiClient.post('/invoices/provisional', {
        tableId,
        discountPercent,
      });

      if (provRes.success && provRes.data?.invoiceId) {
        // 2. Chốt hóa đơn thanh toán
        const methodUpper = paymentMethod.toUpperCase();
        const settleRes = await apiClient.post('/invoices/settle', {
          invoiceId: provRes.data.invoiceId,
          paymentMethod: methodUpper,
          cashGiven,
        });

        if (settleRes.success) {
          get().fetchTablesOnly(get().currentBranchId);
          get().clearPaymentRequest(tableId);
          return settleRes.data;
        }
      }
    } catch (err: any) {
      console.warn('Lỗi gọi API chốt thanh toán, chạy fallback:', err.message);
      if (err.message && err.message.includes('không đủ để thanh toán')) {
        throw err;
      }
    }

    // Fallback Offline
    const updatedTables = get().tables.map((t) =>
      t.id === table.id
        ? { ...t, status: 'available' as const, activeOrderId: undefined, seatedAt: undefined }
        : t
    );
    const updatedOrders = get().orders.map((o) =>
      (o.tableId === table.id || o.tableNumber === table.number) && o.status !== 'cancelled'
        ? { ...o, status: 'completed' as const, paidAt: new Date().toISOString() }
        : o
    );

    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    set({ tables: updatedTables, orders: updatedOrders });
    get().clearPaymentRequest(tableId);
    return null;
  },

  restockIngredient: async (ingredientId: string, amount: number, costPrice?: number) => {
    try {
      await apiClient.post('/inventory/restock', {
        branchId: get().currentBranchId,
        items: [{ ingredientId, quantity: amount, costPrice }],
        note: 'Nhập kho từ giao diện Quản trị',
      });
      get().fetchBackendData(get().currentBranchId);
    } catch (err: any) {
      console.warn('Lỗi restock backend:', err.message);
    }
  },

  updateMenuItemBOM: async (menuItemId: string, newBOM: MenuItem['bom']) => {
    try {
      await apiClient.put(`/bom/product/${menuItemId}`, {
        recipes: newBOM.map((b) => ({
          ingredientId: b.ingredientId,
          amountNeeded: b.quantity,
        })),
      });
      get().fetchBackendData(get().currentBranchId);
    } catch (err: any) {
      console.warn('Lỗi cập nhật BOM backend:', err.message);
    }
  },
}));

/**
 * Public Hook dùng cho toàn bộ Components và Pages
 * Đồng bộ với Zustand Singleton Store và cung cấp các hàm Selector tối ưu
 */
export function useLiveStore() {
  const store = useLiveStoreBase();

  useEffect(() => {
    store.init();
  }, [store]);

  const currentBranch = useMemo(
    () => store.branches.find((b) => b.id === store.currentBranchId) || store.branches[0],
    [store.branches, store.currentBranchId]
  );

  const currentBranchTables = useMemo(
    () => store.tables.filter((t) => t.branchId === store.currentBranchId),
    [store.tables, store.currentBranchId]
  );

  const currentBranchIngredients = useMemo(
    () => store.ingredients.filter((i) => i.branchId === store.currentBranchId),
    [store.ingredients, store.currentBranchId]
  );

  const currentBranchOrders = useMemo(
    () => store.orders.filter((o) => o.branchId === store.currentBranchId),
    [store.orders, store.currentBranchId]
  );

  const currentBranchAuditLogs = useMemo(
    () => store.auditLogs.filter((a) => a.branchId === store.currentBranchId),
    [store.auditLogs, store.currentBranchId]
  );

  const currentBranchPaymentRequests = useMemo(
    () => store.paymentRequests.filter((r) => r.branchId === store.currentBranchId),
    [store.paymentRequests, store.currentBranchId]
  );

  const lowStockCount = useMemo(
    () => currentBranchIngredients.filter((i) => i.stock <= i.minThreshold).length,
    [currentBranchIngredients]
  );

  const activeOrdersCount = useMemo(
    () => currentBranchOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length,
    [currentBranchOrders]
  );

  const getTableActiveOrders = useCallback(
    (tableIdOrNumber?: string): Order[] => {
      if (!tableIdOrNumber) return [];
      return store.orders.filter(
        (o) =>
          (o.tableId === tableIdOrNumber || o.tableNumber === tableIdOrNumber) &&
          o.status !== 'completed' &&
          o.status !== 'cancelled'
      );
    },
    [store.orders]
  );

  const getTableConsolidatedOrder = useCallback(
    (tableIdOrNumber?: string): Order | null => {
      if (!tableIdOrNumber) return null;
      const tableOrders = store.orders.filter(
        (o) =>
          (o.tableId === tableIdOrNumber || o.tableNumber === tableIdOrNumber) &&
          o.status !== 'completed' &&
          o.status !== 'cancelled'
      );

      if (tableOrders.length === 0) return null;

      const sortedOrders = [...tableOrders].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const allItems: OrderItem[] = [];
      sortedOrders.forEach((ord, ordIdx) => {
        ord.items.forEach((it) => {
          allItems.push({
            ...it,
            orderCode: it.orderCode || ord.orderCode,
            batchIndex: it.batchIndex || ordIdx + 1,
          });
        });
      });

      const subtotal = allItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const primaryOrder = sortedOrders[0];

      const hasUnfinished = allItems.some(
        (it) => it.status === 'pending' || it.status === 'cooking'
      );
      const overallStatus: OrderStatus = hasUnfinished ? 'in_progress' : 'ready';

      const discountPercent = primaryOrder.discountPercent || 0;
      const discountAmount = Math.round((subtotal * discountPercent) / 100);
      const taxable = subtotal - discountAmount;
      const calculatedTax = Math.round(taxable * 0.08);
      const finalAmount = taxable + calculatedTax;

      return {
        ...primaryOrder,
        id: primaryOrder.orderSessionId || primaryOrder.id,
        orderCode: sortedOrders.map((o) => o.orderCode).join(', '),
        items: allItems,
        status: overallStatus,
        createdAt: primaryOrder.createdAt,
        subtotal,
        discountPercent,
        discountAmount,
        taxPercent: 8,
        taxAmount: calculatedTax,
        finalAmount,
      };
    },
    [store.orders]
  );

  return {
    ...store,
    currentBranch,
    currentBranchTables,
    currentBranchIngredients,
    currentBranchOrders,
    currentBranchAuditLogs,
    currentBranchPaymentRequests,
    lowStockCount,
    activeOrdersCount,
    getTableActiveOrders,
    getTableConsolidatedOrder,
  };
}
