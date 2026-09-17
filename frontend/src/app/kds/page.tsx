'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Flame,
  Salad,
  Coffee,
  CheckCircle2,
  Volume2,
  VolumeX,
  Layers,
  LayoutGrid,
  CheckCheck,
  LogOut,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { useCurrentAuth } from '@/lib/auth-store';
import { KitchenStation, STATIONS } from '@/lib/types';
import { UrgencyTimer } from '@/components/urgency-timer';

export default function KitchenDisplayPage() {
  const router = useRouter();
  const { session, isReady, logout } = useCurrentAuth();
  const {
    currentBranch,
    currentBranchOrders,
    updateOrderItemStatus,
  } = useLiveStore();

  // Hệ thống tự chia trạm (Station Routing), đầu bếp có thể chọn xem trạm hoặc toàn bộ
  const [selectedStation, setSelectedStation] = useState<KitchenStation | 'all'>('all');
  const [viewMode, setViewMode] = useState<'tickets' | 'aggregation'>('tickets');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (isReady && !session) {
      router.push('/login');
    }
  }, [isReady, session, router]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-xs">Đang kiểm tra quyền truy cập khu vực bếp...</p>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <ChefHat className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white mb-2">Yêu Cầu Đăng Nhập</h2>
        <p className="text-xs text-slate-400 mb-5 text-center max-w-xs">
          Vui lòng đăng nhập với tài khoản Đầu Bếp để điều phối các trạm bếp.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
        >
          Đến Cổng Đăng Nhập
        </button>
      </div>
    );
  }

  // Đăng nhập sai vai trò (không phải cook và không phải admin)
  if (session.role !== 'cook' && session.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <ChefHat className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">Truy Cập Bị Từ Chối (403)</h2>
        <p className="text-xs text-slate-400 mb-1 text-center">
          Tài khoản hiện tại của bạn là <strong className="text-white">{session.name}</strong> (Vai trò: <span className="text-amber-400 font-bold uppercase">{session.role}</span>).
        </p>
        <p className="text-xs text-slate-500 mb-6 text-center max-w-sm">
          Màn hình Bếp KDS chỉ dành cho Đầu Bếp và Quản trị viên.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(session.role === 'cashier' ? '/pos' : '/admin')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Về Khu Vực Làm Việc ({session.role === 'cashier' ? 'Thu Ngân POS' : 'Admin'})
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

  // Lọc các đơn đang hoạt động
  const activeOrders = currentBranchOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );

  // Đếm số món đang chờ theo từng trạm
  const countItemsByStation = (station: KitchenStation) => {
    return activeOrders.reduce((sum, order) => {
      const stationItems = order.items.filter(
        (it) => it.station === station && it.status !== 'ready' && it.status !== 'served'
      );
      return sum + stationItems.reduce((s, it) => s + it.quantity, 0);
    }, 0);
  };

  const hotCount = countItemsByStation('hot');
  const coldCount = countItemsByStation('cold');
  const barCount = countItemsByStation('bar');
  const totalPendingCount = hotCount + coldCount + barCount;

  // Lọc vé và món theo trạm được chọn
  const filteredOrders = activeOrders
    .map((order) => {
      const filteredItems =
        selectedStation === 'all'
          ? order.items
          : order.items.filter((item) => item.station === selectedStation);
      return {
        ...order,
        items: filteredItems,
      };
    })
    .filter((order) => order.items.length > 0);

  // Chế độ xem tổng hợp món
  const aggregatedItems: Record<
    string,
    { name: string; quantity: number; station: KitchenStation; pendingCount: number; cookingCount: number }
  > = {};

  activeOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (selectedStation !== 'all' && item.station !== selectedStation) return;
      if (item.status === 'ready' || item.status === 'served') return;

      if (!aggregatedItems[item.name]) {
        aggregatedItems[item.name] = {
          name: item.name,
          quantity: 0,
          station: item.station,
          pendingCount: 0,
          cookingCount: 0,
        };
      }
      aggregatedItems[item.name].quantity += item.quantity;
      if (item.status === 'pending') {
        aggregatedItems[item.name].pendingCount += item.quantity;
      } else if (item.status === 'cooking') {
        aggregatedItems[item.name].cookingCount += item.quantity;
      }
    });
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* KDS Header Riêng Biệt - Tích hợp Thông tin Đăng Nhập Ca Trực & Nút Đăng Xuất */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Thông tin Bếp & Ca làm việc */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-wider text-white">
                  Màn Hình Bếp KDS
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  REALTIME
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">{session?.name || 'Đội Ngũ Bếp'}</span>
                <span>•</span>
                <span>{currentBranch.name}</span>
              </p>
            </div>
          </div>

          {/* ĐIỂM MỚI 2: Phân chia trạm tự động trên KDS */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setSelectedStation('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStation === 'all'
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tất Cả Trạm</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200">
                {totalPendingCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedStation('hot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStation === 'hot'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Bếp Nóng</span>
              {hotCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 font-extrabold">
                  {hotCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedStation('cold')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStation === 'cold'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Salad className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bếp Lạnh</span>
              {coldCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-extrabold">
                  {coldCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedStation('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStation === 'bar'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-sky-500" />
              <span>Quầy Pha Chế</span>
              {barCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-950 text-sky-300 font-extrabold">
                  {barCount}
                </span>
              )}
            </button>
          </div>

          {/* Công cụ & Đăng xuất */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setViewMode('tickets')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  viewMode === 'tickets' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Theo Vé</span>
              </button>
              <button
                onClick={() => setViewMode('aggregation')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  viewMode === 'aggregation' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tổng Hợp Món</span>
              </button>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Chuông báo đơn: Bật' : 'Chuông báo đơn: Tắt'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Nút Đăng Xuất An Toàn */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Đăng xuất khỏi ca trực bếp"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main KDS Board */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-slate-900/40 border border-slate-800/80 my-8">
            <ChefHat className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">Hiện Chưa Có Vé Order Mới</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
              Khi khách hàng quét mã QR tại bàn gọi món, vé sẽ ngay lập tức xuất hiện tại đây theo thời gian thực.
            </p>
          </div>
        ) : viewMode === 'aggregation' ? (
          /* CHẾ ĐỘ XEM TỔNG HỢP MÓN */
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Tổng số lượng món bếp cần chuẩn bị ngay
              </h3>
              <span className="text-xs text-amber-400 font-bold">
                {Object.keys(aggregatedItems).length} loại món
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(aggregatedItems).map(([dishName, data]) => {
                const station = STATIONS[data.station];

                return (
                  <div
                    key={dishName}
                    className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg"
                  >
                    <div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-slate-800 text-slate-300">
                        {station.name}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-1.5">{dishName}</h4>
                      <div className="flex gap-2 text-xs text-slate-400 mt-1">
                        <span>Chờ: <strong className="text-amber-400">{data.pendingCount}</strong></span>
                        <span>•</span>
                        <span>Đang nấu: <strong className="text-cyan-400">{data.cookingCount}</strong></span>
                      </div>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-center text-2xl font-black text-amber-400 shadow-inner">
                      {data.quantity}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* CHẾ ĐỘ XEM THEO VÉ ORDER (Ticket Cards Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const allItemsReady = order.items.every(
                (it) => it.status === 'ready' || it.status === 'served'
              );

              // Xác định thời điểm hoàn thành thực tế muộn nhất của các món trong vé
              const latestCompletedAt = order.items.reduce<string | undefined>((latest, it) => {
                if (!it.completedAt) return latest;
                if (!latest) return it.completedAt;
                return new Date(it.completedAt).getTime() > new Date(latest).getTime() ? it.completedAt : latest;
              }, undefined);

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border flex flex-col justify-between shadow-xl transition-all ${
                    allItemsReady
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-emerald-500/5'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Header Vé */}
                  <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 rounded-t-3xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white px-2.5 py-0.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
                          {order.tableNumber}
                        </span>
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-300 block">
                            {order.orderCode}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Đồng hồ đếm thời gian thực hoặc hiển thị thời gian hoàn thành thực tế */}
                      <UrgencyTimer
                        orderedAt={order.createdAt}
                        standardPrepMinutes={10}
                        isCompleted={allItemsReady}
                        completedAt={latestCompletedAt}
                      />
                    </div>

                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Số khách: {order.guestCount}</span>
                      <span className="font-mono">{order.items.length} món</span>
                    </div>
                  </div>

                  {/* Danh sách món trong vé */}
                  <div className="p-3.5 flex-1 space-y-2.5 overflow-y-auto max-h-72">
                    {order.items.map((item) => {
                      const isPending = item.status === 'pending';
                      const isCooking = item.status === 'cooking';
                      const isDone = item.status === 'ready' || item.status === 'served';

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-2xl border transition-all ${
                            isDone
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : isCooking
                              ? 'bg-amber-950/20 border-amber-500/40 text-white shadow-sm'
                              : 'bg-slate-950 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                                  {item.quantity}
                                </span>
                                <h5 className={`text-xs font-bold ${isDone ? 'line-through opacity-70' : 'text-white'}`}>
                                  {item.name}
                                </h5>
                              </div>

                              {item.selectedSize && (
                                <p className="text-[10px] text-slate-400 ml-7 mt-0.5">{item.selectedSize}</p>
                              )}
                              {item.selectedSpicyLevel && (
                                <p className="text-[10px] text-amber-400 font-semibold ml-7 mt-0.5">
                                  • {item.selectedSpicyLevel}
                                </p>
                              )}
                              {item.note && (
                                <div className="text-[10px] text-rose-400 font-extrabold ml-7 mt-0.5 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 inline-block">
                                  Lưu ý: {item.note}
                                </div>
                              )}
                            </div>

                            {/* Chuyển trạng thái món */}
                            <div className="shrink-0">
                              {isPending && (
                                <button
                                  onClick={() => updateOrderItemStatus(order.id, item.id, 'cooking')}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Bắt đầu nấu món này"
                                >
                                  Nấu
                                </button>
                              )}

                              {isCooking && (
                                <button
                                  onClick={() => updateOrderItemStatus(order.id, item.id, 'ready')}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-emerald-500 text-slate-950 hover:text-white text-[10px] font-black transition-colors flex items-center gap-1 cursor-pointer animate-pulse"
                                  title="Nấu xong -> Kích hoạt tự động trừ kho định lượng BOM"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Xong
                                </button>
                              )}

                              {isDone && (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
                                    <CheckCheck className="w-3 h-3" />
                                    Đã Xong
                                  </span>
                                  {item.completedAt && (
                                    <span className="text-[9px] font-mono text-emerald-400/80">
                                      ⏱ {new Date(item.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nút hoàn tất toàn bộ */}
                  <div className="p-3 border-t border-slate-800 bg-slate-950/30 rounded-b-3xl">
                    {allItemsReady ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                        <CheckCheck className="w-4 h-4 text-emerald-400" />
                        <span>Toàn Bộ Món Đã Hoàn Thành (Đã Trừ Kho BOM)</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          order.items.forEach((item) => {
                            if (item.status !== 'ready' && item.status !== 'served') {
                              updateOrderItemStatus(order.id, item.id, 'ready');
                            }
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Hoàn Tất Toàn Bộ Vé (Trừ Kho BOM)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
