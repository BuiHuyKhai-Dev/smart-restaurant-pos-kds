'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { QrCode, X, Copy, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: string;
  tableName?: string;
}

export function TableQRModal({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  tableName,
}: TableQRModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchQrToken = async (rotate = false) => {
    setIsLoading(true);
    try {
      // 1. Thử gọi Backend để cấp mã QR có chữ ký số HMAC bảo mật
      const res = await apiClient.post<any>(`/tables/${tableId}/qr`, { rotate });
      if (res.success && res.data?.url) {
        setQrUrl(res.data.url);
        setIsLoading(false);
        return;
      }
    } catch {
      // 2. Fallback: Nếu offline/chưa bật backend, tạo URL trực tiếp của bàn
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    setQrUrl(`${origin}/table/${tableNumber}`);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && tableId) {
      fetchQrToken(false);
    }
  }, [isOpen, tableId]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1 rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">Mã QR Gọi Món Tại Bàn</h3>
          <p className="text-xs text-slate-400 mt-1">
            {tableName || `Bàn ${tableNumber}`} • Quét camera để đặt món tức thì
          </p>
        </div>

        {/* Khung hiển thị QR Code */}
        <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner mb-4 relative min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold text-slate-600">Đang tạo mã QR...</span>
            </div>
          ) : qrUrl ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <QRCode
                size={200}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                value={qrUrl}
                viewBox="0 0 256 256"
              />
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                SMART RESTAURANT • {tableNumber}
              </span>
            </div>
          ) : null}
        </div>

        {/* Thông tin URL & Actions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
            <span className="truncate flex-1 font-mono text-[10px] text-amber-300/80">
              {qrUrl || 'Đang tải...'}
            </span>
            <button
              onClick={copyToClipboard}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 transition-colors shrink-0"
              title="Sao chép liên kết"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[10px]">Sao chép</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => fetchQrToken(true)}
              disabled={isLoading}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đổi mã mới</span>
            </button>

            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở trang khách</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

