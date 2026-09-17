'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Monitor,
  Plus,
  ArrowRightLeft,
  Merge,
  Printer,
  Banknote,
  QrCode,
  Clock,
  User,
  X,
  ShoppingBag,
  LogOut,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { useCurrentAuth } from '@/lib/auth-store';
import { TableArea, TableStatus } from '@/lib/types';
import { ReceiptModal } from '@/components/receipt-modal';
import { VietQRModal } from '@/components/vietqr-modal';

export default function POSCashierPage() {
  const router = useRouter();
  const { session, isReady, logout } = useCurrentAuth();
  const {
    currentBranch,
    currentBranchTables,
    currentBranchOrders,
    menuItems,
    addItemsToOrder,
    changeOrMergeTable,
    processPayment,
    currentBranchPaymentRequests,
    clearPaymentRequest,
  } = useLiveStore();

  const pendingPaymentRequests = currentBranchPaymentRequests.filter((request) => request.status !== 'paid');

  // Bàn đang chọn
  const [selectedTableId, setSelectedTableId] = useState<string>(currentBranchTables[0]?.id || '');
  const [selectedArea, setSelectedArea] = useState<TableArea | 'all'>('all');

  // Modals
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isVietQROpen, setIsVietQROpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [isChangeTableModalOpen, setIsChangeTableModalOpen] = useState(false);

  // Form states
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [tableActionType, setTableActionType] = useState<'change' | 'merge'>('change');

  // Chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (isReady && !session) {
      router.push('/login');
    }
  }, [isReady, session, router]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs">Đang kiểm tra quyền truy cập hệ thống thu ngân POS...</p>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
          <Monitor className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white mb-2">Yêu Cầu Đăng Nhập</h2>
        <p className="text-xs text-slate-400 mb-5 text-center max-w-xs">
          Vui lòng đăng nhập với tài khoản Thu Ngân để tiếp tục làm việc.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
        >
          Đến Cổng Đăng Nhập
        </button>
      </div>
    );
  }

  // Đăng nhập sai vai trò (không phải cashier và không phải admin)
  if (session.role !== 'cashier' && session.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Monitor className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">Truy Cập Bị Từ Chối (403)</h2>
        <p className="text-xs text-slate-400 mb-1 text-center">
          Tài khoản hiện tại của bạn là <strong className="text-white">{session.name}</strong> (Vai trò: <span className="text-amber-400 font-bold uppercase">{session.role}</span>).
        </p>
        <p className="text-xs text-slate-500 mb-6 text-center max-w-sm">
          Khu vực Thu Ngân POS chỉ dành cho nhân viên Thu Ngân và Quản trị viên.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(session.role === 'cook' ? '/kds' : '/admin')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Về Khu Vực Làm Việc ({session.role === 'cook' ? 'Bếp KDS' : 'Admin'})
          </button>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-colors"
          >
            Đổi Tài Khoản
          </button>
        </div>
      </div>
    );
  }

  // Lấy dữ liệu bàn và đơn hiện tại
  const selectedTable = currentBranchTables.find((t) => t.id === selectedTableId) || currentBranchTables[0];
  const activeOrder = currentBranchOrders.find((o) => o.id === selectedTable?.activeOrderId);

  // Lọc bàn theo khu vực
  const filteredTables = currentBranchTables.filter(
    (t) => selectedArea === 'all' || t.area === selectedArea
  );

  // Trạng thái màu sắc của bàn
  const getTableStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return { label: 'Bàn Trống', color: 'bg-slate-800 text-slate-300 border-slate-700' };
      case 'occupied':
        return { label: 'Đang Có Khách', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };
      case 'pending_payment':
        return { label: 'Chờ Thanh Toán', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' };
      case 'reserved':
        return { label: 'Đã Đặt Trước', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' };
    }
  };

  // Tính toán tiền
  const subtotal = activeOrder ? activeOrder.subtotal : 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round(taxable * 0.08);
  const finalAmount = taxable + taxAmount;
  const changeDue = Math.max(0, cashGiven - finalAmount);

  // Xử lý thanh toán hoàn tất
  const handleCompletePayment = (method: 'cash' | 'vietqr' | 'card') => {
    if (!selectedTable) return;
    processPayment(selectedTable.id, method, discountPercent, method === 'cash' ? cashGiven : undefined);
    setIsCashModalOpen(false);
    setIsVietQROpen(false);
    alert(`✅ Đã thanh toán thành công cho Bàn ${selectedTable.number}! Bàn đã được giải phóng.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {pendingPaymentRequests.length > 0 && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                Yêu cầu thanh toán
              </span>
              <div className="flex flex-wrap gap-2">
                {pendingPaymentRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => {
                      setSelectedTableId(request.tableId);
                      clearPaymentRequest(request.tableId);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 transition-colors"
                  >
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span>Bàn {request.tableNumber} đang cần thanh toán</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Workstation Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                POS - Bàn Thu Ngân
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-blue-400 font-bold">{session?.name || 'Thu Ngân'}</span>
                <span>•</span>
                <span>{currentBranch.name}</span>
              </p>
            </div>
          </div>

          {/* Quick status summary & Logout */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-400">Trống: </span>
                <strong className="text-white">
                  {currentBranchTables.filter((t) => t.status === 'available').length}
                </strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-400">Có khách: </span>
                <strong className="text-blue-400">
                  {currentBranchTables.filter((t) => t.status === 'occupied').length}
                </strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-400">Chờ TT: </span>
                <strong className="text-amber-400">
                  {currentBranchTables.filter((t) => t.status === 'pending_payment').length}
                </strong>
              </div>
            </div>

            {/* Nút Đăng Xuất An Toàn */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Đăng xuất khỏi quầy thu ngân"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-6">
        {/* CỘT TRÁI: SƠ ĐỒ BÀN ĂN (FLOOR MAP) - 7 cols */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Khu vực Tabs */}
          <div className="flex items-center justify-between bg-slate-900 p-2 rounded-2xl border border-slate-800">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setSelectedArea('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedArea === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất Cả Khu Vực
              </button>
              <button
                onClick={() => setSelectedArea('ground')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedArea === 'ground'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tầng Trệt
              </button>
              <button
                onClick={() => setSelectedArea('floor2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedArea === 'floor2'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tầng 2 (VIP)
              </button>
              <button
                onClick={() => setSelectedArea('outdoor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedArea === 'outdoor'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sân Vườn
              </button>
            </div>

            {/* Nút Chuyển / Gộp bàn */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setTableActionType('change');
                  setIsChangeTableModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                title="Đổi bàn cho khách"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đổi Bàn</span>
              </button>
              <button
                onClick={() => {
                  setTableActionType('merge');
                  setIsChangeTableModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                title="Gộp 2 bàn ăn làm một"
              >
                <Merge className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gộp Bàn</span>
              </button>
            </div>
          </div>

          {/* Grid Sơ Đồ Bàn */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1 overflow-y-auto">
            {filteredTables.map((table) => {
              const isSelected = table.id === selectedTableId;
              const badge = getTableStatusBadge(table.status);
              const order = currentBranchOrders.find((o) => o.id === table.activeOrderId);

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`p-3.5 rounded-3xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/40'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black text-white">{table.number}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate">{table.displayName}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <User className="w-3 h-3" />
                      <span>{table.capacity} chỗ</span>
                      {table.guestCount && <span>• {table.guestCount} khách</span>}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {order ? (
                      <span className="font-mono font-bold text-amber-400">
                        {order.finalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[10px]">Chưa có đơn</span>
                    )}

                    {table.seatedAt && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(table.seatedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI: HÓA ĐƠN & THU NGÂN CHI TIẾT - 5 cols */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 lg:p-5 flex flex-col justify-between shadow-xl">
          <div>
            {/* Header thông tin bàn đang chọn */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{selectedTable.number}</span>
                  <span className="text-xs text-slate-400">({selectedTable.displayName})</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {activeOrder ? `Mã đơn: ${activeOrder.orderCode}` : 'Bàn chưa phát sinh đơn món'}
                </p>
              </div>

              {/* Nút thêm món trực tiếp tại quầy */}
              <button
                onClick={() => setIsAddDishModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Món</span>
              </button>
            </div>

            {/* Danh sách món trong đơn */}
            {!activeOrder || activeOrder.items.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
                <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Bàn này chưa có món nào.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Khách có thể quét mã QR tại bàn, hoặc bạn nhấn &quot;Thêm Món&quot; ở trên.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-64 pr-1 mb-4">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-amber-400">{item.quantity}x</span>
                        <span>{item.name}</span>
                      </div>
                      {item.selectedSize && <p className="text-[10px] text-slate-500">{item.selectedSize}</p>}
                      {item.note && <p className="text-[10px] text-amber-400 italic">*{item.note}</p>}
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-white">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                      </span>
                      <div>
                        {item.status === 'ready' ? (
                          <span className="text-[9px] text-emerald-400 font-bold">✓ Bếp đã nấu xong</span>
                        ) : item.status === 'cooking' ? (
                          <span className="text-[9px] text-amber-400 font-bold">⏱ Bếp đang nấu</span>
                        ) : (
                          <span className="text-[9px] text-slate-500">⏳ Chờ bếp</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phần tính tiền & Chốt Bill */}
          {activeOrder && (
            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Cộng tiền món:</span>
                <span>{subtotal.toLocaleString('vi-VN')} đ</span>
              </div>

              {/* Chiết khấu giảm giá */}
              <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>Chiết khấu (%):</span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="bg-slate-800 text-white rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={10}>10% (VIP)</option>
                    <option value={15}>15%</option>
                    <option value={20}>20%</option>
                  </select>
                </div>
                <span className="text-rose-400 font-bold">
                  -{discountAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Thuế GTGT (VAT 8%):</span>
                <span>+{taxAmount.toLocaleString('vi-VN')} đ</span>
              </div>

              <div className="flex justify-between text-base font-black text-white border-t border-slate-800 pt-2">
                <span>TỔNG THANH TOÁN:</span>
                <span className="text-amber-400 text-lg font-black">
                  {finalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Hành động: In Tạm Tính & Thanh Toán */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setIsReceiptOpen(true)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  In Tạm Tính
                </button>

                <button
                  onClick={() => setIsVietQROpen(true)}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  VietQR Động
                </button>
              </div>

              <button
                onClick={() => {
                  setCashGiven(finalAmount);
                  setIsCashModalOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                Thanh Toán Tiền Mặt / Thẻ POS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal In Tạm Tính */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={activeOrder || null}
        branch={currentBranch}
        isProvisional={true}
      />

      {/* Modal Thanh Toán VietQR Động */}
      <VietQRModal
        isOpen={isVietQROpen}
        onClose={() => setIsVietQROpen(false)}
        onConfirmPayment={() => handleCompletePayment('vietqr')}
        amount={finalAmount}
        orderCode={activeOrder?.orderCode || 'ORD-000'}
        tableNumber={selectedTable?.number || 'T-01'}
      />

      {/* Modal Thanh Toán Tiền Mặt */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="font-bold text-base mb-3">Thanh Toán Tiền Mặt</h3>
            <div className="space-y-3 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền cần thu:</span>
                <strong className="text-amber-400 text-sm">{finalAmount.toLocaleString('vi-VN')} đ</strong>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tiền khách đưa (VNĐ):</label>
                <input
                  type="number"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono font-bold text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Gợi ý mệnh giá nhanh */}
              <div className="flex gap-1.5 flex-wrap">
                {[100000, 200000, 500000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCashGiven(val)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-mono hover:bg-slate-700"
                  >
                    {val.toLocaleString('vi-VN')} đ
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                <span className="text-slate-400">Tiền thừa trả khách:</span>
                <strong className="text-emerald-400 font-mono">{changeDue.toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsCashModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => handleCompletePayment('cash')}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Xác Nhận Thu Tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Món Tại Quầy Thu Ngân */}
      {isAddDishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-white">Thêm Món Vào Bàn {selectedTable.number}</h3>
              <button onClick={() => setIsAddDishModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {menuItems.map((dish) => (
                <div
                  key={dish.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <h5 className="font-bold text-white">{dish.name}</h5>
                    <p className="text-[10px] text-amber-400">{dish.price.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <button
                    onClick={() => {
                      addItemsToOrder(selectedTable.id, [{ menuItemId: dish.id, quantity: 1 }]);
                      alert(`Đã thêm 1 suất ${dish.name} vào Bàn ${selectedTable.number}!`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer"
                  >
                    + Thêm
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsAddDishModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs"
            >
              Hoàn Tất
            </button>
          </div>
        </div>
      )}

      {/* Modal Đổi / Gộp Bàn */}
      {isChangeTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-2">
              {tableActionType === 'change' ? 'Chuyển Bàn Ăn' : 'Gộp Bàn Ăn'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Từ Bàn: <strong className="text-amber-400">{selectedTable.number}</strong>
            </p>

            <div className="mb-4">
              <label className="text-xs text-slate-300 block mb-1">Chọn bàn đích:</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
              >
                <option value="">-- Chọn bàn đích --</option>
                {currentBranchTables
                  .filter((t) => t.id !== selectedTable.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.number} - {t.displayName} ({t.status === 'available' ? 'Trống' : 'Có khách'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsChangeTableModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!targetTableId) {
                    alert('Vui lòng chọn bàn đích!');
                    return;
                  }
                  changeOrMergeTable(selectedTable.id, targetTableId, tableActionType);
                  setIsChangeTableModalOpen(false);
                  alert(`Đã ${tableActionType === 'change' ? 'chuyển' : 'gộp'} bàn thành công!`);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Xác Nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
