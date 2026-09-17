'use client';

import { X, Layers, ShieldAlert } from 'lucide-react';
import { MenuItem, Ingredient, STATIONS } from '@/lib/types';

interface BOMDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
  ingredients: Ingredient[];
}

export function BOMDetailModal({
  isOpen,
  onClose,
  menuItem,
  ingredients,
}: BOMDetailModalProps) {
  if (!isOpen || !menuItem) return null;

  const stationInfo = STATIONS[menuItem.station];

  // Tính chi phí vốn ước tính dựa trên BOM (COGS)
  const totalCost = menuItem.bom.reduce((sum, item) => {
    const ing = ingredients.find((i) => i.id === item.ingredientId);
    if (!ing) return sum;
    return sum + item.quantity * ing.costPrice;
  }, 0);

  // Tính số suất tối đa có thể làm dựa trên tồn kho nguyên liệu hiện tại
  const maxPortions = Math.min(
    ...menuItem.bom.map((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (!ing || item.quantity <= 0) return 0;
      return Math.floor(ing.stock / item.quantity);
    })
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {menuItem.name}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                {stationInfo.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Công thức định lượng nguyên vật liệu (BOM - Bill of Materials)
            </p>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Giá bán</span>
            <strong className="text-sm text-slate-900 dark:text-white">
              {menuItem.price.toLocaleString('vi-VN')} đ
            </strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Chi phí vốn (COGS)</span>
            <strong className="text-sm text-emerald-600 dark:text-emerald-400">
              {Math.round(totalCost).toLocaleString('vi-VN')} đ
            </strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Khả năng phục vụ</span>
            <strong className={`text-sm ${maxPortions <= 5 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-900 dark:text-white'}`}>
              ~{maxPortions} suất
            </strong>
          </div>
        </div>

        {/* Danh sách định lượng chi tiết */}
        <div className="flex-1 overflow-y-auto pr-1 mb-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Thành phần cấu thành (Định lượng cho 1 suất)
          </h4>

          {menuItem.bom.map((bomItem) => {
            const ing = ingredients.find((i) => i.id === bomItem.ingredientId);
            if (!ing) return null;

            const isLowStock = ing.stock <= ing.minThreshold;
            const portionsLeft = Math.floor(ing.stock / bomItem.quantity);

            return (
              <div
                key={bomItem.ingredientId}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <span>{ing.name}</span>
                    {isLowStock && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30">
                        Sắp hết
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tồn kho: <strong className="text-slate-700 dark:text-slate-300">{ing.stock.toLocaleString('vi-VN')} {ing.unit}</strong> (Làm được ~{portionsLeft} suất)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                    {bomItem.quantity} {ing.unit}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ~{(bomItem.quantity * ing.costPrice).toLocaleString('vi-VN')} đ vốn
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Khi Bếp KDS bấm &quot;Hoàn thành&quot;, số lượng trên sẽ được tự động trừ trực tiếp khỏi cơ sở dữ liệu kho.</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors"
        >
          Đóng cửa sổ
        </button>
      </div>
    </div>
  );
}
