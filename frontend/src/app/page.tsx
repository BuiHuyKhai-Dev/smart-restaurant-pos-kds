'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Monitor,
  Warehouse,
  Building2,
  QrCode,
  Flame,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { IsometricRestaurant3D } from '@/components/isometric-restaurant-3d';

export default function FullScreen3DRestaurantPortal() {
  const router = useRouter();
  const {
    branches,
    currentBranchId,
    setBranch,
    currentBranch,
    currentBranchTables,
  } = useLiveStore();

  const previewTables = currentBranchTables.slice(0, 6);
  const availableCount = currentBranchTables.filter((t) => t.status === 'available').length;
  const occupiedCount = currentBranchTables.filter((t) => t.status === 'occupied').length;

  const handleSelectTable = (tableNumber: string) => {
    router.push(`/table/${tableNumber}`);
  };

  const handleStaffClick = () => {
    router.push('/login');
  };

  const handleCustomerClick = () => {
    router.push('/table');
  };

  return (
    <div className="relative w-screen h-screen bg-[#050817] text-white overflow-hidden flex flex-col justify-between selection:bg-[#FF9500] selection:text-slate-950 font-sans">
      {/* =========================================================================
          TOP FLOATING NAVIGATION BAR (Glassmorphism)
          ========================================================================= */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 lg:px-8 py-3.5 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <Link
            href="/"
            className="flex items-center gap-3 pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/85 px-3.5 py-2 shadow-2xl backdrop-blur-xl group hover:border-[#FF9500]/50 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF9500] to-amber-400 flex items-center justify-center shadow-lg shadow-[#FF9500]/30 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-base text-white tracking-tight">Smart</span>
                <span className="font-black text-base text-[#FF9500] tracking-tight">POS & KDS</span>
              </div>
              <p className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">
                3D Interactive Restaurant World
              </p>
            </div>
          </Link>

          {/* Center: Branch Selector Dropdown */}
          <div className="hidden md:flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/85 px-3.5 py-2 text-xs shadow-2xl backdrop-blur-xl pointer-events-auto">
            <Building2 className="w-3.5 h-3.5 text-[#FF9500]" />
            <span className="text-slate-400 font-medium">Chi nhánh:</span>
            <select
              value={currentBranchId}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer pr-1"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
            <span className="h-3 w-px bg-slate-700 mx-1" />
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {availableCount} bàn trống
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 pointer-events-auto">
            <Link
              href="/table"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[#FF9500] text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Gọi món bàn</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 text-xs font-bold transition-all shadow-xl shadow-black/30 group active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-[#FF9500] group-hover:scale-110 transition-transform" />
              <span>Cổng Nhân Viên</span>
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          FULL-SCREEN 3D RESTAURANT WORLD CENTERPIECE
          ========================================================================= */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Real Interactive 3D World */}
        <IsometricRestaurant3D
          tables={currentBranchTables}
          selectedBranchName={currentBranch?.name || 'Chi nhánh Flagship'}
          onSelectTable={handleSelectTable}
          onStaffClick={handleStaffClick}
          onCustomerClick={handleCustomerClick}
          className="w-full h-full"
        />

        {/* Minimal Hero Headline Badge (Top-Left overlay) */}
        <div className="absolute top-20 left-4 lg:left-8 z-30 pointer-events-none max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500] text-[10px] font-black uppercase tracking-wider shadow-inner backdrop-blur-md mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Interactive 3D Restaurant Diorama</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            Smart Restaurant <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9500] via-amber-400 to-[#FF9500]">
              POS & KDS
            </span>{' '}
            World
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed drop-shadow-sm hidden sm:block">
            Nhấp chuột vào <strong className="text-[#FF9500]">Nhân viên</strong> để đăng nhập ca làm việc, hoặc nhấp vào <strong className="text-[#318BFF]">Khách hàng</strong> & bàn ăn để khám phá thực đơn gọi món.
          </p>
        </div>

        {/* Floating Quick Action Cards (Bottom-Left & Bottom-Right) */}
        <div className="absolute bottom-16 sm:bottom-14 left-4 right-4 z-30 pointer-events-none flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Card A: Khách hàng gọi món (Left CTA) */}
          <div
            onClick={handleCustomerClick}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-slate-950/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-[#318BFF] hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#318BFF] to-sky-400 flex items-center justify-center text-white shadow-lg shadow-[#318BFF]/25">
              <QrCode className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-[#318BFF] border border-blue-500/30">
                  Khách Hàng
                </span>
                <span className="text-xs font-bold text-white">Gọi món trực tiếp</span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-sky-300 transition-colors flex items-center gap-1 mt-0.5">
                <span>Chọn bàn & gửi order vào bếp</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>

          {/* Quick Table Selector Pills (Center CTA) */}
          <div className="hidden lg:flex items-center gap-1.5 pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/85 px-3 py-1.5 shadow-2xl backdrop-blur-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1">
              Bàn nhanh:
            </span>
            {previewTables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleSelectTable(table.number)}
                className="flex items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-300 transition-all hover:bg-[#FF9500] hover:text-slate-950 active:scale-95 cursor-pointer"
                title={`Vào bàn ${table.number}`}
              >
                {table.number}
              </button>
            ))}
            <Link
              href="/table"
              className="text-[10px] text-slate-400 hover:text-white font-bold ml-1 transition-colors"
            >
              Tất cả →
            </Link>
          </div>

          {/* Card B: Nhân viên làm việc (Right CTA) */}
          <div
            onClick={handleStaffClick}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-slate-950/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-[#FF9500] hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF9500] to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-[#FF9500]/25">
              <UserCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/30">
                  Nội Bộ
                </span>
                <span className="text-xs font-bold text-white">Cổng Đăng Nhập</span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-amber-300 transition-colors flex items-center gap-1 mt-0.5">
                <span>Thu Ngân • Bếp KDS • Quản Lý Kho</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          MINIMAL FOOTER BAR
          ========================================================================= */}
      <footer className="relative z-30 border-t border-slate-800/80 bg-[#050817]/95 px-4 py-2 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <span>Smart Restaurant POS & KDS • Full 3D Interactive World v2.5</span>
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <Link href="/table" className="hover:text-[#FF9500] transition-colors">
            Sơ đồ bàn ăn
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-[#318BFF] transition-colors">
            Đăng nhập phân quyền
          </Link>
        </div>
      </footer>
    </div>
  );
}
