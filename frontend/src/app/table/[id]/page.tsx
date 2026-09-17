'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import {
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Search,
  X,
  ChefHat,
  Bell,
  CreditCard,
  Flame,
  Salad,
  Coffee,
  ChevronRight,
  ShoppingCart,
  Star,
  Sparkles,
  UtensilsCrossed,
  CheckCheck,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { isLocalDevGuestAccessAllowed, verifyTableGuestToken } from '@/lib/table-guest-token';
import { MenuItem, TableArea } from '@/lib/types';

type TabType = 'menu' | 'order_status';
type CategoryType = 'all' | 'hot' | 'cold' | 'bar';

const CATEGORY_CONFIG = {
  all: { label: 'Tất cả', icon: <Sparkles className="w-3.5 h-3.5" />, activeClass: 'bg-white text-slate-950', badgeClass: '' },
  hot: { label: 'Món Nóng', icon: <Flame className="w-3.5 h-3.5" />, activeClass: 'bg-amber-500 text-slate-950', badgeClass: '' },
  cold: { label: 'Khai Vị', icon: <Salad className="w-3.5 h-3.5" />, activeClass: 'bg-emerald-500 text-slate-950', badgeClass: '' },
  bar: { label: 'Đồ Uống', icon: <Coffee className="w-3.5 h-3.5" />, activeClass: 'bg-sky-500 text-slate-950', badgeClass: '' },
};

