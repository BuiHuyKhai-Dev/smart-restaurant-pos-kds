'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Monitor,
  Warehouse,
  Building2,
  QrCode,
  Flame,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { IsometricRestaurant3D } from '@/components/isometric-restaurant-3d';

export default function LuxuryRestaurantPortal() {
  const router = useRouter();
  const {
    branches,
    currentBranchId,
    setBranch,
    currentBranch,
    currentBranchTables,
    currentBranchOrders,
  } = useLiveStore();

  const previewTables = currentBranchTables.slice(0, 6);
  const availableCount = currentBranchTables.filter((t) => t.status === 'available').length;
  const occupiedCount = currentBranchTables.filter((t) => t.status === 'occupied').length;

  const handleSelectTableFrom3D = (tableNumber: string) => {
    router.push(`/table/${tableNumber}`);
  };

  return (
    <div className="min-h-screen bg-[#050817] text-white flex flex-col justify-between selection:bg-[#FF9500] selection:text-slate-950 font-sans relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-[#FF9500]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-10 w-[550px] h-[450px] bg-[#318BFF]/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* ==========================================
          HEADER / NAVBAR
          ========================================== */}
      <nav className="border-b border-slate-800/80 bg-[#050817]/85 backdrop-blur-xl px-4 lg:px-8 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF9500] to-amber-400 flex items-center justify-center shadow-lg shadow-[#FF9500]/25 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-white tracking-tight">Smart</span>
                <span className="font-black text-lg text-[#FF9500] tracking-tight">POS & KDS</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Next-Gen F&B Technology Platform
              </p>
            </div>
          </Link>

          {/* Center: Branch Selector */}
          <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs backdrop-blur-md">
            <Building2 className="w-3.5 h-3.5 text-[#FF9500]" />
            <span className="text-slate-400 font-medium">Chi nhánh:</span>
            <select
              value={currentBranchId}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Right: Staff Login Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-black/20 group"
            >
              <Lock className="w-3.5 h-3.5 text-[#FF9500] group-hover:scale-110 transition-transform" />
              <span>Cổng Nhân Viên (Staff Login)</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ==========================================
          HERO SECTION: 2-COLUMN SPLIT WITH 3D DIORAMA
          ========================================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* --------------------------------------
              LEFT COLUMN (45% Width): CONTENT & CARDS
              -------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            {/* Tech Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500] text-xs font-bold w-fit shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SMART RESTAURANT TECHNOLOGY 2026</span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Smart Restaurant <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9500] via-amber-400 to-[#FF9500]">
                  POS & KDS
                </span>{' '}
                Platform
              </h1>

              <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                Hệ sinh thái nhà hàng thông minh thế hệ mới: Khách quét mã QR gọi món tại bàn, hệ
                thống tự động điều phối trạm bếp KDS theo thời gian thực và khấu trừ tồn kho nguyên
                liệu BOM chuẩn xác.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-300">
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#FF9500]" />
                Gọi món QR Bàn
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Điều phối trạm KDS
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#318BFF]" />
                Trừ kho BOM tự động
              </span>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* CARD 1: CUSTOMER ORDERING (ORANGE THEME) */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-500/25 shadow-xl shadow-amber-500/5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/50 transition-all">
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FF9500]/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#FF9500]/15 text-[#FF9500] border border-[#FF9500]/30">
                      Dành cho khách
                    </span>
                    <QrCode className="w-4 h-4 text-[#FF9500]" />
                  </div>

                  <h2 className="text-base font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                    Gọi món tại bàn (QR)
                  </h2>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Chọn nhanh bàn demo để trải nghiệm thực đơn, thêm topping và gửi order tới bếp.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {previewTables.map((table) => (
                      <Link
                        key={table.id}
                        href={`/table/${table.number}`}
                        className="flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-[11px] font-black text-amber-300 transition-all hover:bg-[#FF9500] hover:text-slate-950 hover:shadow-md hover:shadow-amber-500/25 active:scale-95"
                      >
                        {table.number}
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/table"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF9500] to-amber-500 hover:from-amber-400 hover:to-[#FF9500] text-slate-950 font-black text-xs shadow-lg shadow-[#FF9500]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Xem danh sách bàn</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* CARD 2: STAFF LOGIN (BLUE THEME) */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-blue-500/25 shadow-xl shadow-blue-500/5 flex flex-col justify-between relative overflow-hidden group hover:border-[#318BFF]/50 transition-all">
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#318BFF]/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#318BFF]/15 text-[#318BFF] border border-[#318BFF]/30">
                      Cổng nội bộ
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#318BFF]" />
                  </div>

                  <h2 className="text-base font-bold text-white mb-1.5 group-hover:text-blue-300 transition-colors">
                    Đăng nhập nhân viên
                  </h2>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Phân quyền bảo mật cao cho Thu Ngân POS, Bếp KDS và Quản Trị Kho BOM.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Role Pills */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="w-3 h-3 text-[#318BFF]" />
                        Thu Ngân
                      </span>
                      <span className="font-mono text-slate-500">/pos</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <ChefHat className="w-3 h-3 text-[#FF9500]" />
                        Bếp KDS
                      </span>
                      <span className="font-mono text-slate-500">/kds</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Warehouse className="w-3 h-3 text-emerald-400" />
                        Quản Trị Kho
                      </span>
                      <span className="font-mono text-slate-500">/admin</span>
                    </div>
                  </div>

                  <Link
                    href="/login"
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#318BFF]" />
                    <span>Đăng nhập hệ thống</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------
              RIGHT COLUMN (55% Width): 3D ISOMETRIC DIORAMA
              -------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
            {/* 3D Diorama Container */}
            <div className="w-full h-[480px] sm:h-[540px] lg:h-[620px] rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              {/* Outer decorative bezel glow */}
              <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none z-10" />

              {/* Real Interactive 3D Three.js Diorama */}
              <IsometricRestaurant3D
                tables={currentBranchTables}
                selectedBranchName={currentBranch?.name || 'Chi nhánh Flagship'}
                onSelectTable={handleSelectTableFrom3D}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* ==========================================
            SYSTEM HIGHLIGHTS FOOTER BAR
            ========================================== */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">QR Gọi Món An Toàn</p>
              <p className="text-[10px] text-slate-400">HMAC Table Token bảo mật</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#FF9500] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">KDS Tự Động Định Tuyến</p>
              <p className="text-[10px] text-slate-400">Bếp Nóng, Lạnh, Quầy Pha Chế</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#318BFF] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Định Lượng BOM</p>
              <p className="text-[10px] text-slate-400">Tự động trừ kho khi món xong</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Đa Chi Nhánh Đồng Bộ</p>
              <p className="text-[10px] text-slate-400">Cập nhật WebSocket tức thì</p>
            </div>
          </div>
        </div>
      </main>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="border-t border-slate-800/80 bg-[#050817] px-4 py-5 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <span>Smart Restaurant POS & KDS v2.0 • Nền tảng điều phối & quản lý nhà hàng thông minh</span>
        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <Link href="/table" className="hover:text-[#FF9500] transition-colors">
            Sơ đồ bàn
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-[#318BFF] transition-colors">
            Đăng nhập nhân viên
          </Link>
        </div>
      </footer>
    </div>
  );
}
