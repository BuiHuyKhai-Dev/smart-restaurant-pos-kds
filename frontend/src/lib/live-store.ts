'use client';

import { useState, useEffect } from 'react';
import {
  Branch,
  RestaurantTable,
  MenuItem,
  Ingredient,
  InventoryAuditLog,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentRequest,
} from './types';
import {
  INITIAL_BRANCHES,
  INITIAL_TABLES,
  INITIAL_MENU_ITEMS,
  INITIAL_INGREDIENTS,
  INITIAL_ORDERS,
} from './mock-data';

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

// Khởi tạo State Store dùng LocalStorage để đồng bộ Realtime giữa các tab trình duyệt
export interface SystemState {
  currentBranchId: string;
  branches: Branch[];
  tables: RestaurantTable[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  orders: Order[];
  auditLogs: InventoryAuditLog[];
  paymentRequests: PaymentRequest[];
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
    // Phát event đồng bộ cho các tab khác và nội bộ tab hiện tại
    window.dispatchEvent(new Event('pos_kds_state_updated'));
  } catch (e) {
    console.error('Lỗi lưu trữ state:', e);
  }
}

function mergeSeedData<T extends { id: string }>(stored: T[] | undefined, fallback: T[]): T[] {
  if (!Array.isArray(stored)) return fallback;

  const mergedMap = new Map<string, T>();
  [...fallback, ...stored].forEach((item) => {
    mergedMap.set(item.id, item);
  });

  return Array.from(mergedMap.values());
}

