import { Branch, RestaurantTable, MenuItem, Ingredient, Order, StaffUser } from './types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    name: 'Chi nhánh 1 - Quận 1 (Flagship)',
    address: '72 Lê Lợi, P. Bến Nghé, Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3822 9999',
    isActive: true,
    totalTables: 12,
  },
  {
    id: 'branch-2',
    name: 'Chi nhánh 2 - Cầu Giấy',
    address: '105 Duy Tân, P. Dịch Vọng Hậu, Q. Cầu Giấy',
    city: 'Hà Nội',
    phone: '024 3795 8888',
    isActive: true,
    totalTables: 10,
  },
  {
    id: 'branch-3',
    name: 'Chi nhánh 3 - Hải Châu',
    address: '36 Bạch Đằng, P. Thạch Thang, Q. Hải Châu',
    city: 'Đà Nẵng',
    phone: '0236 388 7777',
    isActive: true,
    totalTables: 8,
  },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  // Chi nhánh 1
  {
    id: 'ing-1',
    branchId: 'branch-1',
    name: 'Mì Ramen tươi thủ công',
    unit: 'g',
    stock: 2400, // 2.4kg (khoảng 16 tô)
    minThreshold: 1000,
    costPrice: 45, // 45đ/g = 45k/kg
    supplier: 'Nhà cung cấp Mì Nhật Bản Asahi',
    lastRestockedAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'ing-2',
    branchId: 'branch-1',
    name: 'Thịt Heo Chashu ủ vị',
    unit: 'g',
    stock: 1800, // 1.8kg
    minThreshold: 1200,
    costPrice: 180,
    supplier: 'CP Food Fresh Meat',
    lastRestockedAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'ing-3',
    branchId: 'branch-1',
    name: 'Nước dùng Tonkotsu xương hầm',
    unit: 'ml',
    stock: 5500, // 5.5 lít
    minThreshold: 2500,
    costPrice: 35,
    supplier: 'Bếp trung tâm chi nhánh 1',
    lastRestockedAt: '2026-09-16T04:00:00.000Z',
  },
  {
    id: 'ing-4',
    branchId: 'branch-1',
    name: 'Bánh phở tươi Hà Nội',
    unit: 'g',
    stock: 3200,
    minThreshold: 1500,
    costPrice: 30,
    supplier: 'Lò bánh phở truyền thống Ba Đình',
    lastRestockedAt: '2026-09-16T05:30:00.000Z',
  },
  {
    id: 'ing-5',
    branchId: 'branch-1',
    name: 'Nạm & Bắp Bò Úc tươi',
    unit: 'g',
    stock: 900, // Gần chạm ngưỡng cảnh báo! (minThreshold 1000) -> Điểm nhấn cảnh báo tồn kho
    minThreshold: 1000,
    costPrice: 260,
    supplier: 'MeatDeli Premium Beef',
    lastRestockedAt: '2026-09-15T14:00:00.000Z',
  },
  {
    id: 'ing-6',
    branchId: 'branch-1',
    name: 'Nước dùng phở bò truyền thống',
    unit: 'ml',
    stock: 6000,
    minThreshold: 2000,
    costPrice: 40,
    supplier: 'Bếp hầm xương 24h',
    lastRestockedAt: '2026-09-16T04:00:00.000Z',
  },
  {
    id: 'ing-7',
    branchId: 'branch-1',
    name: 'Tôm sú tươi lột vỏ',
    unit: 'g',
    stock: 1200,
    minThreshold: 600,
    costPrice: 220,
    supplier: 'Hải sản Cần Giờ',
    lastRestockedAt: '2026-09-16T06:00:00.000Z',
  },
  {
    id: 'ing-8',
    branchId: 'branch-1',
    name: 'Cơm thơm ST25 dẻo',
    unit: 'g',
    stock: 4500,
    minThreshold: 1500,
    costPrice: 25,
    supplier: 'Gạo ST25 Sóc Trăng',
    lastRestockedAt: '2026-09-16T06:30:00.000Z',
  },
  {
    id: 'ing-9',
    branchId: 'branch-1',
    name: 'Cá hồi Na Uy phi lê tươi',
    unit: 'g',
    stock: 450, // CẢNH BÁO ĐỎ TỒN KHO THẤP! (ngưỡng 500g)
    minThreshold: 500,
    costPrice: 420,
    supplier: 'Salmar Seafood Norway',
    lastRestockedAt: '2026-09-14T09:00:00.000Z',
  },
  {
    id: 'ing-10',
    branchId: 'branch-1',
    name: 'Rau xà lách Romaine sạch',
    unit: 'g',
    stock: 1800,
    minThreshold: 800,
    costPrice: 50,
    supplier: 'Đà Lạt Gap Farm',
    lastRestockedAt: '2026-09-16T06:00:00.000Z',
  },
  {
    id: 'ing-11',
    branchId: 'branch-1',
    name: 'Sốt chanh dây đặc chế',
    unit: 'ml',
    stock: 950,
    minThreshold: 400,
    costPrice: 70,
    supplier: 'Bếp lạnh chi nhánh 1',
    lastRestockedAt: '2026-09-15T15:00:00.000Z',
  },
  {
    id: 'ing-12',
    branchId: 'branch-1',
    name: 'Cà phê Robusta Đắk Lắk hảo hạng',
    unit: 'g',
    stock: 3000,
    minThreshold: 1000,
    costPrice: 120,
    supplier: 'Nông trại Buôn Ma Thuột',
    lastRestockedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'ing-13',
    branchId: 'branch-1',
    name: 'Kem béo muối biển đặc biệt',
    unit: 'ml',
    stock: 1500,
    minThreshold: 500,
    costPrice: 85,
    supplier: 'Anchor Dairy New Zealand',
    lastRestockedAt: '2026-09-15T11:00:00.000Z',
  },
  {
    id: 'ing-14',
    branchId: 'branch-1',
    name: 'Trà túi lọc thảo mộc hương đào',
    unit: 'túi',
    stock: 120,
    minThreshold: 40,
    costPrice: 3500,
    supplier: 'Phúc Long Tea Co.',
    lastRestockedAt: '2026-09-12T09:00:00.000Z',
  },
  {
    id: 'ing-15',
    branchId: 'branch-1',
    name: 'Đào ngâm giòn Nam Phi',
    unit: 'miếng',
    stock: 95,
    minThreshold: 30,
    costPrice: 4000,
    supplier: 'Kronos Food',
    lastRestockedAt: '2026-09-12T09:00:00.000Z',
  },
  {
    id: 'ing-16',
    branchId: 'branch-1',
    name: 'Bột Matcha Uji Kyoto chuẩn Nhật',
    unit: 'g',
    stock: 350,
    minThreshold: 200,
    costPrice: 650,
    supplier: 'Kyoto Tea Direct',
    lastRestockedAt: '2026-09-08T14:00:00.000Z',
  },
  {
    id: 'ing-17',
    branchId: 'branch-1',
    name: 'Sữa tươi tiệt trùng nguyên kem',
    unit: 'ml',
    stock: 4800,
    minThreshold: 2000,
    costPrice: 35,
    supplier: 'TH True Milk',
    lastRestockedAt: '2026-09-15T16:00:00.000Z',
  },
  {
    id: 'ing-18',
    branchId: 'branch-1',
    name: 'Trứng gà ta thảo mộc',
    unit: 'quả',
    stock: 65,
    minThreshold: 30,
    costPrice: 4500,
    supplier: 'Ba Huân Farm',
    lastRestockedAt: '2026-09-16T05:00:00.000Z',
  },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // BẾP NÓNG (Station: hot) - Điểm mới 2
  {
    id: 'menu-1',
    name: 'Ramen Thịt Heo Chashu Đặc Biệt',
    category: 'noodles',
    station: 'hot',
    price: 89000,
    description: 'Sợi mì tươi thủ công, thịt heo Chashu mềm tan, trứng lòng đào ngâm tương và nước dùng Tonkotsu hầm 12h.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 10, // Chuẩn bị trong 10 phút, quá 10p cảnh báo vàng, quá 15p cảnh báo đỏ
    bom: [
      { ingredientId: 'ing-1', quantity: 150 }, // 150g mì
      { ingredientId: 'ing-2', quantity: 100 }, // 100g thịt chashu
      { ingredientId: 'ing-3', quantity: 300 }, // 300ml nước dùng
      { ingredientId: 'ing-18', quantity: 1 },  // 1 quả trứng
    ],
    options: {
      spicyLevels: ['Không cay', 'Cay vừa', 'Cay nồng (Cấp độ 3)'],
      sizes: [
        { name: 'Tiêu chuẩn', extraPrice: 0 },
        { name: 'Tô Lớn (Thêm mì & thịt)', extraPrice: 25000 },
      ],
      toppings: [
        { name: 'Thêm 1 quả trứng lòng đào', price: 15000, ingredientId: 'ing-18', quantity: 1 },
        { name: 'Thêm thịt Chashu (2 miếng)', price: 30000, ingredientId: 'ing-2', quantity: 50 },
      ],
    },
  },
  {
    id: 'menu-2',
    name: 'Phở Bò Tái Nạm Hà Nội',
    category: 'noodles',
    station: 'hot',
    price: 75000,
    description: 'Bánh phở tươi mềm mướt, bắp bò tái nạm ngọt đậm vị trong nước dùng ninh xương ống quế hồi gừng thơm lừng.',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 8,
    bom: [
      { ingredientId: 'ing-4', quantity: 200 }, // 200g bánh phở
      { ingredientId: 'ing-5', quantity: 150 }, // 150g thịt bò
      { ingredientId: 'ing-6', quantity: 350 }, // 350ml nước phở
    ],
    options: {
      spicyLevels: ['Không tương ớt', 'Tương ớt truyền thống', 'Ớt hiểm cay xé'],
      sizes: [
        { name: 'Tô Thường', extraPrice: 0 },
        { name: 'Tô Đặc Biệt (Gấp đôi nạm)', extraPrice: 30000 },
      ],
      toppings: [
        { name: 'Thêm trứng chần thảo mộc', price: 10000, ingredientId: 'ing-18', quantity: 1 },
      ],
    },
  },
  {
    id: 'menu-3',
    name: 'Cơm Rang Hải Sản Hoàng Kim',
    category: 'rice',
    station: 'hot',
    price: 85000,
    description: 'Hạt cơm ST25 vàng ươm óng ả bọc trứng gà ta, hòa quyện cùng tôm sú giòn sần sật và mực tươi xào lửa lớn.',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 12,
    bom: [
      { ingredientId: 'ing-8', quantity: 180 }, // 180g cơm ST25
      { ingredientId: 'ing-7', quantity: 60 },  // 60g tôm sú
      { ingredientId: 'ing-18', quantity: 1 },  // 1 quả trứng
    ],
    options: {
      spicyLevels: ['Không cay', 'Cay vừa'],
      sizes: [
        { name: 'Suất Tiêu Chuẩn', extraPrice: 0 },
        { name: 'Suất Khổng Lồ', extraPrice: 20000 },
      ],
    },
  },

  // BẾP LẠNH (Station: cold) - Điểm mới 2
  {
    id: 'menu-4',
    name: 'Salad Cá Hồi Nauy Sốt Chanh Dây',
    category: 'salad',
    station: 'cold',
    price: 115000,
    description: 'Cá hồi Na Uy tươi béo ngậy áp nhẹ bề mặt, kết hợp cùng xà lách Romaine giòn ngọt và sốt chanh dây thanh mát.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 7,
    bom: [
      { ingredientId: 'ing-9', quantity: 80 },   // 80g cá hồi
      { ingredientId: 'ing-10', quantity: 120 }, // 120g xà lách
      { ingredientId: 'ing-11', quantity: 40 },  // 40ml sốt
    ],
    options: {
      sizes: [
        { name: 'Đĩa Tiêu Chuẩn', extraPrice: 0 },
        { name: 'Đĩa Lớn (Chia sẻ 2-3 người)', extraPrice: 40000 },
      ],
      toppings: [
        { name: 'Thêm 50g cá hồi phi lê', price: 45000, ingredientId: 'ing-9', quantity: 50 },
      ],
    },
  },
  {
    id: 'menu-5',
    name: 'Gỏi Cuốn Tôm Thịt Hoàng Gia (4 cuốn)',
    category: 'salad',
    station: 'cold',
    price: 65000,
    description: 'Tôm sú đỏ au, thịt ba chỉ luộc giòn bì, bún tươi và rau húng lủi cuộn bánh tráng phơi sương chấm tương bơ đậu phộng.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 6,
    bom: [
      { ingredientId: 'ing-7', quantity: 60 },
      { ingredientId: 'ing-10', quantity: 50 },
    ],
  },

  // QUẦY PHA CHẾ (Station: bar) - Điểm mới 2
  {
    id: 'menu-6',
    name: 'Trà Đào Cam Sả Thảo Mộc',
    category: 'drinks',
    station: 'bar',
    price: 49000,
    description: 'Hương trà thanh khiết quyện cùng tinh chất cam sả sảng khoái và những miếng đào ngâm Nam Phi giòn ngọt rộn rã.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 5,
    bom: [
      { ingredientId: 'ing-14', quantity: 1 }, // 1 túi trà
      { ingredientId: 'ing-15', quantity: 3 }, // 3 miếng đào
    ],
    options: {
      sizes: [
        { name: 'Size M (500ml)', extraPrice: 0 },
        { name: 'Size L (700ml)', extraPrice: 10000 },
      ],
      spicyLevels: ['100% Đường', '70% Đường', '50% Đường (Ít ngọt)'],
      toppings: [
        { name: 'Thêm 2 miếng đào giòn', price: 12000, ingredientId: 'ing-15', quantity: 2 },
      ],
    },
  },
  {
    id: 'menu-7',
    name: 'Cà Phê Muối Kem Béo Đắk Lắk',
    category: 'drinks',
    station: 'bar',
    price: 45000,
    description: 'Cốt cà phê phin đậm đặc thơm nồng đặc trưng Tây Nguyên phủ lớp kem béo mặn nhẹ mịn màng gây xao xuyến.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 4,
    bom: [
      { ingredientId: 'ing-12', quantity: 35 }, // 35g cà phê
      { ingredientId: 'ing-13', quantity: 40 }, // 40ml kem béo muối
    ],
    options: {
      sizes: [
        { name: 'Ly Tiêu Chuẩn', extraPrice: 0 },
        { name: 'Gấp đôi Espresso (Đậm đà)', extraPrice: 15000 },
      ],
    },
  },
  {
    id: 'menu-8',
    name: 'Matcha Latte Sữa Tươi Uji Kyoto',
    category: 'drinks',
    station: 'bar',
    price: 55000,
    description: 'Bột Matcha nguyên chất nhập khẩu từ Uji Kyoto thơm dịu ngát kết hợp sữa tươi thanh trùng ngọt thanh tự nhiên.',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    isAvailable: true,
    standardPrepMinutes: 5,
    bom: [
      { ingredientId: 'ing-16', quantity: 15 },  // 15g Matcha
      { ingredientId: 'ing-17', quantity: 120 }, // 120ml sữa tươi
    ],
  },
];

