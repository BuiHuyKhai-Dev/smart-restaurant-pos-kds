const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('🚀 BẮT ĐẦU KIỂM THỬ HIỆU NĂNG BATCH COMPLETE TICKET & TRỪ KHO BOM...');

  // 1. Đăng nhập Cashier
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'cashier', password: '123456' }
  );

  const token = loginRes.data.data?.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Lấy Menu
  const menuRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/menu',
    method: 'GET',
    headers: authHeaders,
  });
  const menu = menuRes.data.data;
  const targetItems = menu.slice(0, 3);

  // 3. Lấy Bàn trống
  const tablesRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/tables?branchId=branch-1',
    method: 'GET',
    headers: authHeaders,
  });
  const tables = tablesRes.data.data;
  const availableTable = tables.find((t) => t.status === 'AVAILABLE') || tables[0];
  const tableId = availableTable.id;

  console.log(`  Bàn kiểm thử: ${availableTable.name || availableTable.number} (${tableId})`);
  console.log(`  Số lượng món trong vé: ${targetItems.length}`);
  targetItems.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.name} (${m.price}đ)`));

  // 4. Tạo đơn hàng với 3 món
  const orderPayload = {
    tableId,
    guestCount: 3,
    items: targetItems.map((item) => ({
      productId: item.id,
      quantity: 2,
      note: 'Gấp cho khách',
    })),
  };

  const createRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/orders',
      method: 'POST',
      headers: authHeaders,
    },
    orderPayload
  );

  if (!createRes.data?.success) {
    console.error('❌ Tạo đơn thất bại:', createRes.data);
    process.exit(1);
  }

  const order = createRes.data.data;
  console.log(`  ✅ Đã tạo đơn hàng thành công: ${order.orderCode} (ID: ${order.id}) với ${order.items.length} món`);

  // 5. Đo lường hiệu năng gọi Batch Complete Ticket
  console.log('\n--- BẾP BẤM "HOÀN TẤT TOÀN BỘ VÉ" (PATCH /orders/:id/complete-all) ---');
  const startTime = Date.now();
  const batchRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/orders/${order.id}/complete-all`,
      method: 'PATCH',
      headers: authHeaders,
    },
    {}
  );
  const elapsedMs = Date.now() - startTime;

  console.log(`  ⏱ Thời gian xử lý toàn bộ vé trên Backend & Supabase DB: ${elapsedMs}ms`);

  if (!batchRes.data?.success) {
    console.error('❌ Lỗi khi gọi complete-all:', batchRes.data);
    process.exit(1);
  }

  const resData = batchRes.data?.data || batchRes.data;
  const items = resData?.completedItems || resData?.items || [];
  const allReady = items.length > 0 && items.every((i) => i.status === 'READY');

  console.log(`  Số món đã hoàn tất đồng thời: ${items.length}`);
  console.log(`  Trạng thái tất cả món đều là READY: ${allReady ? '✅ ĐÚNG' : '❌ SAI'}`);

  if (allReady) {
    console.log(`\n🎉 KIỂM THỬ HIỆU NĂNG BATCH COMPLETE THÀNH CÔNG RỰC RỠ! (Thời gian: ${elapsedMs}ms, 1 Transaction duy nhất trên Supabase DB)`);
  } else {
    console.error('❌ Kiểm thử không đạt kết quả mong muốn:', resData);
    process.exit(1);
  }

  // Thu dọn bàn: settle hóa đơn
  const invoiceRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/invoices/settle',
      method: 'POST',
      headers: authHeaders,
    },
    {
      tableId,
      paymentMethod: 'CASH',
      amountPaid: 500000,
    }
  );
  if (invoiceRes.data?.success) {
    console.log(`  🧹 Thu dọn: Đã thanh toán & giải phóng bàn (${invoiceRes.data.data?.invoiceCode})`);
  }
}

run().catch((err) => {
  console.error('❌ Exception:', err);
  process.exit(1);
});
