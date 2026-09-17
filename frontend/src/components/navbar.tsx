'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UtensilsCrossed,
  ChefHat,
  Monitor,
  Warehouse,
  QrCode,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';

export function Navbar() {
  const pathname = usePathname();
  const {
    branches,
    currentBranchId,
    currentBranchTables,
    setBranch,
    activeOrdersCount,
    lowStockCount,
  } = useLiveStore();

  const navLinks = [
    {
      href: '/',
      label: 'Demo Hub',
      icon: Sparkles,
      badge: null,
    },
    {
      href: '/table',
      label: 'Khách Gọi QR',
      icon: QrCode,
      badge: `${currentBranchTables.length} bàn`,
    },
    {
      href: '/kds',
      label: 'Màn Hình Bếp KDS',
      icon: ChefHat,
      badge: activeOrdersCount > 0 ? `${activeOrdersCount} đơn` : null,
      badgeColor: 'bg-amber-500',
    },
    {
      href: '/pos',
      label: 'Thu Ngân POS',
      icon: Monitor,
      badge: null,
    },
    {
      href: '/admin',
      label: 'Kho BOM & Quản Trị',
      icon: Warehouse,
      badge: lowStockCount > 0 ? `${lowStockCount} báo động` : null,
      badgeColor: 'bg-rose-500',
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 lg:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black tracking-tight text-lg text-white">
                <span>Smart</span>
                <span className="text-amber-400">POS & KDS</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Hệ thống điều phối F&B thời gian thực
              </p>
            </div>
          </Link>

          {/* ĐIỂM MỚI 5: Multi-Branch Selector (Quản lý Đa Chi Nhánh) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">Chi nhánh:</span>
            <select
              value={currentBranchId}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer pr-2"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive
                        ? 'bg-slate-950 text-amber-400'
                        : `${link.badgeColor || 'bg-slate-700'} text-white`
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
