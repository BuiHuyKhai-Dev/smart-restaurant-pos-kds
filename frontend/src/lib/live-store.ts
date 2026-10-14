'use client';

import { useState, useEffect, useCallback } from 'react';
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

export interface SystemState {
  currentBranchId: string;
  branches: Branch[];
  tables: RestaurantTable[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  orders: Order[];
  auditLogs: InventoryAuditLog[];
  paymentRequests: PaymentRequest[];
  isBackendConnected: boolean;
}

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
    window.dispatchEvent(new Event('pos_kds_state_updated'));
  } catch (e) {
    console.error('Lỗi lưu trữ state:', e);
  }
}

export function useLiveStore() {
  const [state, setState] = useState<SystemState>({
    currentBranchId: 'branch-1',
    branches: INITIAL_BRANCHES,
    tables: INITIAL_TABLES,
    menuItems: INITIAL_MENU_ITEMS,
    ingredients: INITIAL_INGREDIENTS,
    orders: INITIAL_ORDERS,
    auditLogs: [],
    paymentRequests: [],
    isBackendConnected: false,
  });

  // Tải dữ liệu từ Backend API hoặc fallback sang LocalStorage
  const fetchBackendData = useCallback(async (branchId: string) => {
    try {
      // 1. Tải danh sách chi nhánh
      const branchRes = await apiClient.get('/branches').catch(() => null);
      let branches = INITIAL_BRANCHES;
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

      // 2. Tải sơ đồ bàn theo chi nhánh và đồng bộ toàn bộ đơn hàng đang chạy
      const tableRes = await apiClient.get(`/tables?branchId=${branchId}`).catch(() => null);
      let tables = INITIAL_TABLES;
      let backendOrders: Order[] = [];

      if (tableRes?.success && Array.isArray(tableRes.data)) {
        tables = tableRes.data.map((t: any) => {
          const activeSession = t.orderSessions?.[0];
          const statusLower = t.status.toLowerCase() as TableStatus;

          // Trích xuất orders từ session của bàn này
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
      }

      // 3. Tải thực đơn món ăn
      const menuRes = await apiClient.get('/menu').catch(() => null);
      let menuItems = INITIAL_MENU_ITEMS;
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

      // 4. Chỉ tải tồn kho và nhật ký kho nếu là tài khoản nhân viên (đã đăng nhập)
      let hasStaffToken = false;
      if (typeof window !== 'undefined') {
        try {
          hasStaffToken = !!localStorage.getItem('pos_kds_access_token');
        } catch {}
      }

      let ingredients = INITIAL_INGREDIENTS;
      let auditLogs: InventoryAuditLog[] = [];

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

      setState((prev) => ({
        ...prev,
        currentBranchId: branchId,
        branches,
        tables,
        orders: backendOrders.length > 0 ? backendOrders : prev.orders,
        menuItems,
        ingredients,
        auditLogs,
        isBackendConnected: true,
      }));
    } catch (err) {
      console.warn('Không thể nạp dữ liệu từ backend, sử dụng state offline:', err);
    }
  }, []);

  // Khởi tạo state ban đầu
  useEffect(() => {
    const storedBranchId = getStoredOrInitial<string>(STORAGE_KEYS.BRANCH_ID, 'branch-1');
    fetchBackendData(storedBranchId);

    // Kết nối WebSocket Realtime
    const socket = socketService.getSocket();
    socketService.joinBranch(storedBranchId);
    socketService.joinPos(storedBranchId);

    // Lắng nghe sự kiện Realtime từ Backend
    const handleOrderPlaced = (data: any) => {
      console.log('⚡ Socket [order:placed]:', data);
      fetchBackendData(storedBranchId);
    };

    const handleKitchenNewItems = (payload: any) => {
      console.log('⚡ Socket [kitchen:new_items]:', payload);
      fetchBackendData(storedBranchId);
    };

    const handleItemStatusUpdated = (item: any) => {
      console.log('⚡ Socket [order_item:status_updated]:', item);
      fetchBackendData(storedBranchId);
    };

    const handlePaymentRequested = (payload: any) => {
      console.log('⚡ Socket [payment:requested]:', payload);
      setState((prev) => {
        const updatedTables = prev.tables.map((t) =>
          t.id === payload.tableId ? { ...t, status: 'pending_payment' as const } : t
        );
        const newReq: PaymentRequest = {
          id: `payreq-${Date.now()}`,
          branchId: payload.branchId,
          tableId: payload.tableId,
          tableNumber: payload.tableNumber,
          requestedAt: new Date(payload.requestedAt).toISOString(),
          status: 'pending',
        };
        const exists = prev.paymentRequests.some((r) => r.tableId === payload.tableId);
        return {
          ...prev,
          tables: updatedTables,
          paymentRequests: exists ? prev.paymentRequests : [newReq, ...prev.paymentRequests],
        };
      });
      fetchBackendData(storedBranchId);
    };

    const handlePaymentCompleted = (payload: any) => {
      console.log('⚡ Socket [payment:completed]:', payload);
      setState((prev) => {
        const updatedTables = prev.tables.map((t) =>
          t.id === payload.tableId ? { ...t, status: 'available' as const, activeOrderId: undefined, seatedAt: undefined } : t
        );
        const updatedReqs = prev.paymentRequests.filter((r) => r.tableId !== payload.tableId);
        return { ...prev, tables: updatedTables, paymentRequests: updatedReqs };
      });
      fetchBackendData(storedBranchId);
    };

    const handleTableUpdated = (payload: any) => {
      console.log('⚡ Socket [table:updated]:', payload);
      fetchBackendData(storedBranchId);
    };

    socket.on('order:placed', handleOrderPlaced);
    socket.on('kitchen:new_items', handleKitchenNewItems);
    socket.on('order_item:status_updated', handleItemStatusUpdated);
    socket.on('payment:requested', handlePaymentRequested);
    socket.on('payment:completed', handlePaymentCompleted);
    socket.on('table:updated', handleTableUpdated);

    return () => {
      socket.off('order:placed', handleOrderPlaced);
      socket.off('kitchen:new_items', handleKitchenNewItems);
      socket.off('order_item:status_updated', handleItemStatusUpdated);
      socket.off('payment:requested', handlePaymentRequested);
      socket.off('payment:completed', handlePaymentCompleted);
    };
  }, [fetchBackendData]);

  // --- ACTIONS ---

  // Đổi Chi nhánh
  const setBranch = (branchId: string) => {
    saveToStorage(STORAGE_KEYS.BRANCH_ID, branchId);
    setState((prev) => ({ ...prev, currentBranchId: branchId }));
    socketService.joinBranch(branchId);
    socketService.joinPos(branchId);
    fetchBackendData(branchId);
  };

  // Khách hoặc POS đặt món
  const placeOrder = async (payload: {
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
  }) => {
    const table = state.tables.find((t) => t.id === payload.tableId);
    if (!table) return null;

    // Chuẩn bị payload gửi lên Backend REST API
    const apiPayload = {
      tableId: payload.tableId,
      guestCount: payload.guestCount || 2,
      items: payload.items.map((i) => ({
        productId: i.menuItemId,
        quantity: i.quantity,
        note: i.note,
        modifierIds: [], // Sẽ map modifier nếu có
      })),
    };

    try {
      const res = await apiClient.post('/orders', apiPayload, {
        tableToken: payload.tableToken,
      });

      if (res.success && res.data) {
        // Tải lại bàn để cập nhật trạng thái mới nhất từ server
        fetchBackendData(state.currentBranchId);
        return res.data;
      }
    } catch (err: any) {
      console.warn('Lỗi gọi API đặt món, chuyển sang fallback:', err.message);
    }

    // Fallback Local
    const orderId = `ord-${Date.now()}`;
    const orderCode = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = payload.items.map((item, idx) => {
      const menu = state.menuItems.find((m) => m.id === item.menuItemId);
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

    const newOrder: Order = {
      id: orderId,
      orderCode,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      items: orderItems,
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

    const existingTableOrders = state.orders.filter(
      (o) => (o.tableId === table.id || o.tableNumber === table.number) && o.status !== 'completed' && o.status !== 'cancelled'
    );
    const batchIdx = existingTableOrders.length + 1;
    newOrder.batchIndex = batchIdx;
    newOrder.orderSessionId = existingTableOrders[0]?.orderSessionId || `session-${table.id}`;
    newOrder.items.forEach((it) => {
      it.batchIndex = batchIdx;
      it.orderCode = newOrder.orderCode;
    });

    const updatedTables = state.tables.map((t) =>
      t.id === table.id
        ? { ...t, status: 'occupied' as const, activeOrderId: orderId, seatedAt: t.seatedAt || now }
        : t
    );

    const updatedOrders = [...state.orders, newOrder];
    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);

    setState((prev) => ({
      ...prev,
      tables: updatedTables,
      orders: updatedOrders,
    }));

    return newOrder;
  };

  // KDS: Đổi trạng thái món ăn (Hỗ trợ linh hoạt cả 2 lẫn 3 tham số)
  const updateOrderItemStatus = async (
    arg1: string,
    arg2: string,
    arg3?: OrderItemStatus
  ) => {
    const itemId = arg3 !== undefined ? arg2 : arg1;
    const newStatus = (arg3 !== undefined ? arg3 : arg2) as OrderItemStatus;

    try {
      await apiClient.patch(`/orders/items/${itemId}/status`, {
        status: newStatus.toUpperCase(),
      });
    } catch (err: any) {
      console.warn('Lỗi gọi API cập nhật trạng thái món:', err.message);
      // Ném lỗi ra để modal/UI thông báo nếu là lỗi "Kho không đủ nguyên liệu"
      if (err.message && err.message.includes('không đủ nguyên liệu')) {
        throw err;
      }
    }

    // Cập nhật Optimistic trên giao diện
    const now = new Date().toISOString();
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

      return { ...order, items: updatedItems };
    });

    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    setState((prev) => ({ ...prev, orders: updatedOrders }));
  };

  // Gọi thêm món vào đơn có sẵn
  const addItemsToOrder = async (orderId: string, items: Array<{ menuItemId: string; quantity: number; note?: string }>) => {
    const existingOrder = state.orders.find((o) => o.id === orderId);
    if (!existingOrder) return;
    await placeOrder({
      tableId: existingOrder.tableId,
      items,
    });
  };

  // Thu ngân POS: Chuyển bàn / Gộp bàn
  const changeOrMergeTable = async (fromTableId: string, toTableId: string, actionType: 'change' | 'merge') => {
    try {
      if (actionType === 'change') {
        await apiClient.post('/tables/transfer', { fromTableId, toTableId });
      } else {
        await apiClient.post('/tables/merge', { fromTableId, toTableId });
      }
      fetchBackendData(state.currentBranchId);
      return;
    } catch (err: any) {
      console.warn('Lỗi chuyển/gộp bàn từ backend, chạy fallback:', err.message);
    }
  };

  // Khách hàng: gửi yêu cầu thanh toán tới thu ngân
  const requestPayment = async (tableId: string) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return null;

    try {
      await apiClient.post(`/tables/${tableId}/request-payment`);
    } catch (err: any) {
      console.warn('Lỗi gửi request payment backend:', err.message);
    }

    const updatedTables = state.tables.map((t) =>
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

    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    setState((prev) => ({
      ...prev,
      tables: updatedTables,
      paymentRequests: [newRequest, ...prev.paymentRequests],
    }));

    return newRequest;
  };

  const clearPaymentRequest = (tableId: string) => {
    const updatedPaymentRequests = state.paymentRequests.filter((req) => req.tableId !== tableId);
    saveToStorage(STORAGE_KEYS.PAYMENT_REQUESTS, updatedPaymentRequests);
    setState((prev) => ({
      ...prev,
      paymentRequests: updatedPaymentRequests,
    }));
  };

  // Thu ngân POS: Xử lý thanh toán & Chốt hóa đơn
  const processPayment = async (
    tableId: string,
    paymentMethod: PaymentMethod,
    discountPercent: number = 0,
    cashGiven?: number
  ) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return null;

    try {
      // 1. Tạo/In hóa đơn tạm tính trên Backend
      const provRes = await apiClient.post('/invoices/provisional', {
        tableId,
        discountPercent,
      });

      if (provRes.success && provRes.data?.invoiceId) {
        // 2. Chốt thanh toán hóa đơn
        const methodUpper = paymentMethod.toUpperCase();
        const settleRes = await apiClient.post('/invoices/settle', {
          invoiceId: provRes.data.invoiceId,
          paymentMethod: methodUpper,
          cashGiven,
        });

        if (settleRes.success) {
          fetchBackendData(state.currentBranchId);
          clearPaymentRequest(tableId);
          return settleRes.data;
        }
      }
    } catch (err: any) {
      console.warn('Lỗi gọi API chốt thanh toán, chạy fallback:', err.message);
      if (err.message && err.message.includes('không đủ để thanh toán')) {
        throw err;
      }
    }

    // Fallback offline
    const updatedTables = state.tables.map((t) =>
      t.id === table.id
        ? { ...t, status: 'available' as const, activeOrderId: undefined, seatedAt: undefined }
        : t
    );
    const updatedOrders = state.orders.map((o) =>
      (o.tableId === table.id || o.tableNumber === table.number) && o.status !== 'cancelled'
        ? { ...o, status: 'completed' as const, paidAt: new Date().toISOString() }
        : o
    );
    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    setState((prev) => ({ ...prev, tables: updatedTables, orders: updatedOrders }));
    clearPaymentRequest(tableId);
    return null;
  };

  // Quản lý kho: Nhập thêm nguyên liệu
  const restockIngredient = async (ingredientId: string, amount: number, costPrice?: number) => {
    try {
      await apiClient.post('/inventory/restock', {
        branchId: state.currentBranchId,
        items: [{ ingredientId, quantity: amount, costPrice }],
        note: 'Nhập kho từ giao diện Quản trị',
      });
      fetchBackendData(state.currentBranchId);
      return;
    } catch (err: any) {
      console.warn('Lỗi restock backend:', err.message);
    }
  };

  // Cập nhật công thức BOM của món ăn
  const updateMenuItemBOM = async (menuItemId: string, newBOM: MenuItem['bom']) => {
    try {
      await apiClient.put(`/bom/product/${menuItemId}`, {
        recipes: newBOM.map((b) => ({
          ingredientId: b.ingredientId,
          amountNeeded: b.quantity,
        })),
      });
      fetchBackendData(state.currentBranchId);
      return;
    } catch (err: any) {
      console.warn('Lỗi cập nhật BOM backend:', err.message);
    }
  };

  /** Lấy toàn bộ các đợt gọi món đang hoạt động của 1 bàn */
  const getTableActiveOrders = useCallback(
    (tableIdOrNumber?: string): Order[] => {
      if (!tableIdOrNumber) return [];
      return state.orders.filter(
        (o) =>
          (o.tableId === tableIdOrNumber || o.tableNumber === tableIdOrNumber) &&
          o.status !== 'completed' &&
          o.status !== 'cancelled'
      );
    },
    [state.orders]
  );

  /**
   * TỔNG HỢP TOÀN BỘ CÁC ĐỢT GỌI MÓN (SESSION ORDERS CONSOLIDATION)
   * Gom toàn bộ món ăn từ Đợt 1, Đợt 2, Đợt 3... của phiên ăn bàn này
   * Tính toán lại chính xác tổng phụ, chiết khấu, VAT và tổng thanh toán của cả bàn.
   */
  const getTableConsolidatedOrder = useCallback(
    (tableIdOrNumber?: string): Order | null => {
      if (!tableIdOrNumber) return null;
      const tableOrders = state.orders.filter(
        (o) =>
          (o.tableId === tableIdOrNumber || o.tableNumber === tableIdOrNumber) &&
          o.status !== 'completed' &&
          o.status !== 'cancelled'
      );

      if (tableOrders.length === 0) return null;

      // Sắp xếp các đợt gọi món theo thời gian tăng dần
      const sortedOrders = [...tableOrders].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Gom toàn bộ món ăn từ các đợt
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

      // Đánh giá trạng thái chung của phiên
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
    [state.orders]
  );

  // Dữ liệu lọc theo chi nhánh hiện tại
  const currentBranch = state.branches.find((b) => b.id === state.currentBranchId) || state.branches[0];
  const currentBranchTables = state.tables.filter((t) => t.branchId === state.currentBranchId);
  const currentBranchIngredients = state.ingredients.filter((i) => i.branchId === state.currentBranchId);
  const currentBranchOrders = state.orders.filter((o) => o.branchId === state.currentBranchId);
  const currentBranchAuditLogs = state.auditLogs.filter((a) => a.branchId === state.currentBranchId);
  const currentBranchPaymentRequests = state.paymentRequests.filter((r) => r.branchId === state.currentBranchId);

  const lowStockCount = currentBranchIngredients.filter((i) => i.stock <= i.minThreshold).length;
  const activeOrdersCount = currentBranchOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length;

  return {
    ...state,
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
    // Actions
    setBranch,
    placeOrder,
    updateOrderItemStatus,
    addItemsToOrder,
    changeOrMergeTable,
    requestPayment,
    clearPaymentRequest,
    processPayment,
    restockIngredient,
    updateMenuItemBOM,
    refreshBackend: () => fetchBackendData(state.currentBranchId),
  };
}