function shouldResetLegacyState<T extends { id: string }>(stored: T[] | undefined, fallback: T[]): boolean {
  if (!Array.isArray(stored)) return false;
  if (stored.length === 0) return false;
  return stored.length < fallback.length;
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
  });

  // Tải dữ liệu từ LocalStorage khi mount và lắng nghe thay đổi Realtime
  useEffect(() => {
    const loadState = () => {
      const storedBranchId = getStoredOrInitial<string | null>(STORAGE_KEYS.BRANCH_ID, 'branch-1') ?? 'branch-1';
      const storedBranches = getStoredOrInitial(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
      const storedTables = getStoredOrInitial(STORAGE_KEYS.TABLES, INITIAL_TABLES);
      const storedIngredients = getStoredOrInitial(STORAGE_KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
      const storedOrders = getStoredOrInitial(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

      const shouldReset =
        shouldResetLegacyState(storedBranches, INITIAL_BRANCHES) ||
        shouldResetLegacyState(storedTables, INITIAL_TABLES) ||
        shouldResetLegacyState(storedIngredients, INITIAL_INGREDIENTS) ||
        shouldResetLegacyState(storedOrders, INITIAL_ORDERS);

      if (shouldReset && typeof window !== 'undefined') {
        Object.entries(STORAGE_KEYS).forEach(([_, key]) => {
          if (key !== STORAGE_KEYS.BRANCH_ID) {
            localStorage.removeItem(key);
          }
        });
      }

      const loadedBranches = mergeSeedData(getStoredOrInitial(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES), INITIAL_BRANCHES);
      const currentBranchId = loadedBranches.some((branch) => branch.id === storedBranchId)
        ? storedBranchId
        : loadedBranches[0]?.id || 'branch-1';

      setState({
        currentBranchId,
        branches: loadedBranches,
        tables: mergeSeedData(getStoredOrInitial(STORAGE_KEYS.TABLES, INITIAL_TABLES), INITIAL_TABLES),
        menuItems: getStoredOrInitial(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS),
        ingredients: mergeSeedData(getStoredOrInitial(STORAGE_KEYS.INGREDIENTS, INITIAL_INGREDIENTS), INITIAL_INGREDIENTS),
        orders: mergeSeedData(getStoredOrInitial(STORAGE_KEYS.ORDERS, INITIAL_ORDERS), INITIAL_ORDERS),
        auditLogs: getStoredOrInitial(STORAGE_KEYS.AUDIT_LOGS, []),
        paymentRequests: getStoredOrInitial(STORAGE_KEYS.PAYMENT_REQUESTS, []),
      });
    };

    loadState();

    const handleStorageChange = () => {
      loadState();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pos_kds_state_updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pos_kds_state_updated', handleStorageChange);
    };
  }, []);

  // --- ACTIONS ---

  // Điểm mới 5: Đổi Chi nhánh
  const setBranch = (branchId: string) => {
    saveToStorage(STORAGE_KEYS.BRANCH_ID, branchId);
    setState((prev) => ({ ...prev, currentBranchId: branchId }));
  };

  // Điểm mới 1: Khách đặt món qua QR -> Tự động chuyển thẳng vào KDS & POS
  const placeOrder = (payload: {
    tableId: string;
    guestCount?: number;
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

    const orderId = `ord-${Date.now()}`;
    const orderCode = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = payload.items.map((item, idx) => {
      const menu = state.menuItems.find((m) => m.id === item.menuItemId);
      let itemPrice = menu ? menu.price : 0;
      if (item.selectedSize && menu?.options?.sizes) {
        const sizeOpt = menu.options.sizes.find((s) => s.name === item.selectedSize);
        if (sizeOpt) itemPrice += sizeOpt.extraPrice;
      }
      if (item.selectedToppings && menu?.options?.toppings) {
        item.selectedToppings.forEach((topName) => {
          const topOpt = menu.options?.toppings?.find((t) => t.name === topName);
          if (topOpt) itemPrice += topOpt.price;
        });
      }

      return {
        id: `item-${Date.now()}-${idx}`,
        menuItemId: item.menuItemId,
        name: menu ? menu.name : 'Món ăn',
        price: itemPrice,
        quantity: item.quantity,
        station: menu ? menu.station : 'hot', // Phân loại theo trạm bếp (Điểm mới 2)
        selectedSize: item.selectedSize,
        selectedSpicyLevel: item.selectedSpicyLevel,
        selectedToppings: item.selectedToppings,
        note: item.note,
        status: 'pending',
        orderedAt: now,
      };
    });

    const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.08); // 8% VAT
    const finalAmount = subtotal + taxAmount;

    const newOrder: Order = {
      id: orderId,
      orderCode,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      items: orderItems,
      status: 'pending',
      createdAt: now,
      guestCount: payload.guestCount || table.guestCount || 2,
      subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 8,
      taxAmount,
      finalAmount,
    };

    // Cập nhật trạng thái bàn sang occupied
    const updatedTables = state.tables.map((t) =>
      t.id === table.id
        ? {
            ...t,
            status: 'occupied' as const,
            activeOrderId: orderId,
            guestCount: newOrder.guestCount,
            seatedAt: t.seatedAt || now,
          }
        : t
    );

    const updatedOrders = [newOrder, ...state.orders];

    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);

    setState((prev) => ({
      ...prev,
      tables: updatedTables,
      orders: updatedOrders,
    }));

    return newOrder;
  };

  // Điểm mới 2 & 3: Cập nhật trạng thái từng món trong KDS (Bếp nhận đơn -> Nấu -> Xong)
  const updateOrderItemStatus = (orderId: string, orderItemId: string, newStatus: OrderItem['status']) => {
    const orderToUpdate = state.orders.find((o) => o.id === orderId);
    if (!orderToUpdate) return;

    let completedItem: OrderItem | undefined;

    const updatedItems = orderToUpdate.items.map((item) => {
      if (item.id === orderItemId) {
        const updated = {
          ...item,
          status: newStatus,
          startedCookingAt: newStatus === 'cooking' ? new Date().toISOString() : item.startedCookingAt,
          completedAt: newStatus === 'ready' || newStatus === 'served' ? new Date().toISOString() : item.completedAt,
        };
        if (newStatus === 'ready' && item.status !== 'ready' && item.status !== 'served') {
          completedItem = updated;
        }
        return updated;
      }
      return item;
    });

    // Tính trạng thái chung của đơn
    const allReadyOrServed = updatedItems.every((it) => it.status === 'ready' || it.status === 'served');
    const anyCooking = updatedItems.some((it) => it.status === 'cooking' || it.status === 'ready');

    let newOrderStatus: Order['status'] = orderToUpdate.status;
    if (allReadyOrServed) {
      newOrderStatus = 'ready';
    } else if (anyCooking) {
      newOrderStatus = 'in_progress';
    }

    const updatedOrder = {
      ...orderToUpdate,
      items: updatedItems,
      status: newOrderStatus,
    };

    const updatedOrders = state.orders.map((o) => (o.id === orderId ? updatedOrder : o));
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);

    // Khi bếp hoàn thành món, đơn hàng KHÔNG được xóa hoặc mất khỏi state.
    // Chỉ cập nhật kho và giữ nguyên thông tin order cho đến khi thanh toán.
    if (completedItem) {
      deductBOMIngredients(completedItem, orderId, updatedOrder);
    } else {
      setState((prev) => ({ ...prev, orders: updatedOrders }));
    }
  };

  // Điểm mới 4: Tự động trừ tồn kho theo công thức BOM (Bill of Materials)
  const deductBOMIngredients = (item: OrderItem, orderId: string, updatedOrder?: Order) => {
    const menuItem = state.menuItems.find((m) => m.id === item.menuItemId);
    if (!menuItem || !menuItem.bom || menuItem.bom.length === 0) return;

    const newLogs: InventoryAuditLog[] = [];
    const updatedIngredients = state.ingredients.map((ing) => {
      // Tìm nguyên liệu này có trong BOM của món hay không
      const bomEntry = menuItem.bom.find((b) => b.ingredientId === ing.id);
      if (bomEntry) {
        const totalDeduct = bomEntry.quantity * item.quantity;
        const remainingStock = Math.max(0, ing.stock - totalDeduct);

        newLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          branchId: ing.branchId,
          ingredientId: ing.id,
          ingredientName: ing.name,
          amountDeducted: totalDeduct,
          unit: ing.unit,
          remainingStock,
          orderId,
          orderItemName: `${item.name} (x${item.quantity})`,
          reason: `Trừ tự động khi Bếp KDS hoàn thành món (Định lượng: ${bomEntry.quantity}${ing.unit}/suất)`,
          createdAt: new Date().toISOString(),
        });

        return {
          ...ing,
          stock: remainingStock,
        };
      }
      return ing;
    });

    const updatedAuditLogs = [...newLogs, ...state.auditLogs];

    saveToStorage(STORAGE_KEYS.INGREDIENTS, updatedIngredients);
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, updatedAuditLogs);

    setState((prev) => ({
      ...prev,
      orders: updatedOrder ? prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)) : prev.orders,
      ingredients: updatedIngredients,
      auditLogs: updatedAuditLogs,
    }));
  };

  // Thu ngân POS: Gọi thêm món trực tiếp tại quầy
  const addItemsToOrder = (tableId: string, itemsToAdd: Array<{ menuItemId: string; quantity: number }>) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return;

    const existingOrder = state.orders.find((o) => o.id === table.activeOrderId);
    if (!existingOrder) {
      // Chưa có đơn thì tạo mới
      placeOrder({ tableId, items: itemsToAdd });
      return;
    }

    const now = new Date().toISOString();
    const newItems: OrderItem[] = itemsToAdd.map((it, idx) => {
      const menu = state.menuItems.find((m) => m.id === it.menuItemId);
      return {
        id: `item-added-${Date.now()}-${idx}`,
        menuItemId: it.menuItemId,
        name: menu ? menu.name : 'Món gọi thêm',
        price: menu ? menu.price : 0,
        quantity: it.quantity,
        station: menu ? menu.station : 'hot',
        status: 'pending',
        orderedAt: now,
      };
    });

    const mergedItems = [...existingOrder.items, ...newItems];
    const subtotal = mergedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.08);
    const discountAmount = Math.round((subtotal * (existingOrder.discountPercent || 0)) / 100);
    const finalAmount = subtotal - discountAmount + taxAmount;

    const updatedOrder: Order = {
      ...existingOrder,
      items: mergedItems,
      subtotal,
      discountAmount,
      taxAmount,
      finalAmount,
      status: 'in_progress',
    };

    const updatedOrders = state.orders.map((o) => (o.id === existingOrder!.id ? updatedOrder : o));
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    setState((prev) => ({ ...prev, orders: updatedOrders }));
  };

  // Thu ngân POS: Chuyển bàn / Gộp bàn
  const changeOrMergeTable = (fromTableId: string, toTableId: string, actionType: 'change' | 'merge') => {
    const fromTable = state.tables.find((t) => t.id === fromTableId);
    const toTable = state.tables.find((t) => t.id === toTableId);
    if (!fromTable || !toTable) return;

    const fromOrder = state.orders.find((o) => o.id === fromTable.activeOrderId);

    if (actionType === 'change') {
      // Chuyển toàn bộ đơn sang bàn đích
      if (fromOrder) {
        const updatedOrder: Order = {
          ...fromOrder,
          tableId: toTable.id,
          tableNumber: toTable.number,
        };
        const updatedOrders = state.orders.map((o) => (o.id === fromOrder.id ? updatedOrder : o));
        saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
      }

      const updatedTables = state.tables.map((t) => {
        if (t.id === fromTable.id) {
          return { ...t, status: 'available' as const, activeOrderId: undefined, guestCount: undefined, seatedAt: undefined };
        }
        if (t.id === toTable.id) {
          return {
            ...t,
            status: 'occupied' as const,
            activeOrderId: fromTable.activeOrderId,
            guestCount: fromTable.guestCount,
            seatedAt: fromTable.seatedAt,
          };
        }
        return t;
      });

      saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
      setState((prev) => ({ ...prev, tables: updatedTables }));
    } else {
      // Gộp bàn: Chuyển các món từ fromOrder vào toOrder nếu toOrder có sẵn
      const toOrder = state.orders.find((o) => o.id === toTable.activeOrderId);
      if (fromOrder && toOrder) {
        const combinedItems = [...toOrder.items, ...fromOrder.items];
        const subtotal = combinedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const taxAmount = Math.round(subtotal * 0.08);
        const finalAmount = subtotal + taxAmount;

        const updatedToOrder: Order = {
          ...toOrder,
          items: combinedItems,
          subtotal,
          taxAmount,
          finalAmount,
        };

        const updatedOrders = state.orders
          .filter((o) => o.id !== fromOrder.id)
          .map((o) => (o.id === toOrder.id ? updatedToOrder : o));

        const updatedTables = state.tables.map((t) => {
          if (t.id === fromTable.id) {
            return { ...t, status: 'available' as const, activeOrderId: undefined };
          }
          return t;
        });

        saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
        saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
        setState((prev) => ({ ...prev, orders: updatedOrders, tables: updatedTables }));
      }
    }
  };

  // Khách hàng: gửi yêu cầu thanh toán tới thu ngân
  const requestPayment = (tableId: string) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return null;

    const updatedTables = state.tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'pending_payment' as const,
          }
        : t
    );

    const existingRequest = state.paymentRequests.find((req) => req.tableId === tableId);
    const newRequest: PaymentRequest = {
      id: `payreq-${Date.now()}`,
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      requestedAt: new Date().toISOString(),
      orderId: table.activeOrderId,
      status: 'pending',
    };

    const updatedPaymentRequests = existingRequest
      ? state.paymentRequests.map((req) => (req.tableId === tableId ? { ...req, ...newRequest, id: req.id } : req))
      : [newRequest, ...state.paymentRequests];

    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.PAYMENT_REQUESTS, updatedPaymentRequests);

    setState((prev) => ({
      ...prev,
      tables: updatedTables,
      paymentRequests: updatedPaymentRequests,
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

  // Thu ngân POS: Xử lý thanh toán & Chốt đơn
  const processPayment = (
    tableId: string,
    paymentMethod: PaymentMethod,
    discountPercent: number = 0,
    cashGiven?: number
  ) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table || !table.activeOrderId) return null;

    const order = state.orders.find((o) => o.id === table.activeOrderId);
    if (!order) return null;

    const subtotal = order.subtotal;
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = Math.round(taxable * 0.08);
    const finalAmount = taxable + taxAmount;
    const changeDue = cashGiven ? Math.max(0, cashGiven - finalAmount) : 0;

    const completedOrder: Order = {
      ...order,
      status: 'completed',
      discountPercent,
      discountAmount,
      taxAmount,
      finalAmount,
      paymentMethod,
      paidAt: new Date().toISOString(),
      cashGiven,
      changeDue,
    };

    // Giải phóng bàn
    const updatedTables = state.tables.map((t) =>
      t.id === table.id
        ? {
            ...t,
            status: 'available' as const,
            activeOrderId: undefined,
            guestCount: undefined,
            seatedAt: undefined,
          }
        : t
    );

    const updatedOrders = state.orders.map((o) => (o.id === order.id ? completedOrder : o));
    const updatedPaymentRequests = state.paymentRequests.map((req) =>
      req.tableId === table.id
        ? { ...req, status: 'paid' as const }
        : req
    );

    saveToStorage(STORAGE_KEYS.TABLES, updatedTables);
    saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    saveToStorage(STORAGE_KEYS.PAYMENT_REQUESTS, updatedPaymentRequests);

    setState((prev) => ({
      ...prev,
      tables: updatedTables,
      orders: updatedOrders,
      paymentRequests: updatedPaymentRequests,
    }));

    return completedOrder;
  };

  // Quản lý kho: Nhập thêm nguyên liệu
  const restockIngredient = (ingredientId: string, amount: number) => {
    const updatedIngredients = state.ingredients.map((ing) => {
      if (ing.id === ingredientId) {
        return {
          ...ing,
          stock: ing.stock + amount,
          lastRestockedAt: new Date().toISOString(),
        };
      }
      return ing;
    });

    saveToStorage(STORAGE_KEYS.INGREDIENTS, updatedIngredients);
    setState((prev) => ({ ...prev, ingredients: updatedIngredients }));
  };

  // Cập nhật công thức BOM của món ăn
  const updateMenuItemBOM = (menuItemId: string, newBOM: MenuItem['bom']) => {
    const updatedMenu = state.menuItems.map((m) => {
      if (m.id === menuItemId) {
        return { ...m, bom: newBOM };
      }
      return m;
    });
    saveToStorage(STORAGE_KEYS.MENU, updatedMenu);
    setState((prev) => ({ ...prev, menuItems: updatedMenu }));
  };

  // Các dữ liệu đã lọc theo chi nhánh hiện tại
  const currentBranch = state.branches.find((b) => b.id === state.currentBranchId) || state.branches[0];
  const currentBranchTables = state.tables.filter((t) => t.branchId === state.currentBranchId);
  const currentBranchIngredients = state.ingredients.filter((i) => i.branchId === state.currentBranchId);
  const currentBranchOrders = state.orders.filter((o) => o.branchId === state.currentBranchId);
  const currentBranchAuditLogs = state.auditLogs.filter((a) => a.branchId === state.currentBranchId);
  const currentBranchPaymentRequests = state.paymentRequests.filter((r) => r.branchId === state.currentBranchId);

  // Số lượng cảnh báo
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
  };
}
