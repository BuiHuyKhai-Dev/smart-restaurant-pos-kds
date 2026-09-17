'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Warehouse,
  Layers,
  Building2,
  FileText,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Search,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { useCurrentAuth } from '@/lib/auth-store';
import { MenuItem, Ingredient, STATIONS } from '@/lib/types';
import { BOMDetailModal } from '@/components/bom-detail-modal';

export default function AdminBOMPage() {
  const router = useRouter();
  const { session, isReady, logout } = useCurrentAuth();
  const {
    branches,
    currentBranchId,
    setBranch,
    currentBranch,
    currentBranchIngredients,
    currentBranchOrders,
    currentBranchAuditLogs,
    menuItems,
    lowStockCount,
    restockIngredient,
  } = useLiveStore();

  const [activeTab, setActiveTab] = useState<'bom' | 'stock' | 'audit' | 'branches'>('bom');
  const [selectedDishForBOM, setSelectedDishForBOM] = useState<MenuItem | null>(null);
  const [restockModalIng, setRestockModalIng] = useState<Ingredient | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(1000);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (isReady && !session) {
      router.push('/login');
    }
  }, [isReady, session, router]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs">Đang kiểm tra quyền truy cập cổng Quản trị Admin...</p>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
          <Warehouse className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white mb-2">Yêu Cầu Đăng Nhập</h2>
        <p className="text-xs text-slate-400 mb-5 text-center max-w-xs">
          Vui lòng đăng nhập với tài khoản Quản Lý / Admin để truy cập hệ thống quản trị.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
        >
          Đến Cổng Đăng Nhập
        </button>
      </div>
    );
  }

  // Đăng nhập sai vai trò (không phải admin và không phải manager)
  if (session.role !== 'admin' && session.role !== 'manager') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Warehouse className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">Truy Cập Bị Từ Chối (403)</h2>
        <p className="text-xs text-slate-400 mb-1 text-center">
          Tài khoản hiện tại của bạn là <strong className="text-white">{session.name}</strong> (Vai trò: <span className="text-amber-400 font-bold uppercase">{session.role}</span>).
        </p>
        <p className="text-xs text-slate-500 mb-6 text-center max-w-sm">
          Cổng Quản Trị Kho BOM & Chuỗi chỉ dành cho Quản Lý và Quản Trị Viên (Admin).
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(session.role === 'cashier' ? '/pos' : '/kds')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Về Khu Vực Làm Việc ({session.role === 'cashier' ? 'Thu Ngân POS' : 'Bếp KDS'})
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

  // Tính tổng doanh thu hôm nay
  const completedOrders = currentBranchOrders.filter((o) => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.finalAmount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Admin Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-wider text-white">
                  Quản Trị Kho BOM & Chuỗi Chi Nhánh
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ADMIN PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">{session?.name || 'Quản Lý'}</span>
                <span>•</span>
                <span>{currentBranch.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ĐIỂM MỚI 5: Chi nhánh selector */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5 text-xs">
              <Building2 className="w-4 h-4 text-amber-400" />
              <select
                value={currentBranchId}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút Đăng Xuất An Toàn */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Đăng xuất khỏi cổng quản trị"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Stat Overview Cards */}
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Doanh thu hôm nay</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <strong className="text-xl font-black text-emerald-400">
              {totalRevenue.toLocaleString('vi-VN')} đ
            </strong>
            <span className="text-[10px] text-slate-500 block mt-1">
              {completedOrders.length} hóa đơn đã thanh toán
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Món ăn có BOM</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <strong className="text-xl font-black text-white">
              {menuItems.length} món
            </strong>
            <span className="text-[10px] text-slate-500 block mt-1">
              100% liên kết tự động trừ kho
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Cảnh báo tồn kho</span>
              <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <strong className={`text-xl font-black ${lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {lowStockCount} nguyên liệu
            </strong>
            <span className="text-[10px] text-slate-500 block mt-1">
              {lowStockCount > 0 ? 'Chạm ngưỡng an toàn tối thiểu' : 'Mức tồn kho an toàn'}
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Số chi nhánh chuỗi</span>
              <Building2 className="w-4 h-4 text-cyan-400" />
            </div>
            <strong className="text-xl font-black text-white">
              {branches.length} chi nhánh
            </strong>
            <span className="text-[10px] text-slate-500 block mt-1">
              Hệ thống Multi-Branch đồng bộ
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('bom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'bom'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Định Lượng Món Ăn (BOM Recipe)</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>Kho Nguyên Vật Liệu ({currentBranchIngredients.length})</span>
            {lowStockCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Nhật Ký Trừ Kho Tự Động</span>
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'branches'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Báo Cáo Đa Chi Nhánh (Multi-Branch)</span>
          </button>
        </div>

        {/* TAB 1: CÔNG THỨC ĐỊNH LƯỢNG BOM (Điểm mới 4) */}
        {activeTab === 'bom' && (
          <div>
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 mb-6 flex items-start gap-3 text-xs text-amber-300">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-400 font-bold mb-0.5">
                  ĐIỂM MỚI 4: BOM LIÊN KẾT TRỰC TIẾP VỚI KHO
                </strong>
                Mỗi món ăn có bảng công thức định lượng chi tiết. Khi bếp KDS đánh dấu hoàn thành đơn,
                hệ thống tự động tính toán nhân theo số lượng suất và trừ trực tiếp vào tồn kho của chi nhánh mà không cần thủ kho ghi chép thủ công.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((dish) => {
                const station = STATIONS[dish.station];

                return (
                  <div
                    key={dish.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-800 text-amber-400 border border-slate-700">
                          {station.name}
                        </span>
                        <span className="font-mono font-bold text-xs text-white">
                          {dish.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white mb-2">{dish.name}</h3>

                      {/* Tóm tắt định lượng */}
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs mb-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                          Định lượng 1 suất gồm:
                        </span>
                        {dish.bom.map((b) => {
                          const ing = currentBranchIngredients.find((i) => i.id === b.ingredientId);
                          if (!ing) return null;
                          return (
                            <div key={b.ingredientId} className="flex justify-between text-[11px]">
                              <span className="text-slate-300">• {ing.name}</span>
                              <strong className="text-amber-400">
                                {b.quantity} {ing.unit}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDishForBOM(dish)}
                      className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Xem Chi Tiết Công Thức BOM</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ TỒN KHO NGUYÊN VẬT LIỆU */}
        {activeTab === 'stock' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Lọc nguyên liệu theo tên..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <span className="text-xs text-slate-400">
                Chi nhánh: <strong className="text-amber-400">{currentBranch.name}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="p-4">Tên Nguyên Liệu</th>
                    <th className="p-4 text-center">Đơn Vị</th>
                    <th className="p-4 text-right">Tồn Kho Hiện Tại</th>
                    <th className="p-4 text-right">Ngưỡng Tối Thiểu</th>
                    <th className="p-4 text-right">Giá Vốn</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                    <th className="p-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentBranchIngredients
                    .filter((ing) => ing.name.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((ing) => {
                      const isLowStock = ing.stock <= ing.minThreshold;

                      return (
                        <tr key={ing.id} className="hover:bg-slate-850/40 transition-colors">
                          <td className="p-4 font-bold text-white">
                            <div>{ing.name}</div>
                            {ing.supplier && (
                              <span className="text-[10px] text-slate-500 font-normal">{ing.supplier}</span>
                            )}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-300">{ing.unit}</td>
                          <td className="p-4 text-right font-mono font-bold text-sm">
                            <span className={isLowStock ? 'text-rose-400 font-black' : 'text-emerald-400'}>
                              {ing.stock.toLocaleString('vi-VN')}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-slate-400">
                            {ing.minThreshold.toLocaleString('vi-VN')} {ing.unit}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-400">
                            {ing.costPrice.toLocaleString('vi-VN')} đ/{ing.unit}
                          </td>
                          <td className="p-4 text-center">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                Tồn Kho Thấp
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Đủ Tồn Kho
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                setRestockModalIng(ing);
                                setRestockAmount(ing.unit === 'g' || ing.unit === 'ml' ? 1000 : 10);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                              + Nhập Kho
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: NHẬT KÝ TRỪ KHO TỰ ĐỘNG */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-1">Nhật Ký Biến Động Kho Tự Động Theo Đơn Hàng</h3>
            <p className="text-xs text-slate-400 mb-4">
              Ghi lại mỗi khi món ăn được hoàn thành ở KDS và lượng nguyên liệu tương ứng được trừ khỏi kho
            </p>

            {currentBranchAuditLogs.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-950 border border-slate-800">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Chưa có bản ghi trừ kho nào gần đây.</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Hãy vào màn hình Bếp KDS và bấm &quot;Xong&quot; cho một món để kích hoạt trừ kho tự động.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentBranchAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.orderItemName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{log.orderId}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{log.reason}</p>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-rose-400 text-sm">
                        -{log.amountDeducted} {log.unit}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Còn lại: {log.remainingStock} {log.unit} •{' '}
                        {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BÁO CÁO & QUẢN LÝ ĐA CHI NHÁNH (Điểm mới 5) */}
        {activeTab === 'branches' && (
          <div>
            <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-6 flex items-start gap-3 text-xs text-indigo-300">
              <Building2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-indigo-400 font-bold mb-0.5">
                  ĐIỂM MỚI 5: QUẢN LÝ NHIỀU CHI NHÁNH (MULTI-BRANCH)
                </strong>
                Hệ thống phân tách dữ liệu bàn, đơn hàng và kho riêng cho từng chi nhánh, nhưng cấp quản lý có thể theo dõi tập trung, so sánh hiệu quả kinh doanh và luân chuyển chi nhánh làm việc tức thì.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {branches.map((b) => {
                const isSelected = b.id === currentBranchId;

                return (
                  <div
                    key={b.id}
                    className={`p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-xl ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {b.city}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                            Đang Điều Hành
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-white mb-1">{b.name}</h3>
                      <p className="text-xs text-slate-400 mb-3">{b.address}</p>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs mb-5">
                        <div className="flex justify-between text-slate-400">
                          <span>Quy mô bàn ăn:</span>
                          <strong className="text-white">{b.totalTables} bàn</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Hotline liên hệ:</span>
                          <strong className="text-white">{b.phone}</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setBranch(b.id);
                        alert(`Đã chuyển vùng làm việc sang: ${b.name}!`);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {isSelected ? 'Chi Nhánh Đang Quản Lý' : 'Chuyển Sang Chi Nhánh Này'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Xem BOM chi tiết */}
      <BOMDetailModal
        isOpen={!!selectedDishForBOM}
        onClose={() => setSelectedDishForBOM(null)}
        menuItem={selectedDishForBOM}
        ingredients={currentBranchIngredients}
      />

      {/* Modal Nhập kho */}
      {restockModalIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-2">Nhập Thêm Kho</h3>
            <p className="text-xs text-slate-400 mb-4">
              Nguyên liệu: <strong className="text-amber-400">{restockModalIng.name}</strong> (Tồn hiện tại: {restockModalIng.stock} {restockModalIng.unit})
            </p>

            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1">Số lượng nhập thêm ({restockModalIng.unit}):</label>
              <input
                type="number"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRestockModalIng(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  restockIngredient(restockModalIng.id, restockAmount);
                  setRestockModalIng(null);
                  alert(`Đã nhập thêm ${restockAmount} ${restockModalIng.unit} vào kho ${restockModalIng.name}!`);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Xác Nhận Nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
