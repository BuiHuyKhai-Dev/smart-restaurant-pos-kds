'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface UrgencyTimerProps {
  orderedAt: string; // ISO string
  standardPrepMinutes?: number; // Mặc định 10 phút
  showWarningLabel?: boolean;
  isCompleted?: boolean; // Khi đã hoàn thành món / vé
  completedAt?: string; // Thời điểm hoàn thành thực tế (ISO string)
}

export function UrgencyTimer({
  orderedAt,
  standardPrepMinutes = 10,
  showWarningLabel = true,
  isCompleted = false,
  completedAt,
}: UrgencyTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (isCompleted) return;

    const calculateElapsed = () => {
      const orderTime = new Date(orderedAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - orderTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [orderedAt, isCompleted]);

  // Nếu món/vé đã hoàn thành: dừng đếm, hiển thị thời gian hoàn thành thực tế
  if (isCompleted) {
    const startTime = new Date(orderedAt).getTime();
    const finishTime = completedAt ? new Date(completedAt).getTime() : null;
    const totalSec = finishTime ? Math.max(0, Math.floor((finishTime - startTime) / 1000)) : 0;
    const totalMin = Math.floor(totalSec / 60);
    const remSec = totalSec % 60;
    const durationText = totalMin > 0 ? `${totalMin}p ${remSec > 0 ? `${remSec}s` : ''}` : `${remSec}s`;
    const finishClock = completedAt
      ? new Date(completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : null;

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>ĐÃ HOÀN THÀNH</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md">
          ⏱ Thực tế: {finishTime ? `${durationText} ${finishClock ? `(${finishClock})` : ''}` : '—'}
        </span>
      </div>
    );
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const remainingSeconds = elapsedSeconds % 60;
  const formattedTime = `${String(elapsedMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  const isLate = elapsedMinutes >= standardPrepMinutes;
  const isWarning = elapsedMinutes >= Math.floor(standardPrepMinutes * 0.7) && !isLate;

  if (isLate) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-bold animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>⏱ {formattedTime}</span>
        {showWarningLabel && (
          <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold ml-1">
            MÓN ĐANG TRỄ
          </span>
        )}
      </div>
    );
  }

  if (isWarning) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>⏱ {formattedTime}</span>
        <span className="text-[10px] opacity-80">(Sắp chạm hạn)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60">
      <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      <span>⏱ {formattedTime}</span>
    </div>
  );
}
