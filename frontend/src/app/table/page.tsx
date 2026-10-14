'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPinned, QrCode } from 'lucide-react';
import { useLiveStore } from '@/lib/live-store';
import { TableQRModal } from '@/components/table-qr-modal';

export default function TableDirectoryPage() {
  const { currentBranch, currentBranchTables } = useLiveStore();
  const [selectedQrTable, setSelectedQrTable] = useState<{
    id: string;
    number: string;
    displayName?: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                <QrCode className="h-3.5 w-3.5" />
                Chọn bàn khách
              </div>
              <h1 className="text-2xl font-black text-white">Danh sách bàn {currentBranch?.name || 'demo'}</h1>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
            >
              Về trang chủ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {currentBranchTables.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
              Chưa có bàn nào trong chi nhánh này.
            </div>
          ) : (
            currentBranchTables.map((table) => (
              <div
                key={table.id}
                className="group rounded-3xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-amber-500/40 hover:bg-slate-900/80 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/25">
                      {table.number}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedQrTable({
                            id: table.id,
                            number: table.number,
                            displayName: table.displayName,
                          });
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/30 transition-colors"
                        title="Xem mã QR để quét bằng điện thoại"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
                        {table.area}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                    <MapPinned className="h-4 w-4 text-amber-400" />
                    {table.displayName || `Bàn ${table.number}`}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>Sức chứa: {table.capacity} người</span>
                    <span
                      className={`rounded-full px-2 py-1 font-bold ${
                        table.status === 'available'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : table.status === 'occupied'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {table.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() =>
                      setSelectedQrTable({
                        id: table.id,
                        number: table.number,
                        displayName: table.displayName,
                      })
                    }
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Mã QR</span>
                  </button>
                  <Link
                    href={`/table/${table.number}`}
                    className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Vào bàn</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {selectedQrTable && (
        <TableQRModal
          isOpen={!!selectedQrTable}
          onClose={() => setSelectedQrTable(null)}
          tableId={selectedQrTable.id}
          tableNumber={selectedQrTable.number}
          tableName={selectedQrTable.displayName}
        />
      )}
    </div>
  );
}
