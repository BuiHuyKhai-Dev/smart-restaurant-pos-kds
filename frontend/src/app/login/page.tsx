'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Building2,
  ShieldCheck,
  ArrowRight,
  Monitor,
  ChefHat,
  Warehouse,
  KeyRound,
  UtensilsCrossed,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Flame,
  Salad,
  Coffee,
  UserCheck,
} from 'lucide-react';
import { useCurrentAuth, DEMO_STAFF_ACCOUNTS } from '@/lib/auth-store';
import { useLiveStore } from '@/lib/live-store';
import { UserRole } from '@/lib/types';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const { session, isReady, login, logout } = useCurrentAuth();
  const { branches, currentBranchId, setBranch, currentBranch } = useLiveStore();

  const [email, setEmail] = useState('cashier@smartpos.vn');
  const [password, setPassword] = useState('123456');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Xử lý đăng nhập
  const doLogin = (role: UserRole, targetEmail: string) => {
    const acc = DEMO_STAFF_ACCOUNTS.find((a) => a.role === role);
    if (!acc) return;

    setIsLoggingIn(true);
    setErrorMsg('');

    const staffId = `${acc.role}-${targetEmail.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    login({
      id: staffId,
      name: acc.name,
      email: targetEmail,
      role: acc.role,
      branchId: currentBranchId,
      branchName: currentBranch.name,
    });

    // Luôn chuyển đến đúng targetRoute của vai trò được chọn
    router.push(acc.targetRoute);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const foundDemo = DEMO_STAFF_ACCOUNTS.find((acc) => acc.email === email);
    if (!foundDemo) {
      setErrorMsg('Email không khớp với tài khoản demo nào trong hệ thống.');
      return;
    }
    if (password !== foundDemo.password) {
      setErrorMsg('Mật khẩu không chính xác (Mật khẩu mặc định: 123456).');
      return;
    }
    doLogin(foundDemo.role, email);
  };

  const handleQuickLogin = (role: UserRole) => {
    const acc = DEMO_STAFF_ACCOUNTS.find((a) => a.role === role);
    if (!acc) return;
    doLogin(acc.role, acc.email);
  };

  const roleIcons = {
    cashier: Monitor,
    cook: ChefHat,
    admin: Warehouse,
  };

  const roleColors = {
    cashier: {
      icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      hover: 'hover:border-blue-500/60 hover:bg-blue-500/5',
      text: 'group-hover:text-blue-400',
      arrow: 'group-hover:text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    },
    cook: {
      icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      hover: 'hover:border-amber-500/60 hover:bg-amber-500/5',
      text: 'group-hover:text-amber-400',
      arrow: 'group-hover:text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    },
    admin: {
      icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      hover: 'hover:border-emerald-500/60 hover:bg-emerald-500/5',
      text: 'group-hover:text-emerald-400',
      arrow: 'group-hover:text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-blue-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-gradient-to-tl from-emerald-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between z-10 px-6 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <UtensilsCrossed className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-black text-sm text-white tracking-tight">
              Smart <span className="text-amber-400">Restaurant</span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium">Hệ Thống Phân Quyền Vận Hành</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cổng Nội Bộ Nhân Viên</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8 z-10 px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3.5 shadow-xl shadow-amber-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Cổng Đăng Nhập Nội Bộ
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Chọn hoặc nhập tài khoản phân quyền RBAC: Thu Ngân, Bếp hoặc Quản Trị
          </p>
        </div>

        {/* Thông báo nếu bị từ chối truy cập */}
        {errorParam === 'forbidden' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Tài khoản hiện tại không có quyền vào khu vực đó. Vui lòng chọn đúng vai trò tương ứng bên dưới.</span>
          </div>
        )}

        {/* Banner nếu đang có phiên đăng nhập */}
        {isReady && session && (
          <div className="mb-4 p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] text-slate-400 font-medium">Đang đăng nhập:</p>
                <p className="font-bold text-white truncate">{session.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = session.role === 'cook' ? '/kds' : session.role === 'admin' ? '/admin' : '/pos';
                  router.push(target);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Vào Làm Việc
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
                title="Đăng xuất phiên hiện tại"
              >
                Thoát
              </button>
            </div>
          </div>
        )}

        {/* Card chính */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl">
          {/* Branch Selector */}
          <div className="mb-5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Chi Nhánh Làm Việc:</span>
            </label>
            <select
              value={currentBranchId}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-amber-500/60 cursor-pointer transition-colors"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Role Login (1-Click) */}
          <div className="mb-5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Đăng Nhập Nhanh Theo Vai Trò (1-Click):
            </label>
            <div className="space-y-2.5">
              {DEMO_STAFF_ACCOUNTS.map((acc) => {
                const Icon = roleIcons[acc.role as keyof typeof roleIcons] || Monitor;
                const colors = roleColors[acc.role as keyof typeof roleColors];
                const routeBadge: Record<string, string> = {
                  cashier: '/pos',
                  cook: '/kds',
                  admin: '/admin',
                };

                return (
                  <button
                    key={acc.role}
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleQuickLogin(acc.role as UserRole)}
                    className={`w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 ${colors.hover} flex items-center justify-between transition-all group cursor-pointer text-left disabled:opacity-60`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${colors.icon}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <strong className={`text-xs text-white block transition-colors ${colors.text}`}>
                          {acc.roleTitle}
                        </strong>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {acc.description}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${colors.badge}`}>
                        {routeBadge[acc.role]}
                      </span>
                      <ArrowRight className={`w-4 h-4 text-slate-600 ${colors.arrow} group-hover:translate-x-0.5 transition-all`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-bold tracking-wider">hoặc nhập tài khoản</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleFormLogin} className="space-y-3.5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Email Đăng Nhập
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cashier@smartpos.vn"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Mật Khẩu <span className="text-slate-600 normal-case font-normal">(demo: 123456)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full p-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 active:scale-[0.98]"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Vào Hệ Thống</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badges */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>RBAC Bảo Mật</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Phiên Làm Việc Riêng</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Đa Chi Nhánh</span>
          </div>
        </div>

        {/* Kitchen stations info */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Trạm Bếp KDS Tự Động Định Tuyến</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Bếp Nóng', icon: <Flame className="w-3 h-3" />, color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
              { label: 'Bếp Lạnh', icon: <Salad className="w-3 h-3" />, color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
              { label: 'Pha Chế', icon: <Coffee className="w-3 h-3" />, color: 'text-sky-400 bg-sky-500/10 border border-sky-500/20' },
            ].map((s) => (
              <span key={s.label} className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg ${s.color}`}>
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[10px] text-slate-700 z-10 pb-6">
        Smart Restaurant POS & KDS v2.0 • Hệ Thống Quản Lý Nhà Hàng & Điều Phối Bếp Thông Minh
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
