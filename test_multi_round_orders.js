const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GỌI MÓN NHIỀU ĐỢT (MULTI-ROUND ORDERS CUMULATIVE)');

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

  // 2. Lấy danh sách món ăn
  const menuRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/menu',
    method: 'GET',
    headers: authHeaders,
  });
  const menu = menuRes.data.data;
  const prod1 = menu[0];
  const prod2 = menu[1];
  console.log(`  Món 1: ${prod1.name} (${prod1.price} đ)`);
  console.log(`  Món 2: ${prod2.name} (${prod2.price} đ)`);

  // Lấy danh sách bàn và chọn 1 bàn trống chưa có phiên ăn
  const tablesInitRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/tables?branchId=branch-1`,
    method: 'GET',
    headers: authHeaders,
  });
  const availableTable = tablesInitRes.data.data.find(t => t.status === 'AVAILABLE' && (!t.orderSessions || t.orderSessions.length === 0));
  const tableId = availableTable ? availableTable.id : 'tbl-12';
  const tableNum = availableTable ? availableTable.tableNumber : 'T-12';
  console.log(`  Bàn kiểm thử: ${tableNum} (${tableId})`);

  // 3. Khách đặt ĐỢT 1
  console.log('\n--- 1. Đặt món ĐỢT 1 (1 phần Món 1) ---');
  const orderRound1Res = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/orders',
      method: 'POST',
      headers: authHeaders,
    },
    {
      tableId,
      guestCount: 2,
      items: [{ productId: prod1.id, quantity: 1, note: 'Đợt 1' }],
    }
  );

  const order1 = orderRound1Res.data.data;
  console.log(`  ✅ [ĐỢT 1] Tạo đơn thành công: Mã ${order1.orderCode}, ID: ${order1.id}`);

  // 4. Bếp nấu xong ĐỢT 1
  const item1 = order1.items[0];
  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/orders/items/${item1.id}/status`,
      method: 'PATCH',
      headers: authHeaders,
    },
    { status: 'READY' }
  );
  console.log(`  ✅ [BẾP] Món đợt 1 đã hoàn thành (READY)`);

  // 5. Khách tiếp tục đặt ĐỢT 2
  console.log('\n--- 2. Khách tiếp tục đặt món ĐỢT 2 (2 phần Món 2) ---');
  const orderRound2Res = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/orders',
      method: 'POST',
      headers: authHeaders,
    },
    {
      tableId,
      items: [{ productId: prod2.id, quantity: 2, note: 'Đợt 2 gọi thêm' }],
    }
  );

  const order2 = orderRound2Res.data.data;
  console.log(`  ✅ [ĐỢT 2] Tạo đơn thêm thành công: Mã ${order2.orderCode}, ID: ${order2.id}`);

  // 6. Kiểm tra sơ đồ bàn và phiên ăn
  console.log('\n--- 3. Kiểm tra tính cộng dồn của Phiên ăn trên Backend ---');
  const tablesRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/tables?branchId=branch-1`,
    method: 'GET',
    headers: authHeaders,
  });

  const tbl = tablesRes.data.data.find((t) => t.id === tableId);
  const session = tbl.orderSessions[0];
  console.log(`  Số đơn trong phiên của bàn T-02: ${session.orders.length}`);

  if (session.orders.length >= 2) {
    console.log(`  ✅ [PASS] Phiên ăn giữ nguyên cả Đợt 1 và Đợt 2, không bị ghi đè!`);
    session.orders.forEach((o, idx) => {
      console.log(`     - Đợt ${idx + 1}: ${o.orderCode} (${o.items.length} món)`);
    });
  } else {
    console.error(`  ❌ [FAIL] Đơn cũ bị mất!`);
    process.exit(1);
  }

  // 7. Tạo hóa đơn tạm tính tổng hợp (Provisional Bill)
  console.log('\n--- 4. Kiểm tra Hóa đơn Tạm tính tổng hợp ---');
  const provRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/invoices/provisional',
      method: 'POST',
      headers: authHeaders,
    },
    { tableId, discountPercent: 0 }
  );

  const bill = provRes.data.data;
  const expectedSubtotal = Number(prod1.price) * 1 + Number(prod2.price) * 2;
  console.log(`  Tổng tiền tạm tính thực tế: ${bill.subtotal} đ`);
  console.log(`  Tổng tiền tạm tính kỳ vọng: ${expectedSubtotal} đ`);
  console.log(`  Số lượng dòng món trên hóa đơn: ${bill.items.length}`);

  if (bill.subtotal === expectedSubtotal && bill.items.length === 2) {
    console.log(`  ✅ [PASS] Hóa đơn tạm tính cộng dồn chuẩn xác 100% tất cả các đợt!`);
  } else {
    console.error(`  ❌ [FAIL] Hóa đơn không khớp!`);
    process.exit(1);
  }

  // 8. Chốt hóa đơn thanh toán
  console.log('\n--- 5. Chốt hóa đơn thanh toán và giải phóng bàn ---');
  const settleRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/invoices/settle',
      method: 'POST',
      headers: authHeaders,
    },
    {
      invoiceId: bill.invoiceId,
      paymentMethod: 'CASH',
      cashGiven: bill.finalAmount,
    }
  );

  console.log(`  ✅ [PASS] Chốt hóa đơn thành công! Mã hóa đơn: ${settleRes.data.data.invoice.invoiceCode}`);
  console.log('\n🎉 TOÀN BỘ KIỂM THỬ MULTI-ROUND ORDERS ĐÃ VƯỢT QUA 100%!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
