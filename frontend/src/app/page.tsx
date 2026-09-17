'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';

export default function LuxuryRestaurantPortal() {
  const { currentBranchTables, currentBranch } = useLiveStore();
  const previewTables = currentBranchTables.slice(0, 6);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-black text-base text-white tracking-tight">
                Smart <span className="text-amber-400">POS & KDS</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Hệ thống F&B Thông Minh</p>
            </div>
          </div>

          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Cổng Nhân Viên (Staff Login)</span>
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ thống nhà hàng thông minh</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight sm:leading-none mb-4">
            Smart Restaurant POS & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
              KDS Platform
            </span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Từ đây bạn có thể truy cập trực tiếp vào trải nghiệm gọi món của khách hàng hoặc vào cổng quản lý nhân sự theo vai trò.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10">
                <ArrowRight className="w-6 h-6" />
              </div>

              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Dành cho khách
              </span>

              <h2 className="text-xl font-bold text-white mt-3 mb-2">
                Gọi món trực tiếp tại bàn
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Mở màn hình đặt món của bàn demo để kiểm tra trải nghiệm gọi món và theo dõi đơn hàng nhanh chóng.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {previewTables.map((table) => (
                  <Link
                    key={table.id}
                    href={`/table/${table.number}`}
                    className="flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-[11px] font-black text-amber-300 transition-colors hover:bg-amber-500/20"
                  >
                    {table.number}
                  </Link>
                ))}
              </div>

              <Link
                href="/table"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Chọn bàn khách {currentBranch?.name || 'demo'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10">
                <Lock className="w-6 h-6" />
              </div>

              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Bảo mật nội bộ
              </span>

              <h2 className="text-xl font-bold text-white mt-3 mb-2">
                Cổng đăng nhập nhân viên & quản trị
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Quyền truy cập cho Thu Ngân, Bếp và Quản Lý theo vai trò với bảo mật phân quyền rõ ràng.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Đăng Nhập Phân Quyền Làm Việc</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        Smart Restaurant POS & KDS • Hệ thống quản lý nhà hàng thông minh
      </footer>
    </div>
  );
}
