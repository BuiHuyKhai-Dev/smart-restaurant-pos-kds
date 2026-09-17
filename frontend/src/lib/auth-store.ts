'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { UserRole } from './types';

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchName: string;
}

export const DEMO_STAFF_ACCOUNTS: Array<{
  email: string;
  password: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  description: string;
  targetRoute: string;
  color: string;
  accentColor: string;
}> = [
  {
    email: 'cashier@smartpos.vn',
    password: '123456',
    name: 'Trần Thị Thu (Thu Ngân)',
    role: 'cashier',
    roleTitle: 'Thu Ngân & Bán Hàng',
    description: 'Quản lý sơ đồ bàn, gộp/tách bàn, in tạm tính và thanh toán',
    targetRoute: '/pos',
    color: 'from-blue-600 to-indigo-600',
    accentColor: 'blue',
  },
  {
    email: 'kitchen@smartpos.vn',
    password: '123456',
    name: 'Đội Ngũ Bếp Trung Tâm',
    role: 'cook',
    roleTitle: 'Khu Vực Bếp (KDS)',
    description: 'Tiếp nhận order realtime, hệ thống tự chia trạm bếp và cảnh báo trễ',
    targetRoute: '/kds',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'amber',
  },
  {
    email: 'admin@smartpos.vn',
    password: '123456',
    name: 'Nguyễn Văn Minh (Quản Lý)',
    role: 'admin',
    roleTitle: 'Quản Trị & Kho BOM',
    description: 'Quản lý định lượng nguyên liệu BOM, trừ kho tự động và báo cáo chuỗi',
    targetRoute: '/admin',
    color: 'from-emerald-600 to-teal-600',
    accentColor: 'emerald',
  },
];

interface AuthState {
  session: StaffSession | null;
  hasHydrated: boolean;
  login: (staffData: StaffSession) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

const AUTH_STORAGE_KEY = 'pos_kds_staff_session_v3';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      hasHydrated: false,
      login: (staffData: StaffSession) => {
        set({ session: staffData, hasHydrated: true });
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {
            // ignore
          }
        }
      },
      logout: () => {
        set({ session: null, hasHydrated: true });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {
            // ignore
          }
        }
      },
      setHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

/**
 * Hook an toàn cho Client Components trong Next.js:
 * Chỉ đánh dấu isReady khi client đã mount và state đã rehydrate từ localStorage,
 * giúp phân quyền đăng nhập Thu Ngân / Bếp / Admin hoạt động ổn định.
 */
export function useCurrentAuth() {
  const store = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return {
    session: store.session,
    isAuthenticated: !!store.session,
    isReady: isReady && store.hasHydrated,
    login: store.login,
    logout: store.logout,
  };
}
