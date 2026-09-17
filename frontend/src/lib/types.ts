// Định nghĩa các trạm bếp (Điểm mới 2: Station Routing)
export type KitchenStation = 'hot' | 'cold' | 'bar';

export interface KitchenStationInfo {
  id: KitchenStation;
  name: string;
  description: string;
  iconName: string;
  color: string;
}

export const STATIONS: Record<KitchenStation, KitchenStationInfo> = {
  hot: {
    id: 'hot',
    name: 'Bếp Nóng',
    description: 'Ramen, Mì, Cơm, Món xào, Món nướng',
    iconName: 'Flame',
    color: 'amber',
  },
  cold: {
    id: 'cold',
    name: 'Bếp Lạnh',
    description: 'Salad, Sushi, Gỏi cuốn, Khai vị lạnh',
    iconName: 'Salad',
    color: 'emerald',
  },
  bar: {
    id: 'bar',
    name: 'Quầy Pha Chế',
    description: 'Cà phê, Trà sữa, Nước ép, Mocktail',
    iconName: 'Coffee',
    color: 'sky',
  },
};

// Chi nhánh (Điểm mới 5: Multi-Branch Management)
export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
  totalTables: number;
}

// Bàn ăn
export type TableStatus = 'available' | 'occupied' | 'pending_payment' | 'reserved';
export type TableArea = 'ground' | 'floor2' | 'outdoor';

export interface RestaurantTable {
  id: string;
  branchId: string;
  number: string; // T-01, T-02...
  displayName: string;
  capacity: number;
  area: TableArea;
  status: TableStatus;
  activeOrderId?: string;
  guestCount?: number;
  seatedAt?: string;
}

// Định lượng nguyên liệu BOM (Điểm mới 4: Bill of Materials)
export interface BOMItem {
  ingredientId: string;
  quantity: number; // Định lượng cần cho 1 suất
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'noodles' | 'rice' | 'salad' | 'drinks' | 'dessert';
  station: KitchenStation; // Tự động định tuyến đến trạm bếp
  price: number;
  description: string;
  image: string;
  isAvailable: boolean;
  standardPrepMinutes: number; // Thời gian chuẩn bị tối đa trước khi cảnh báo trễ (Điểm mới 3)
  bom: BOMItem[]; // Công thức cấu thành
  options?: {
    spicyLevels?: string[];
    sizes?: { name: string; extraPrice: number }[];
    toppings?: { name: string; price: number; ingredientId?: string; quantity?: number }[];
  };
}

// Nguyên vật liệu kho
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'L' | 'cái' | 'quả' | 'túi' | 'miếng';

export interface Ingredient {
  id: string;
  branchId: string;
  name: string;
  unit: IngredientUnit;
  stock: number;
  minThreshold: number; // Ngưỡng tồn kho tối thiểu cảnh báo đỏ
  costPrice: number;
  supplier?: string;
  lastRestockedAt?: string;
}

// Nhật ký trừ kho tự động BOM
export interface InventoryAuditLog {
  id: string;
  branchId: string;
  ingredientId: string;
  ingredientName: string;
  amountDeducted: number;
  unit: IngredientUnit;
  remainingStock: number;
  orderId: string;
  orderItemName: string;
  reason: string;
  createdAt: string;
}

export type PaymentRequestStatus = 'pending' | 'paid';

export interface PaymentRequest {
  id: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
  requestedAt: string;
  orderId?: string;
  status: PaymentRequestStatus;
}

// Trạng thái món trong KDS & POS
export type OrderItemStatus = 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  station: KitchenStation;
  selectedSize?: string;
  selectedSpicyLevel?: string;
  selectedToppings?: string[];
  note?: string;
  status: OrderItemStatus;
  orderedAt: string; // ISO string
  startedCookingAt?: string;
  completedAt?: string;
  isLate?: boolean; // Cảnh báo quá hạn
}

// Trạng thái đơn hàng tổng
export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'vietqr' | 'card';

export interface Order {
  id: string;
  orderCode: string; // ORD-101
  branchId: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  guestCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  finalAmount: number;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  cashGiven?: number;
  changeDue?: number;
}

// Người dùng phân quyền
export type UserRole = 'customer' | 'cashier' | 'cook' | 'manager' | 'admin';

export interface StaffUser {
  id: string;
  name: string;
  role: UserRole;
  branchId: string;
  station?: KitchenStation; // Dành cho nhân viên bếp
}