const STATION_BADGE = {
  hot: { label: 'Bếp Nóng', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cold: { label: 'Bếp Lạnh', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  bar: { label: 'Pha Chế', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
};

export default function TableOrderPage() {
  const params = useParams<{ id: string }>();
  const guestToken = useSearchParams().get('t') ?? '';

  const {
    currentBranch,
    currentBranchTables,
    menuItems,
    currentBranchOrders,
    currentBranchPaymentRequests,
    placeOrder,
    requestPayment,
    clearPaymentRequest,
  } = useLiveStore();

  const tableParam = params?.id || currentBranchTables[0]?.number || 'T-01';

  const [selectedArea, setSelectedArea] = useState<TableArea | 'all'>('all');
  const areaFilteredTables = currentBranchTables.filter(
    (table) => selectedArea === 'all' || table.area === selectedArea
  );

  const currentTable =
    areaFilteredTables.find((t) => t.number === tableParam || t.id === tableParam) ||
    currentBranchTables.find((t) => t.number === tableParam || t.id === tableParam) ||
    currentBranchTables[0];

  useEffect(() => {
    if (currentTable && selectedArea === 'all') {
      setSelectedArea(currentTable.area);
    }
  }, [currentTable, selectedArea]);

  const [tableAccessValid, setTableAccessValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentTable) return;

    let isCancelled = false;

    const validateGuestAccess = async () => {
      const localDevAccess = !guestToken && isLocalDevGuestAccessAllowed(typeof window !== 'undefined' ? window.location.hostname : '');
      const isValid = guestToken ? await verifyTableGuestToken(guestToken, currentTable.id) : localDevAccess;

      if (!isCancelled) {
        setTableAccessValid(isValid);
      }
    };

    validateGuestAccess();

    return () => {
      isCancelled = true;
    };
  }, [currentTable, guestToken]);

  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSpicy, setSelectedSpicy] = useState('');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [dishNote, setDishNote] = useState('');
  const [cart, setCart] = useState<Array<{
    menuItem: MenuItem;
    quantity: number;
    selectedSize?: string;
    selectedSpicy?: string;
    selectedToppings: string[];
    note?: string;
    itemTotal: number;
  }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);
  const [callStaffNotif, setCallStaffNotif] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const activeOrder = currentBranchOrders.find(
    (o) => o.tableId === currentTable.id && o.status !== 'completed' && o.status !== 'cancelled'
  );

  const paymentSuccessNotice = currentBranchPaymentRequests.find(
    (request) => request.tableId === currentTable.id && request.status === 'paid'
  );

  useEffect(() => {
    if (!paymentSuccessNotice) return;

    const timer = setTimeout(() => {
      clearPaymentRequest(currentTable.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [paymentSuccessNotice, clearPaymentRequest, currentTable.id]);

  const openCustomModal = (dish: MenuItem) => {
    setSelectedDish(dish);
    setQuantity(1);
    setSelectedSize(dish.options?.sizes?.[0]?.name || '');
    setSelectedSpicy(dish.options?.spicyLevels?.[0] || '');
    setSelectedToppings([]);
    setDishNote('');
  };

  const calculateCurrentItemPrice = () => {
    if (!selectedDish) return 0;
    let price = selectedDish.price;
    if (selectedSize && selectedDish.options?.sizes) {
      const s = selectedDish.options.sizes.find((opt) => opt.name === selectedSize);
      if (s) price += s.extraPrice;
    }
    selectedToppings.forEach((topName) => {
      const t = selectedDish.options?.toppings?.find((opt) => opt.name === topName);
      if (t) price += t.price;
    });
    return price;
  };

  const handleAddToCart = () => {
    if (!selectedDish) return;
    const unitPrice = calculateCurrentItemPrice();
    setCart((prev) => [
      ...prev,
      {
        menuItem: selectedDish,
        quantity,
        selectedSize: selectedSize || undefined,
        selectedSpicy: selectedSpicy || undefined,
        selectedToppings,
        note: dishNote.trim() || undefined,
        itemTotal: unitPrice * quantity,
      },
    ]);
    setSelectedDish(null);
  };

  const cartSubtotal = cart.reduce((sum, it) => sum + it.itemTotal, 0);
  const cartVAT = Math.round(cartSubtotal * 0.08);
  const cartFinal = cartSubtotal + cartVAT;
  const totalCartCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;
    placeOrder({
      tableId: currentTable.id,
      guestCount: currentTable.guestCount || 2,
      items: cart.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        selectedSize: c.selectedSize,
        selectedSpicyLevel: c.selectedSpicy,
        selectedToppings: c.selectedToppings,
        note: c.note,
      })),
    });
    setCart([]);
    setIsCartOpen(false);
    setOrderPlacedSuccess(true);
    setActiveTab('order_status');
    setTimeout(() => setOrderPlacedSuccess(false), 5000);
  };

  const handleCallStaff = (type: 'staff' | 'bill') => {
    if (type === 'bill') {
      if (!canRequestPayment) {
        setCallStaffNotif(`⏳ Đơn hàng chưa hoàn tất. Vui lòng chờ tất cả món sẵn sàng trước khi thanh toán.`);
        setTimeout(() => setCallStaffNotif(null), 4000);
        return;
      }
      requestPayment(currentTable.id);
    }

    const msg =
      type === 'staff'
        ? `🔔 Đã gửi yêu cầu nhân viên đến Bàn ${currentTable.number}!`
        : `💳 Đã gửi yêu cầu thanh toán cho Bàn ${currentTable.number}!`;
    setCallStaffNotif(msg);
    setTimeout(() => setCallStaffNotif(null), 4000);
  };

  const filteredMenu = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    const matchCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'hot' && item.station === 'hot') ||
      (selectedCategory === 'cold' && item.station === 'cold') ||
      (selectedCategory === 'bar' && item.station === 'bar');
    const matchSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const pendingItems = activeOrder?.items.filter((i) => i.status === 'pending').length || 0;
  const cookingItems = activeOrder?.items.filter((i) => i.status === 'cooking').length || 0;
  const readyItems = activeOrder?.items.filter((i) => i.status === 'ready' || i.status === 'served').length || 0;
  const totalItems = activeOrder?.items.length || 0;
  const canRequestPayment = !!activeOrder && activeOrder.items.length > 0 && activeOrder.items.every((item) => item.status === 'ready' || item.status === 'served');

  if (tableAccessValid === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/40 bg-slate-900 p-8 text-center shadow-2xl shadow-rose-500/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Mã QR không hợp lệ</h1>
          <p className="mt-3 text-sm text-slate-300">
            Mã bàn này đã bị chỉnh sửa hoặc không khớp với bàn được cấp. Vui lòng quét mã QR chính xác từ bàn của bạn.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-amber-400"
          >
            Quay lại trang chính
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 select-none">
      {/* ======== HEADER MOBILE CAO CẤP ======== */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 shadow-xl shadow-black/20">
        {/* Brand bar */}
        <div className="px-4 pt-3.5 pb-0">
          <div className="max-w-md mx-auto flex items-center justify-between">
            {/* Table info */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-amber-500/30">
                  {currentTable.number}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-sm text-white leading-tight">
                  {currentTable.displayName}
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-tight">
                  {currentBranch.name}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCallStaff('staff')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-[11px] font-semibold active:scale-95 transition-all"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Gọi Phục Vụ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="px-4 pb-3 pt-2.5">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800/80">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Thực Đơn
            </button>
            <button
              onClick={() => setActiveTab('order_status')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all relative flex items-center justify-center gap-1.5 ${
                activeTab === 'order_status'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Đơn Của Bạn</span>
              {activeOrder && activeOrder.items.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                  activeTab === 'order_status' ? 'bg-slate-950 text-amber-500' : 'bg-rose-500 text-white'
                }`}>
                  {activeOrder.items.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ======== MAIN CONTENT ======== */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex-1">
        {/* Toast thông báo gọi phục vụ */}
        {callStaffNotif && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-2.5 slide-in-from-top">
            <div className="w-8 h-8 rounded-xl bg-slate-950/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 fill-current" />
            </div>
            <span>{callStaffNotif}</span>
          </div>
        )}

        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(['all', 'ground', 'floor2', 'outdoor'] as const).map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedArea === area
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {area === 'all' ? 'Tất cả khu vực' : area === 'ground' ? 'Tầng trệt' : area === 'floor2' ? 'Tầng 2' : 'Sân vườn'}
              </button>
            ))}
          </div>
        </div>

        {/* Banner gửi đơn thành công */}
        {orderPlacedSuccess && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center gap-3 shadow-xl slide-in-from-top">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Đã gửi đơn vào bếp!</p>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Đơn đã được phân loại tự động đến từng trạm bếp.
              </p>
            </div>
          </div>
        )}

        {paymentSuccessNotice && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center gap-3 shadow-xl slide-in-from-top">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Thanh toán thành công!</p>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Bàn {currentTable.number} đã được xác nhận thanh toán.
              </p>
            </div>
          </div>
        )}

        {/* ===== TAB 1: THỰC ĐƠN ===== */}
        {activeTab === 'menu' && (
          <div>
            {/* Thanh tìm kiếm */}
            <div className="relative mb-4">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-amber-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm món ăn, đồ uống..."
                className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all ${
                  isSearchFocused ? 'border-amber-500/50 shadow-lg shadow-amber-500/5' : 'border-slate-800'
                }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Danh mục */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {(Object.keys(CATEGORY_CONFIG) as CategoryType[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? `${cfg.activeClass} shadow-md`
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                    {isActive && (
                      <span className="bg-slate-950/20 text-current px-1.5 py-0.5 rounded-full text-[9px] font-black">
                        {cat === 'all' ? filteredMenu.length : menuItems.filter(m => m.station === cat && m.isAvailable).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Kết quả tìm kiếm */}
            {searchQuery && (
              <p className="text-xs text-slate-400 mb-3">
                Tìm thấy <strong className="text-amber-400">{filteredMenu.length}</strong> món cho &ldquo;{searchQuery}&rdquo;
              </p>
            )}

            {/* Danh sách món */}
            {filteredMenu.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/60">
                <Search className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="font-bold text-sm text-white">Không tìm thấy món phù hợp</p>
                <p className="text-xs text-slate-400 mt-1">Hãy thử tìm kiếm với từ khóa khác.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="mt-4 px-5 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 transition-colors">
                  Xem Tất Cả
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMenu.map((dish) => {
                  const stationBadge = STATION_BADGE[dish.station];
                  const inCart = cart.reduce((s, c) => c.menuItem.id === dish.id ? s + c.quantity : s, 0);
                  return (
                    <div
                      key={dish.id}
                      onClick={() => openCustomModal(dish)}
                      className="flex gap-3.5 p-3.5 rounded-3xl bg-slate-900/80 border border-slate-800/60 hover:border-slate-700/80 transition-all cursor-pointer group active:scale-[0.985] shadow-lg"
                    >
                      {/* Ảnh món */}
                      <div className="relative w-[90px] h-[90px] rounded-2xl overflow-hidden shrink-0 bg-slate-800">
                        <Image
                          src={dish.image}
                          alt={dish.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {inCart > 0 && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-950">{inCart}</span>
                          </div>
                        )}
                      </div>

                      {/* Thông tin */}
                      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors leading-snug line-clamp-1">
                              {dish.name}
                            </h4>
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-lg border ${stationBadge.color}`}>
                              {stationBadge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                          {dish.options && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {dish.options.sizes && <span className="text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded-md">Chọn size</span>}
                              {dish.options.spicyLevels && <span className="text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded-md">Chọn cay</span>}
                              {dish.options.toppings && <span className="text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded-md">Thêm topping</span>}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="font-black text-amber-400 text-base">
                            {dish.price.toLocaleString('vi-VN')}
                            <span className="text-[11px] font-bold ml-0.5">đ</span>
                          </span>
                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-500 transition-all">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 2: TRẠNG THÁI ĐƠN HÀNG ===== */}
        {activeTab === 'order_status' && (
          <div className="space-y-4">
            {!activeOrder ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/60">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="w-8 h-8 text-slate-600" />
                </div>
                <h4 className="font-bold text-sm text-white">Chưa có đơn nào</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Hãy mở tab Thực Đơn để chọn món và gửi đơn trực tiếp vào bếp nhé!
                </p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                >
                  Xem Thực Đơn
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary card */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Mã đơn</span>
                      <p className="font-mono font-black text-amber-400 text-lg leading-tight">{activeOrder.orderCode}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-xl font-black uppercase tracking-wide ${
                      activeOrder.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      activeOrder.status === 'in_progress' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {activeOrder.status === 'pending' ? '🍽 Bếp Đã Nhận' :
                       activeOrder.status === 'in_progress' ? '🔥 Đang Chế Biến' : '✅ Sẵn Sàng'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {totalItems > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-slate-400">Tiến độ chế biến</span>
                        <span className="text-white font-bold">{readyItems}/{totalItems} món hoàn thành</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${totalItems > 0 ? (readyItems / totalItems) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex gap-3 mt-2">
                        {pendingItems > 0 && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{pendingItems} chờ</span>}
                        {cookingItems > 0 && <span className="text-[10px] text-amber-400 flex items-center gap-1 animate-pulse"><Flame className="w-3 h-3" />{cookingItems} đang nấu</span>}
                        {readyItems > 0 && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCheck className="w-3 h-3" />{readyItems} xong</span>}
                      </div>
                    </div>
                  )}

                  {/* Danh sách món */}
                  <div className="space-y-2">
                    {activeOrder.items.map((it) => {
                      const isReady = it.status === 'ready' || it.status === 'served';
                      const isCooking = it.status === 'cooking';
                      return (
                        <div key={it.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-lg bg-slate-800 text-[10px] font-black text-slate-300 flex items-center justify-center shrink-0">
                                {it.quantity}
                              </span>
                              <span className="font-bold text-xs text-white truncate">{it.name}</span>
                            </div>
                            {it.selectedSize && <p className="text-[10px] text-slate-400 mt-0.5 ml-7">{it.selectedSize}</p>}
                            {it.note && <p className="text-[10px] text-amber-400 italic mt-0.5 ml-7">*{it.note}</p>}
                          </div>

                          <div className="shrink-0">
                            {isReady ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />Xong
                              </span>
                            ) : isCooking ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold animate-pulse">
                                <Flame className="w-3 h-3" />Đang nấu
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold">
                                <Timer className="w-3 h-3" />Chờ bếp
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tạm tính */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Tạm tính (VAT 8%):</span>
                    <strong className="text-base font-black text-amber-400">
                      {activeOrder.finalAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                {/* Nút thanh toán */}
                <div className="p-4 rounded-3xl bg-amber-500/8 border border-amber-500/20">
                  <p className="text-xs text-amber-300/80 font-medium mb-3 text-center">
                    Bữa ăn đã sẵn sàng hoặc quý khách muốn thanh toán?
                  </p>
                  <button
                    onClick={() => handleCallStaff('bill')}
                    disabled={!canRequestPayment}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                      canRequestPayment
                        ? 'bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{canRequestPayment ? 'Yêu Cầu Thanh Toán' : 'Chờ món hoàn tất'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======== FLOATING CART BAR ======== */}
      {cart.length > 0 && !isCartOpen && !selectedDish && (
        <div className="fixed bottom-5 inset-x-4 max-w-md mx-auto z-40 slide-in-from-bottom">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-2xl shadow-amber-500/30 flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-950/20 flex items-center justify-center">
                <ShoppingCart className="w-4.5 h-4.5 text-slate-950" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-extrabold uppercase tracking-wide block opacity-80">
                  {totalCartCount} món • Giỏ hàng
                </span>
                <span className="text-base font-black leading-tight">
                  {cartFinal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-xs bg-slate-950/20 text-slate-950 px-3 py-1.5 rounded-xl">
              <span>Xem</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* ======== MODAL TÙY BIẾN MÓN ======== */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full px-5 pt-5 pb-6 max-h-[90vh] overflow-y-auto scrollbar-thin relative shadow-2xl slide-in-from-bottom">
            {/* Drag indicator */}
            <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-4 sm:hidden" />

            <button
              onClick={() => setSelectedDish(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Hero section */}
            <div className="flex gap-4 mb-5">
              <div className="w-24 h-24 rounded-2xl overflow-hidden relative shrink-0 bg-slate-800">
                <Image src={selectedDish.image} alt={selectedDish.name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base text-white leading-snug">{selectedDish.name}</h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border mt-1 ${STATION_BADGE[selectedDish.station].color}`}>
                  {selectedDish.station === 'hot' ? <Flame className="w-3 h-3" /> : selectedDish.station === 'cold' ? <Salad className="w-3 h-3" /> : <Coffee className="w-3 h-3" />}
                  {STATION_BADGE[selectedDish.station].label}
                </span>
                <p className="text-xl font-black text-amber-400 mt-1.5">
                  {selectedDish.price.toLocaleString('vi-VN')} <span className="text-sm">đ</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{selectedDish.description}</p>
              </div>
            </div>

            {/* Kích cỡ */}
            {selectedDish.options?.sizes && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-300 block mb-2 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" /> Kích cỡ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedDish.options.sizes.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setSelectedSize(s.name)}
                      className={`p-2.5 rounded-2xl border text-xs font-semibold text-left transition-all ${
                        selectedSize === s.name
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{s.name}</div>
                      {s.extraPrice > 0 && <div className="text-[10px] opacity-70">+{s.extraPrice.toLocaleString('vi-VN')} đ</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Độ cay */}
            {selectedDish.options?.spicyLevels && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-300 block mb-2 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Gia vị / Độ cay:
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedDish.options.spicyLevels.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedSpicy(lvl)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        selectedSpicy === lvl
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Topping */}
            {selectedDish.options?.toppings && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-300 block mb-2">Topping thêm:</label>
                <div className="space-y-1.5">
                  {selectedDish.options.toppings.map((top) => {
                    const isSelected = selectedToppings.includes(top.name);
                    return (
                      <button
                        key={top.name}
                        onClick={() => setSelectedToppings(isSelected
                          ? selectedToppings.filter((t) => t !== top.name)
                          : [...selectedToppings, top.name]
                        )}
                        className={`w-full p-2.5 rounded-2xl border text-xs flex justify-between items-center transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-slate-950" />}
                          </div>
                          <span>{top.name}</span>
                        </div>
                        <span className="text-amber-400 font-bold">+{top.price.toLocaleString('vi-VN')} đ</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Ghi chú cho đầu bếp:</label>
              <textarea
                value={dishNote}
                onChange={(e) => setDishNote(e.target.value)}
                rows={2}
                placeholder="VD: Không hành, ít tiêu, làm cay vừa..."
                className="w-full p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white resize-none focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-600"
              />
            </div>

            {/* Quantity + Add button */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-1.5">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-black text-base text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all flex justify-between items-center px-4 active:scale-[0.98] shadow-lg shadow-amber-500/20"
              >
                <span>Thêm Vào Giỏ</span>
                <span className="font-mono">{(calculateCurrentItemPrice() * quantity).toLocaleString('vi-VN')} đ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== CART DRAWER ======== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full px-5 pt-5 pb-6 max-h-[90vh] flex flex-col relative shadow-2xl slide-in-from-bottom">
            <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                  Giỏ Hàng Của Bạn
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Bàn {currentTable.number} • {currentBranch.name}
                </p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 scrollbar-thin">
              {cart.map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between gap-3">
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-white">
                      {item.quantity}× {item.menuItem.name}
                    </h5>
                    {item.selectedSize && <p className="text-[10px] text-slate-400 mt-0.5">{item.selectedSize}</p>}
                    {item.selectedSpicy && <p className="text-[10px] text-slate-400">{item.selectedSpicy}</p>}
                    {item.selectedToppings.length > 0 && (
                      <p className="text-[10px] text-slate-400">+{item.selectedToppings.join(', ')}</p>
                    )}
                    {item.note && <p className="text-[10px] text-amber-400 italic">*{item.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-xs text-amber-400">{item.itemTotal.toLocaleString('vi-VN')} đ</span>
                    <button
                      onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                      className="block text-[10px] text-rose-400 hover:text-rose-300 mt-1 ml-auto"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Tổng món:</span>
                <span>{cartSubtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Thuế GTGT (8%):</span>
                <span>{cartVAT.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>TỔNG CỘNG:</span>
                <span className="text-amber-400">{cartFinal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
            >
              <ChefHat className="w-5 h-5" />
              <span>GỬI ĐƠN VÀO BẾP</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