export const INITIAL_TABLES: RestaurantTable[] = [
  // Chi nhánh 1
  { id: 'tbl-1', branchId: 'branch-1', number: 'T-01', displayName: 'Bàn 01', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-2', branchId: 'branch-1', number: 'T-02', displayName: 'Bàn 02', capacity: 2, area: 'ground', status: 'available' },
  { id: 'tbl-3', branchId: 'branch-1', number: 'T-03', displayName: 'Bàn 03', capacity: 6, area: 'ground', status: 'available' },
  { id: 'tbl-4', branchId: 'branch-1', number: 'T-04', displayName: 'Bàn 04', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-5', branchId: 'branch-1', number: 'T-05', displayName: 'Bàn 05', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-6', branchId: 'branch-1', number: 'T-06', displayName: 'Bàn 06', capacity: 8, area: 'floor2', status: 'available' },
  { id: 'tbl-7', branchId: 'branch-1', number: 'T-07', displayName: 'Bàn 07', capacity: 4, area: 'floor2', status: 'available' },
  { id: 'tbl-8', branchId: 'branch-1', number: 'T-08', displayName: 'Bàn 08', capacity: 4, area: 'floor2', status: 'available' },
  { id: 'tbl-9', branchId: 'branch-1', number: 'T-09', displayName: 'Bàn 09', capacity: 10, area: 'floor2', status: 'available' },
  { id: 'tbl-10', branchId: 'branch-1', number: 'T-10', displayName: 'Bàn 10', capacity: 4, area: 'outdoor', status: 'available' },
  { id: 'tbl-11', branchId: 'branch-1', number: 'T-11', displayName: 'Bàn 11', capacity: 6, area: 'outdoor', status: 'available' },
  { id: 'tbl-12', branchId: 'branch-1', number: 'T-12', displayName: 'Bàn 12', capacity: 2, area: 'outdoor', status: 'available' },

  // Chi nhánh 2
  { id: 'tbl-13', branchId: 'branch-2', number: 'T-01', displayName: 'Bàn 01', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-14', branchId: 'branch-2', number: 'T-02', displayName: 'Bàn 02', capacity: 2, area: 'ground', status: 'available' },
  { id: 'tbl-15', branchId: 'branch-2', number: 'T-03', displayName: 'Bàn 03', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-16', branchId: 'branch-2', number: 'T-04', displayName: 'Bàn 04', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-17', branchId: 'branch-2', number: 'T-05', displayName: 'Bàn 05', capacity: 6, area: 'ground', status: 'available' },
  { id: 'tbl-18', branchId: 'branch-2', number: 'T-06', displayName: 'Bàn 06', capacity: 8, area: 'floor2', status: 'available' },
  { id: 'tbl-19', branchId: 'branch-2', number: 'T-07', displayName: 'Bàn 07', capacity: 4, area: 'floor2', status: 'available' },
  { id: 'tbl-20', branchId: 'branch-2', number: 'T-08', displayName: 'Bàn 08', capacity: 4, area: 'floor2', status: 'available' },
  { id: 'tbl-21', branchId: 'branch-2', number: 'T-09', displayName: 'Bàn 09', capacity: 4, area: 'outdoor', status: 'available' },
  { id: 'tbl-22', branchId: 'branch-2', number: 'T-10', displayName: 'Bàn 10', capacity: 6, area: 'outdoor', status: 'available' },

  // Chi nhánh 3
  { id: 'tbl-23', branchId: 'branch-3', number: 'T-01', displayName: 'Bàn 01', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-24', branchId: 'branch-3', number: 'T-02', displayName: 'Bàn 02', capacity: 2, area: 'ground', status: 'available' },
  { id: 'tbl-25', branchId: 'branch-3', number: 'T-03', displayName: 'Bàn 03', capacity: 4, area: 'ground', status: 'available' },
  { id: 'tbl-26', branchId: 'branch-3', number: 'T-04', displayName: 'Bàn 04', capacity: 6, area: 'ground', status: 'available' },
  { id: 'tbl-27', branchId: 'branch-3', number: 'T-05', displayName: 'Bàn 05', capacity: 8, area: 'floor2', status: 'available' },
  { id: 'tbl-28', branchId: 'branch-3', number: 'T-06', displayName: 'Bàn 06', capacity: 4, area: 'floor2', status: 'available' },
  { id: 'tbl-29', branchId: 'branch-3', number: 'T-07', displayName: 'Bàn 07', capacity: 4, area: 'outdoor', status: 'available' },
  { id: 'tbl-30', branchId: 'branch-3', number: 'T-08', displayName: 'Bàn 08', capacity: 6, area: 'outdoor', status: 'available' },
];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_STAFF: StaffUser[] = [
  { id: 'st-1', name: 'Nguyễn Văn Minh (Quản lý)', role: 'manager', branchId: 'branch-1' },
  { id: 'st-2', name: 'Trần Thị Thu (Thu ngân)', role: 'cashier', branchId: 'branch-1' },
  { id: 'st-3', name: 'Bếp Trưởng Kenji (Bếp nóng)', role: 'cook', branchId: 'branch-1', station: 'hot' },
  { id: 'st-4', name: 'Đầu bếp Lan Anh (Bếp lạnh)', role: 'cook', branchId: 'branch-1', station: 'cold' },
  { id: 'st-5', name: 'Bartender Hoàng Nam (Pha chế)', role: 'cook', branchId: 'branch-1', station: 'bar' },
  { id: 'st-6', name: 'Phạm Thị Hạnh (Quản lý)', role: 'manager', branchId: 'branch-2' },
  { id: 'st-7', name: 'Lê Minh Tuấn (Thu ngân)', role: 'cashier', branchId: 'branch-2' },
  { id: 'st-8', name: 'Bếp trưởng Duy (Bếp nóng)', role: 'cook', branchId: 'branch-2', station: 'hot' },
  { id: 'st-9', name: 'Nhật Anh (Pha chế)', role: 'cook', branchId: 'branch-2', station: 'bar' },
  { id: 'st-10', name: 'Nguyễn Thị Lan (Quản lý)', role: 'manager', branchId: 'branch-3' },
  { id: 'st-11', name: 'Trần Quốc Huy (Thu ngân)', role: 'cashier', branchId: 'branch-3' },
  { id: 'st-12', name: 'Bếp trưởng Sơn (Bếp nóng)', role: 'cook', branchId: 'branch-3', station: 'hot' },
];
