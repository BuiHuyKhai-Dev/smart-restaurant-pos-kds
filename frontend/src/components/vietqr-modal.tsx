'use client';

import { QrCode, CheckCircle2, X, Copy, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface VietQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: () => void;
  amount: number;
  orderCode: string;
  tableNumber: string;
}

export function VietQRModal({
  isOpen,
  onClose,
  onConfirmPayment,
  amount,
  orderCode,
  tableNumber,
}: VietQRModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bankName = 'MB Bank (Ngân hàng Quân Đội)';
  const accountNumber = '098877665544';
  const accountHolder = 'NHA HANG SMART POS KDS';
  const transferContent = `THANHTOAN ${orderCode} ${tableNumber}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-2">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thanh Toán Chuyển Khoản VietQR</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quét mã để thanh toán tự động - Bàn {tableNumber}
          </p>
        </div>

        {/* Khung Mã QR mô phỏng chuẩn VietQR */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center mb-4">
          <div className="relative bg-white p-3 rounded-lg shadow-inner border border-slate-100 flex flex-col items-center">
            {/* Header VietQR & Napas */}
            <div className="w-full flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 mb-2">
              <span className="text-[11px] font-black text-blue-700 tracking-tighter">VietQR</span>
              <span className="text-[10px] font-extrabold text-red-600">napas 247</span>
            </div>

            {/* Simulated QR Code Graphic */}
            <div className="w-48 h-48 bg-slate-900 rounded-md p-2 flex flex-col justify-between items-center relative overflow-hidden">
              <div className="w-full flex justify-between">
                <div className="w-12 h-12 border-4 border-white bg-slate-900 flex items-center justify-center">
                  <div className="w-5 h-5 bg-white" />
                </div>
                <div className="w-12 h-12 border-4 border-white bg-slate-900 flex items-center justify-center">
                  <div className="w-5 h-5 bg-white" />
                </div>
              </div>
              
              {/* Pattern center */}
              <div className="text-[10px] text-amber-400 font-mono text-center tracking-widest leading-tight">
                ■ ■ ■ ■ ■ ■<br/>
                ■ SMART ■ POS ■<br/>
                ■ ■ {orderCode} ■ ■<br/>
                ■ ■ ■ ■ ■ ■
              </div>

              <div className="w-full flex justify-between items-end">
                <div className="w-12 h-12 border-4 border-white bg-slate-900 flex items-center justify-center">
                  <div className="w-5 h-5 bg-white" />
                </div>
                <div className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded">
                  MB BANK
                </div>
              </div>
            </div>

            <p className="text-[11px] font-bold text-slate-700 mt-2">
              Số tiền: <span className="text-emerald-600 font-black text-sm">{amount.toLocaleString('vi-VN')} đ</span>
            </p>
          </div>

          <div className="w-full mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Ngân hàng:</span>
              <span className="font-semibold">{bankName}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Số tài khoản:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{accountNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Chủ tài khoản:</span>
              <span className="font-semibold">{accountHolder}</span>
            </div>
            <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded text-amber-800 dark:text-amber-300">
              <span>Nội dung:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold">{transferContent}</span>
                <button
                  onClick={() => copyToClipboard(transferContent)}
                  className="hover:text-amber-950 dark:hover:text-white"
                  title="Sao chép nội dung"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {copied && <p className="text-[10px] text-emerald-600 text-right">Đã sao chép nội dung!</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-4 justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Hệ thống tự động lắng nghe tín hiệu biến động số dư</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onConfirmPayment();
              onClose();
            }}
            className="flex-1 px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Xác Nhận Đã Nhận
          </button>
        </div>
      </div>
    </div>
  );
}
