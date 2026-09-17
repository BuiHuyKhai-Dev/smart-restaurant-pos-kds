'use client';

import { Printer, X } from 'lucide-react';
import { Order, Branch } from '@/lib/types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  branch: Branch;
  isProvisional?: boolean; // Tạm tính hay hóa đơn chính thức
}

export function ReceiptModal({
  isOpen,
  onClose,
  order,
  branch,
  isProvisional = false,
}: ReceiptModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto pr-1 flex-1 font-mono text-xs">
          {/* Thermal Receipt Body */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              SMART RESTAURANT POS
            </h2>
            <p className="text-[11px] font-bold text-slate-700">{branch.name}</p>
            <p className="text-[10px] text-slate-500">{branch.address}</p>
            <p className="text-[10px] text-slate-500">Hotline: {branch.phone}</p>

            <div className="mt-2 text-sm font-extrabold uppercase bg-slate-100 py-1 rounded">
              {isProvisional ? '--- PHIẾU TẠM TÍNH ---' : '--- HÓA ĐƠN BÁN HÀNG ---'}
            </div>
          </div>

          <div className="space-y-1 text-[11px] mb-3 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>Bàn: <strong className="text-sm">{order.tableNumber}</strong></span>
              <span>Số khách: {order.guestCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Mã đơn: <strong>{order.orderCode}</strong></span>
              <span>Thu ngân: Thu_Ngan_01</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Thời gian vào:</span>
              <span>{new Date(order.createdAt).toLocaleTimeString('vi-VN')} {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          {/* Danh sách món */}
          <table className="w-full text-left mb-3">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] text-slate-500 uppercase">
                <th className="pb-1">Món ăn</th>
                <th className="pb-1 text-center">SL</th>
                <th className="pb-1 text-right">Đ.Giá</th>
                <th className="pb-1 text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id} className="text-[11px]">
                  <td className="py-1.5 pr-1">
                    <div className="font-bold text-slate-800">{item.name}</div>
                    {item.selectedSize && <div className="text-[9px] text-slate-500">{item.selectedSize}</div>}
                    {item.selectedToppings && item.selectedToppings.length > 0 && (
                      <div className="text-[9px] text-slate-500">+{item.selectedToppings.join(', ')}</div>
                    )}
                    {item.note && <div className="text-[9px] text-amber-700 italic">*{item.note}</div>}
                  </td>
                  <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                  <td className="py-1.5 text-right text-slate-600">{item.price.toLocaleString('vi-VN')}</td>
                  <td className="py-1.5 text-right font-bold text-slate-900">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Phần cộng dồn & Thuế */}
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span>Cộng tiền món:</span>
              <span>{order.subtotal.toLocaleString('vi-VN')} đ</span>
            </div>
            {order.discountPercent > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Chiết khấu ({order.discountPercent}%):</span>
                <span>-{order.discountAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Thuế GTGT (VAT 8%):</span>
              <span>+{order.taxAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between text-base font-black border-t-2 border-slate-900 pt-1.5 mt-1 text-slate-950">
              <span>TỔNG CỘNG:</span>
              <span>{order.finalAmount.toLocaleString('vi-VN')} đ</span>
            </div>

            {order.paymentMethod && (
              <div className="text-[10px] text-slate-500 pt-1">
                Phương thức: <span className="font-bold uppercase text-slate-700">{order.paymentMethod}</span>
              </div>
            )}
          </div>

          <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-4 text-[10px] text-slate-500 space-y-1">
            <p className="font-semibold">Wifi: SmartRestaurant_5G | Pass: 88888888</p>
            <p>Xin cảm ơn Quý Khách - Hẹn Gặp Lại!</p>
            <p className="text-[9px] text-slate-400">Hệ thống Smart Restaurant POS & KDS v1.0</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
          <button
            onClick={() => {
              window.print();
            }}
            className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            In Hóa Đơn
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
